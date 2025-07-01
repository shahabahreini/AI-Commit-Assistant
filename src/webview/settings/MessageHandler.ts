// src/webview/settings/MessageHandler.ts
import * as vscode from "vscode";
import { SettingsManager } from "./SettingsManager";
import { SettingsWebview } from "./SettingsWebview";
import { ExtensionSettings } from "../../models/ExtensionSettings";
import { getOllamaModels } from "../../services/api/ollama";
import { debugLog } from "../../services/debug/logger";
import { SecureKeyManager } from "../../services/encryption/SecureKeyManager";

export class MessageHandler {
    private _settingsManager: SettingsManager;

    constructor(settingsManager: SettingsManager) {
        this._settingsManager = settingsManager;
    }

    public async handleMessage(message: any): Promise<void> {
        switch (message.command) {
            case "saveSettings":
                try {
                    await SettingsManager.saveSettings(message.settings);
                    // Send confirmation back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'settingsSaved'
                        });
                    }
                } catch (error) {
                    // Send error message back to webview if save fails
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'settingsSaveError',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    throw error;
                }
                break;
            case "executeCommand":
                await vscode.commands.executeCommand(message.commandId);
                break;
            case 'updateSetting':
                try {
                    const config = vscode.workspace.getConfiguration('aiCommitAssistant');
                    const oldValue = config.get(message.key);

                    // Update the setting and wait for it to complete
                    await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);

                    // Give VS Code a moment to fully process the configuration change
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // Handle license key changes - trigger automatic migration
                    if (message.key === 'pro.licenseKey') {
                        const oldLicenseKey = oldValue as string || '';
                        const newLicenseKey = message.value as string || '';

                        const wasProUser = !!(oldLicenseKey && oldLicenseKey.length > 0);
                        const isNowProUser = !!(newLicenseKey && newLicenseKey.length > 0);

                        if (wasProUser !== isNowProUser) {
                            debugLog(`User status changed: ${wasProUser ? 'Pro' : 'Free'} -> ${isNowProUser ? 'Pro' : 'Free'}`);

                            // Automatically handle key migration based on new status
                            const secureKeyManager = SecureKeyManager.getInstance();
                            const migrationResult = await secureKeyManager.handleUserStatusChange();

                            if (migrationResult.success) {
                                debugLog('Automatic key migration completed:', migrationResult.message);

                                // Optionally notify the webview of the automatic migration
                                if (SettingsWebview.isWebviewOpen()) {
                                    SettingsWebview.postMessageToWebview({
                                        command: 'migrationResult',
                                        success: true,
                                        message: `🔄 ${migrationResult.message}`,
                                        details: migrationResult.details,
                                        automatic: true,
                                        persistent: true
                                    });
                                }
                            } else {
                                debugLog('Automatic key migration failed:', migrationResult.message);
                            }
                        }
                    }

                    // Provide immediate feedback
                    // vscode.window.showInformationMessage(`Setting updated: ${message.key} = ${message.value}`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to update setting: ${error}`);
                }
                break;

            case 'loadOllamaModels':
                try {
                    debugLog("Loading Ollama models", { baseUrl: message.baseUrl });
                    const models = await getOllamaModels(message.baseUrl);

                    // Send models back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'ollamaModelsLoaded',
                            success: true,
                            models: models
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    debugLog("Failed to load Ollama models", { error: errorMessage });

                    // Send error back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'ollamaModelsLoaded',
                            success: false,
                            error: errorMessage
                        });
                    }
                }
                break;

            case 'migrateToSecure':
                try {
                    const secureKeyManager = SecureKeyManager.getInstance();
                    const result = await secureKeyManager.migrateToSecureStorage();

                    // Send success message back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'migrationResult',
                            success: result.success,
                            message: result.message,
                            details: result.details,
                            persistent: true
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugLog("Failed to migrate to secure storage:", errorMessage);

                    // Send error back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'migrationResult',
                            success: false,
                            error: errorMessage,
                            persistent: true
                        });
                    }
                }
                break;

            case 'checkEncryptionStatus':
                try {
                    const secureKeyManager = SecureKeyManager.getInstance();
                    const status = secureKeyManager.getEncryptionStatus();
                    const providersWithKeys = await secureKeyManager.getProvidersWithKeys();

                    // Send status back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'encryptionStatus',
                            status: status,
                            providersWithKeys: providersWithKeys,
                            persistent: true
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    debugLog("Failed to check encryption status:", errorMessage);

                    // Send error back to webview
                    if (SettingsWebview.isWebviewOpen()) {
                        SettingsWebview.postMessageToWebview({
                            command: 'encryptionStatus',
                            error: errorMessage,
                            persistent: true
                        });
                    }
                }
                break;
        }
    }
}
