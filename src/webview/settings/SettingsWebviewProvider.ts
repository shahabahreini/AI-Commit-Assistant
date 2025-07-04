// src/webview/settings/SettingsWebviewProvider.ts
import * as vscode from "vscode";
import { getApiConfig } from "../../config/settings";
import { debugLog } from "../../services/debug/logger";
import { getOllamaModels } from "../../services/api/ollama";

export class SettingsWebviewProvider {
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    public resolveWebviewPanel(panel: vscode.WebviewPanel) {
        this._panel = panel;

        // Set up message listener
        this._disposables.push(
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'updateSetting':
                            try {
                                const config = vscode.workspace.getConfiguration('aiCommitAssistant');
                                await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);

                                // Handle nested settings properly
                                if (message.key === 'commit.verbose') {
                                    await config.update('commit.verbose', message.value, vscode.ConfigurationTarget.Global);
                                } else if (message.key === 'showDiagnostics') {
                                    await config.update('showDiagnostics', message.value, vscode.ConfigurationTarget.Global);
                                } else if (message.key === 'promptCustomization.enabled') {
                                    await config.update('promptCustomization.enabled', message.value, vscode.ConfigurationTarget.Global);
                                }

                                await this.updateWebviewContent();
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to update setting: ${error}`);
                            }
                            break;

                        case 'loadOllamaModels':
                            try {
                                debugLog("Loading Ollama models", { baseUrl: message.baseUrl });
                                const models = await getOllamaModels(message.baseUrl);

                                // Send models back to webview
                                this._panel?.webview.postMessage({
                                    command: 'ollamaModelsLoaded',
                                    success: true,
                                    models: models
                                });
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                debugLog("Failed to load Ollama models", { error: errorMessage });

                                // Send error back to webview
                                this._panel?.webview.postMessage({
                                    command: 'ollamaModelsLoaded',
                                    success: false,
                                    error: errorMessage
                                });
                            }
                            break;

                        case 'executeCommand':
                            try {
                                await vscode.commands.executeCommand(message.commandId);
                            } catch (error) {
                                debugLog("Failed to execute command", {
                                    commandId: message.commandId,
                                    error: error instanceof Error ? error.message : String(error)
                                });
                            }
                            break;

                        // Add other message handlers as needed
                    }
                }
            )
        );

        // Set up dispose listener
        this._disposables.push(
            panel.onDidDispose(() => {
                this._panel = undefined;
                this.dispose();
            })
        );

        this.updateWebviewContent();
    }

    private dispose() {
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private async updateWebviewContent() {
        if (!this._panel) {
            return;
        }

        const config = getApiConfig();
        this._panel.webview.html = this.getHtmlContent(config);
    }

    private getHtmlContent(config: any): string {
        // ...generate HTML content based on config...
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Settings</title>
            </head>
            <body>
                <h1>Settings</h1>
                <label>
                    <input type="checkbox" id="commitVerbose" ${config.commit?.verbose ? "checked" : ""} />
                    Verbose Commit Messages
                </label>
                <label>
                    <input type="checkbox" id="promptCustomizationEnabled" ${config.promptCustomization?.enabled ? "checked" : ""} />
                    Enable Prompt Customization
                </label>
                <label>
                    <input type="checkbox" id="showDiagnostics" ${config.showDiagnostics ? "checked" : ""} />
                    Show Diagnostics Before Proceeding
                </label>
                <div>
                    <label for="apiProvider">API Provider</label>
                    <select id="apiProvider">
                        <option value="gemini" ${config.apiProvider === "gemini" ? "selected" : ""}>Gemini</option>
                        <option value="huggingface" ${config.apiProvider === "huggingface" ? "selected" : ""}>Hugging Face</option>
                        <option value="ollama" ${config.apiProvider === "ollama" ? "selected" : ""}>Ollama</option>
                        <option value="mistral" ${config.apiProvider === "mistral" ? "selected" : ""}>Mistral</option>
                        <option value="cohere" ${config.apiProvider === "cohere" ? "selected" : ""}>Cohere</option>
                        <option value="openai" ${config.apiProvider === "openai" ? "selected" : ""}>OpenAI</option>
                        <option value="together" ${config.apiProvider === "together" ? "selected" : ""}>Together AI</option>
                        <option value="openrouter" ${config.apiProvider === "openrouter" ? "selected" : ""}>OpenRouter</option>
                        <option value="anthropic" ${config.apiProvider === "anthropic" ? "selected" : ""}>Anthropic</option>
                        <option value="copilot" ${config.apiProvider === "copilot" ? "selected" : ""}>GitHub Copilot</option>
                        <option value="deepseek" ${config.apiProvider === "deepseek" ? "selected" : ""}>DeepSeek</option>
                        <option value="grok" ${config.apiProvider === "grok" ? "selected" : ""}>Grok</option>
                        <option value="perplexity" ${config.apiProvider === "perplexity" ? "selected" : ""}>Perplexity</option>
                    </select>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();

                    document.getElementById('commitVerbose').addEventListener('change', (event) => {
                        vscode.postMessage({
                            command: 'updateSetting',
                            key: 'commit.verbose',
                            value: event.target.checked
                        });
                    });

                    document.getElementById('promptCustomizationEnabled').addEventListener('change', (event) => {
                        vscode.postMessage({
                            command: 'updateSetting',
                            key: 'promptCustomization.enabled',
                            value: event.target.checked
                        });
                    });

                    document.getElementById('showDiagnostics').addEventListener('change', (event) => {
                        vscode.postMessage({
                            command: 'updateSetting',
                            key: 'showDiagnostics',
                            value: event.target.checked
                        });
                    });

                    document.getElementById('apiProvider').addEventListener('change', (event) => {
                        const selectedProvider = event.target.value;
                        vscode.postMessage({
                            command: 'updateSetting',
                            key: 'apiProvider',
                            value: selectedProvider
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
}