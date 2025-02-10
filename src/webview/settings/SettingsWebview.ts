// src/webview/settings/SettingsWebview.ts
import * as vscode from 'vscode';
import { getNonce } from '../../utils/getNonce';

export class SettingsWebview {
    public static readonly viewType = 'aiCommitAssistant.settings';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (SettingsWebview.currentPanel) {
            SettingsWebview.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            SettingsWebview.viewType,
            'AI Commit Assistant Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'dist')
                ]
            }
        );

        new SettingsWebview(panel, extensionUri);
    }

    private static currentPanel: SettingsWebview | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'saveSettings':
                        await this._saveSettings(message.settings);
                        break;
                }
            },
            null,
            this._disposables
        );

        SettingsWebview.currentPanel = this;
    }

    private async _saveSettings(settings: any) {
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        await config.update('general', settings.general, vscode.ConfigurationTarget.Global);
        await config.update('gemini', settings.gemini, vscode.ConfigurationTarget.Global);
        await config.update('huggingface', settings.huggingface, vscode.ConfigurationTarget.Global);
        await config.update('ollama', settings.ollama, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('Settings saved successfully!');
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        const settings = {
            general: config.get('general'),
            gemini: config.get('gemini'),
            huggingface: config.get('huggingface'),
            ollama: config.get('ollama')
        };

        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Commit Assistant Settings</title>
                <style>
                    body {
                        padding: 20px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    .settings-section {
                        margin-bottom: 20px;
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                    }
                    input, select {
                        width: 100%;
                        padding: 5px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="settings-container">
                    <h2>AI Commit Assistant Settings</h2>
                    
                    <div class="settings-section">
                        <h3>General Settings</h3>
                        <div class="form-group">
                            <label for="apiProvider">API Provider</label>
                            <select id="apiProvider">
                                <option value="gemini">Gemini</option>
                                <option value="huggingface">Hugging Face</option>
                                <option value="ollama">Ollama</option>
                            </select>
                        </div>
                    </div>

                    <div id="geminiSettings" class="settings-section">
                        <h3>Gemini Settings</h3>
                        <div class="form-group">
                            <label for="geminiApiKey">API Key</label>
                            <input type="password" id="geminiApiKey" />
                        </div>
                    </div>

                    <div id="huggingfaceSettings" class="settings-section">
                        <h3>Hugging Face Settings</h3>
                        <div class="form-group">
                            <label for="huggingfaceApiKey">API Key</label>
                            <input type="password" id="huggingfaceApiKey" />
                        </div>
                        <div class="form-group">
                            <label for="huggingfaceModel">Model</label>
                            <input type="text" id="huggingfaceModel" />
                        </div>
                    </div>

                    <div id="ollamaSettings" class="settings-section">
                        <h3>Ollama Settings</h3>
                        <div class="form-group">
                            <label for="ollamaUrl">URL</label>
                            <input type="text" id="ollamaUrl" />
                        </div>
                        <div class="form-group">
                            <label for="ollamaModel">Model</label>
                            <input type="text" id="ollamaModel" />
                        </div>
                    </div>

                    <button onclick="saveSettings()">Save Settings</button>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const settings = ${JSON.stringify(settings)};

                    // Initialize form with current settings
                    document.getElementById('apiProvider').value = settings.general.apiProvider;
                    document.getElementById('geminiApiKey').value = settings.gemini.apiKey || '';
                    document.getElementById('huggingfaceApiKey').value = settings.huggingface.apiKey || '';
                    document.getElementById('huggingfaceModel').value = settings.huggingface.model || '';
                    document.getElementById('ollamaUrl').value = settings.ollama.url || '';
                    document.getElementById('ollamaModel').value = settings.ollama.model || '';

                    function saveSettings() {
                        const newSettings = {
                            general: {
                                apiProvider: document.getElementById('apiProvider').value,
                                debug: settings.general.debug
                            },
                            gemini: {
                                apiKey: document.getElementById('geminiApiKey').value
                            },
                            huggingface: {
                                apiKey: document.getElementById('huggingfaceApiKey').value,
                                model: document.getElementById('huggingfaceModel').value
                            },
                            ollama: {
                                url: document.getElementById('ollamaUrl').value,
                                model: document.getElementById('ollamaModel').value
                            }
                        };

                        vscode.postMessage({
                            command: 'saveSettings',
                            settings: newSettings
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    public dispose() {
        SettingsWebview.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
