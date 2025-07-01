// src/webview/settings/SettingsManager.ts
import * as vscode from "vscode";
import { ExtensionSettings } from "../../models/ExtensionSettings";
import { telemetryService } from "../../services/telemetry/telemetryService";
import { debugLog } from "../../services/debug/logger";
import { SecureKeyManager } from '../../services/encryption/SecureKeyManager';

interface ProviderConfig {
    apiKey?: string;
    model: string;
    url?: string;
}

interface ProviderDefaults {
    [key: string]: ProviderConfig;
}

export class SettingsManager {
    private static readonly CONFIG_PREFIX = "aiCommitAssistant";

    private static readonly PROVIDER_DEFAULTS: ProviderDefaults = {
        gemini: { model: "gemini-2.5-flash-preview-04-17" },
        huggingface: { model: "" },
        ollama: { model: "", url: "" },
        mistral: { model: "mistral-large-latest" },
        cohere: { model: "command-a-03-2025" },
        openai: { model: "gpt-4o" },
        together: { model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
        openrouter: { model: "google/gemma-3-27b-it:free" },
        anthropic: { model: "claude-3-5-sonnet-20241022" },
        copilot: { model: "gpt-4o" },
        deepseek: { model: "deepseek-chat" },
        grok: { model: "grok-3" },
        perplexity: { model: "sonar-pro" }
    };

    private static readonly API_KEY_PROVIDERS = [
        'gemini', 'huggingface', 'mistral', 'cohere', 'openai',
        'together', 'openrouter', 'anthropic', 'deepseek', 'grok', 'perplexity'
    ];

    private static readonly NO_API_KEY_PROVIDERS = ['ollama', 'copilot'];

    public async getSettings(): Promise<ExtensionSettings> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_PREFIX);
        return await SettingsManager.buildSettingsFromConfig(config);
    }

    public static async getCurrentSettings(): Promise<ExtensionSettings> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_PREFIX);
        return await SettingsManager.buildSettingsFromConfig(config);
    }

    private static async buildSettingsFromConfig(config: vscode.WorkspaceConfiguration): Promise<ExtensionSettings> {
        const settings = {
            apiProvider: config.get<string>("apiProvider") || "gemini",
            debug: config.get<boolean>("debug") || false,
            promptCustomization: {
                enabled: config.get<boolean>("promptCustomization.enabled") || false,
                saveLastPrompt: config.get<boolean>("promptCustomization.saveLastPrompt") || false,
                lastPrompt: config.get<string>("promptCustomization.lastPrompt") || "",
            },
            commit: {
                verbose: config.get<boolean>("commit.verbose") ?? true,
            },
            showDiagnostics: config.get<boolean>("showDiagnostics") ?? false,
            telemetry: {
                enabled: config.get<boolean>("telemetry.enabled") ?? true,
            },
            pro: {
                licenseKey: config.get<string>("pro.licenseKey") || "",
                encryptionEnabled: SettingsManager.getEncryptionEnabledSetting(config),
            },
        } as ExtensionSettings;

        // Build provider configurations dynamically with proper API key handling
        const secureKeyManager = SecureKeyManager.getInstance();

        for (const [provider, defaults] of Object.entries(SettingsManager.PROVIDER_DEFAULTS)) {
            const providerConfig: ProviderConfig = {
                model: config.get<string>(`${provider}.model`) || defaults.model,
            };

            if (SettingsManager.API_KEY_PROVIDERS.includes(provider)) {
                try {
                    // Use SecureKeyManager to get the appropriate API key based on encryption settings
                    const apiKey = await secureKeyManager.getApiKey(provider);
                    providerConfig.apiKey = apiKey || "";
                } catch (error) {
                    debugLog(`Failed to get API key for ${provider}:`, error);
                    // Fallback to plain text if secure key retrieval fails
                    providerConfig.apiKey = config.get<string>(`${provider}.apiKey`) || "";
                }
            }

            if (provider === 'ollama') {
                providerConfig.url = config.get<string>(`${provider}.url`) || "";
            }

            (settings as any)[provider] = providerConfig;
        }

        return settings;
    }

    public static async saveSettings(settings: ExtensionSettings): Promise<void> {
        try {
            debugLog("Starting settings save process...");
            const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_PREFIX);
            const currentSettings = await SettingsManager.getCurrentSettings();

            debugLog("Incoming settings to save:", {
                apiProvider: settings.apiProvider,
                commitVerbose: settings.commit?.verbose,
                showDiagnostics: settings.showDiagnostics,
                telemetryEnabled: settings.telemetry?.enabled,
                promptCustomizationEnabled: settings.promptCustomization?.enabled,
                encryptionEnabled: settings.pro?.encryptionEnabled
            });

            SettingsManager.trackSettingsChanges(currentSettings, settings);
            await SettingsManager.updateConfigurationSettings(config, settings);

            // Handle API key storage based on encryption settings
            await SettingsManager.handleApiKeyStorage(settings, currentSettings);

            // Allow VS Code to persist changes
            await new Promise(resolve => setTimeout(resolve, 100));

            const verificationSettings = await SettingsManager.getCurrentSettings();
            debugLog("Settings verification:", {
                originalApiProvider: settings.apiProvider,
                savedApiProvider: verificationSettings.apiProvider,
                originalCommitVerbose: settings.commit?.verbose,
                savedCommitVerbose: verificationSettings.commit?.verbose,
                originalEncryption: settings.pro?.encryptionEnabled,
                savedEncryption: verificationSettings.pro?.encryptionEnabled
            });

            debugLog("Settings saved successfully");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            debugLog("Error saving settings:", errorMessage);

            telemetryService.trackExtensionError(
                'settings_save_error',
                errorMessage,
                'saveSettings'
            );

            throw error;
        }
    }

    /**
     * Handles API key storage based on encryption settings and user status
     */
    private static async handleApiKeyStorage(
        newSettings: ExtensionSettings,
        currentSettings: ExtensionSettings
    ): Promise<void> {
        const secureKeyManager = SecureKeyManager.getInstance();
        const isProUser = !!(newSettings.pro?.licenseKey && newSettings.pro.licenseKey.length > 0);
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionAvailable = isProUser || devModeEnabled;
        const encryptionEnabled = newSettings.pro?.encryptionEnabled ?? false;

        debugLog("API key storage handling:", {
            isProUser,
            devModeEnabled,
            encryptionAvailable,
            encryptionEnabled,
            previousEncryption: currentSettings.pro?.encryptionEnabled
        });

        // Check if encryption setting changed
        const encryptionToggled = currentSettings.pro?.encryptionEnabled !== newSettings.pro?.encryptionEnabled;

        if (encryptionToggled && encryptionAvailable) {
            // Handle encryption toggle with dedicated method
            debugLog(`Encryption toggled: ${currentSettings.pro?.encryptionEnabled} -> ${encryptionEnabled}`);
            try {
                const result = await secureKeyManager.handleEncryptionToggle(encryptionEnabled);
                debugLog("Encryption toggle result:", result);

                if (result.success) {
                    debugLog(`Encryption toggle successful: ${result.message}`);
                } else {
                    debugLog(`Encryption toggle failed: ${result.message}`);
                }
            } catch (error) {
                debugLog("Failed to handle encryption toggle:", error);
            }
        } else {
            // Handle normal API key storage for new/updated keys
            for (const provider of SettingsManager.API_KEY_PROVIDERS) {
                const newProviderSettings = (newSettings as any)[provider];
                const currentProviderSettings = (currentSettings as any)[provider];

                if (newProviderSettings && newProviderSettings.apiKey) {
                    const apiKey = newProviderSettings.apiKey.trim();

                    // Only store if the key is different from current or if it's new
                    const currentKey = currentProviderSettings?.apiKey || "";

                    if (apiKey.length > 0 && apiKey !== currentKey) {
                        try {
                            debugLog(`Storing updated ${provider} API key`);
                            await secureKeyManager.storeApiKey(provider, apiKey);

                            // Clear from plain text settings if encryption is enabled
                            if (encryptionAvailable && encryptionEnabled) {
                                const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_PREFIX);
                                await config.update(`${provider}.apiKey`, "", vscode.ConfigurationTarget.Global);
                            }
                        } catch (error) {
                            debugLog(`Failed to store API key for ${provider}:`, error);
                            // Continue with other providers
                        }
                    }
                }
            }
        }

        // Handle license key changes that might affect encryption availability
        const licenseKeyChanged = currentSettings.pro?.licenseKey !== newSettings.pro?.licenseKey;
        if (licenseKeyChanged) {
            debugLog("License key changed, triggering migration...");
            try {
                await secureKeyManager.handleUserStatusChange();
            } catch (error) {
                debugLog("Failed to handle user status change:", error);
            }
        }
    }

    private static async updateConfigurationSettings(
        config: vscode.WorkspaceConfiguration,
        settings: ExtensionSettings
    ): Promise<void> {
        const target = vscode.ConfigurationTarget.Global;

        // Core settings
        const coreUpdates = [
            config.update("apiProvider", settings.apiProvider, target),
            config.update("debug", settings.debug, target),
            config.update("promptCustomization.enabled", settings.promptCustomization.enabled, target),
            config.update("promptCustomization.saveLastPrompt", settings.promptCustomization.saveLastPrompt, target),
            config.update("promptCustomization.lastPrompt", settings.promptCustomization.lastPrompt, target),
            config.update("commit.verbose", settings.commit?.verbose ?? true, target),
            config.update("showDiagnostics", settings.showDiagnostics ?? false, target),
            config.update("telemetry.enabled", settings.telemetry?.enabled ?? true, target),
            config.update("pro.licenseKey", settings.pro?.licenseKey || "", target),
            config.update("pro.encryptionEnabled", settings.pro?.encryptionEnabled ?? false, target)
        ];

        // Provider settings (excluding API keys for now - they're handled separately)
        const providerUpdates: Thenable<void>[] = [];

        Object.keys(SettingsManager.PROVIDER_DEFAULTS).forEach(provider => {
            const providerSettings = (settings as any)[provider];
            if (providerSettings) {
                providerUpdates.push(
                    config.update(`${provider}.model`, providerSettings.model, target)
                );

                // Only save API keys to plain text if encryption is not enabled
                if (SettingsManager.API_KEY_PROVIDERS.includes(provider)) {
                    const isProUser = !!(settings.pro?.licenseKey && settings.pro.licenseKey.length > 0);
                    const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
                    const encryptionAvailable = isProUser || devModeEnabled;
                    const encryptionEnabled = settings.pro?.encryptionEnabled ?? false;

                    // Handle API key storage in settings.json based on encryption status
                    if (!encryptionAvailable || !encryptionEnabled) {
                        // Only save to plain text if encryption is not being used
                        providerUpdates.push(
                            config.update(`${provider}.apiKey`, providerSettings.apiKey, target)
                        );
                    } else {
                        // When encryption is enabled, explicitly remove any existing API keys from settings.json
                        providerUpdates.push(
                            config.update(`${provider}.apiKey`, undefined, target)
                        );
                    }
                }
            }
        });

        await Promise.all([...coreUpdates, ...providerUpdates]);
    }

    private static trackSettingsChanges(
        currentSettings: ExtensionSettings,
        newSettings: ExtensionSettings
    ): void {
        const changes: Array<{ setting: string; oldValue: string; newValue: string }> = [];

        // Track core setting changes
        if (currentSettings.apiProvider !== newSettings.apiProvider) {
            changes.push({
                setting: 'apiProvider',
                oldValue: currentSettings.apiProvider,
                newValue: newSettings.apiProvider
            });
        }

        if (currentSettings.debug !== newSettings.debug) {
            changes.push({
                setting: 'debug',
                oldValue: String(currentSettings.debug || false),
                newValue: String(newSettings.debug || false)
            });
        }

        // Track provider changes
        Object.keys(SettingsManager.PROVIDER_DEFAULTS).forEach(provider => {
            const currentProvider = (currentSettings as any)[provider];
            const newProvider = (newSettings as any)[provider];

            if (currentProvider && newProvider) {
                // Only track API key changes for providers that use API keys
                if (SettingsManager.API_KEY_PROVIDERS.includes(provider)) {
                    const oldHasKey = Boolean(currentProvider.apiKey);
                    const newHasKey = Boolean(newProvider.apiKey);

                    if (oldHasKey !== newHasKey) {
                        changes.push({
                            setting: `${provider}.apiKey.configured`,
                            oldValue: String(oldHasKey),
                            newValue: String(newHasKey)
                        });
                    }
                }

                if (newProvider.model !== currentProvider.model) {
                    changes.push({
                        setting: `${provider}.model`,
                        oldValue: currentProvider.model || 'none',
                        newValue: newProvider.model || 'none'
                    });
                }

                // Track URL changes for Ollama
                if (provider === 'ollama' && newProvider.url !== currentProvider.url) {
                    changes.push({
                        setting: `${provider}.url`,
                        oldValue: currentProvider.url || 'none',
                        newValue: newProvider.url || 'none'
                    });
                }
            }
        });

        telemetryService.trackDailyActiveUser();
    }

    /**
     * Determines the encryption enabled setting based on user status and current configuration
     */
    private static getEncryptionEnabledSetting(config: vscode.WorkspaceConfiguration): boolean {
        const licenseKey = config.get<string>("pro.licenseKey") || "";
        const isProUser = !!(licenseKey && licenseKey.length > 0);
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionAvailable = isProUser || devModeEnabled;

        // Get the current setting value
        const currentSetting = config.get<boolean>("pro.encryptionEnabled");

        // If explicitly set, respect the setting (but only if available)
        if (currentSetting !== undefined) {
            return encryptionAvailable ? currentSetting : false;
        }

        // Default based on user status
        return encryptionAvailable;
    }
}