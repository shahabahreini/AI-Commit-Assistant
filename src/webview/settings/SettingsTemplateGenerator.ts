// src/webview/settings/SettingsTemplateGenerator.ts
import { ExtensionSettings } from "../../models/ExtensionSettings";

export class SettingsTemplateGenerator {
  private _settings: ExtensionSettings;
  private _nonce: string;

  constructor(settings: ExtensionSettings, nonce: string) {
    this._settings = settings;
    this._nonce = nonce;
  }

  public generateHtml(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>AI Commit Assistant Settings</title>
      ${this._getStyles()}
    </head>
    <body>
      <div class="settings-container">
        <h2>AI Commit Assistant Settings</h2>
        ${this._getGeneralSettings()}
        ${this._getGeminiSettings()}
        ${this._getHuggingFaceSettings()}
        ${this._getOllamaSettings()}
        ${this._getMistralSettings()}
        ${this._getButtonGroup()}
      </div>
      ${this._getScript()}
    </body>
    </html>`;
  }

  private _getStyles(): string {
    return `<style>
      body {
        padding: 20px;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
      }

      .settings-section {
        margin-bottom: 20px;
      }

      .form-group {
        margin-bottom: 15px;
      }

      .label-container {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
      }

      label {
        display: block;
        color: var(--vscode-foreground);
      }

      .checkbox-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 5px;
      }

      .checkbox-container input[type="checkbox"] {
        width: auto;
        margin: 0;
        cursor: pointer;
      }

      .checkbox-container label {
        cursor: pointer;
        display: inline;
      }

      .learn-more {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        font-size: 12px;
        margin-left: 8px;
      }

      .learn-more:hover {
        text-decoration: underline;
      }

      input,
      select {
        width: 100%;
        padding: 8px;
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 2px;
      }

      select {
        height: 32px;
        appearance: none;
        padding-right: 30px;
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M7.41%208.59L12%2013.17l4.59-4.58L18%2010l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        background-size: 16px;
      }

      select:focus,
      input:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
      }

      select option {
        background-color: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
      }

      button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 2px;
      }

      button:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .settings-container {
        max-width: 800px;
        margin: 0 auto;
      }

      h2,
      h3 {
        color: var(--vscode-foreground);
        border-bottom: 1px solid var(--vscode-input-border);
        padding-bottom: 8px;
      }

      .description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-top: 4px;
      }
    </style>`;
  }

  private _getGeneralSettings(): string {
    return `
    <div class="settings-section">
      <h3>General Settings</h3>
      <div class="form-group">
        <div class="checkbox-container">
          <input type="checkbox" id="commitVerbose" ${this._settings.commit?.verbose ? "checked" : ""} />
          <label for="commitVerbose">Verbose Commit Messages</label>
        </div>
        <div class="description">
          When enabled, generates detailed commit messages with bullet points.
          When disabled, only generates the summary line.
        </div>
      </div>
      <div class="form-group">
        <label for="apiProvider">API Provider</label>
        <select id="apiProvider">
          <option value="gemini">Gemini</option>
          <option value="huggingface">Hugging Face</option>
          <option value="ollama">Ollama</option>
          <option value="mistral">Mistral</option>
        </select>
      </div>
    </div>`;
  }

  // src/webview/settings/SettingsTemplateGenerator.ts (continued)

  private _getGeminiSettings(): string {
    return `
    <div id="geminiSettings" class="settings-section">
      <h3>Gemini Settings</h3>
      <div class="form-group">
        <div class="label-container">
          <label for="geminiApiKey">API Key</label>
          <a href="https://aistudio.google.com/app/apikey" class="learn-more" target="_blank">Learn more</a>
        </div>
        <input type="password" id="geminiApiKey" />
      </div>
      <div class="form-group">
        <label for="geminiModel">Model</label>
        <select id="geminiModel">
          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
        </select>
        <div class="description">
          Gemini 2.0 Flash is recommended for optimal performance and speed.
          Flash models are optimized for faster response times.
        </div>
      </div>
    </div>`;
  }

  private _getHuggingFaceSettings(): string {
    return `
    <div id="huggingfaceSettings" class="settings-section">
      <h3>Hugging Face Settings</h3>
      <div class="form-group">
        <div class="label-container">
          <label for="huggingfaceApiKey">API Key</label>
          <a href="https://huggingface.co/settings/tokens" class="learn-more" target="_blank">Learn more</a>
        </div>
        <input type="password" id="huggingfaceApiKey" />
      </div>
      <div class="form-group">
        <div class="label-container">
          <label for="huggingfaceModel">Model</label>
          <a href="https://huggingface.co/models" class="learn-more" target="_blank">Learn more</a>
        </div>
        <input type="text" id="huggingfaceModel" placeholder="e.g., mistralai/Mistral-7B-Instruct-v0.3" />
        <div class="description">
          Examples: mistralai/Mistral-7B-Instruct-v0.3,
          facebook/bart-large-cnn
        </div>
      </div>
    </div>`;
  }

  private _getOllamaSettings(): string {
    return `
    <div id="ollamaSettings" class="settings-section">
      <h3>Ollama Settings</h3>
      <div class="form-group">
        <label for="ollamaUrl">URL</label>
        <input type="text" id="ollamaUrl" placeholder="http://localhost:11434" />
      </div>
      <div class="form-group">
        <div class="label-container">
          <label for="ollamaModel">Model</label>
          <a href="https://ollama.ai/library" class="learn-more" target="_blank">Learn more</a>
        </div>
        <input type="text" id="ollamaModel" placeholder="e.g., phi4" />
        <div class="description">
          Examples: mistral, llama2, codellama, phi4, qwen2.5-coder
        </div>
      </div>
    </div>`;
  }

  private _getMistralSettings(): string {
    return `
    <div id="mistralSettings" class="settings-section">
      <h3>Mistral Settings</h3>
      <div class="form-group">
        <div class="label-container">
          <label for="mistralApiKey">API Key</label>
          <a href="https://console.mistral.ai/api-keys/" class="learn-more" target="_blank">Learn more</a>
        </div>
        <input type="password" id="mistralApiKey" />
      </div>
      <div class="form-group">
        <label for="mistralModel">Model</label>
        <select id="mistralModel">
          <option value="mistral-tiny">Mistral Tiny</option>
          <option value="mistral-small">Mistral Small</option>
          <option value="mistral-medium">Mistral Medium</option>
          <option value="mistral-large-latest">Mistral Large (Latest)</option>
        </select>
      </div>
    </div>`;
  }

  private _getButtonGroup(): string {
    return `
    <div class="button-group">
      <button onclick="checkApiSetup()">Check API Setup</button>
      <button onclick="checkRateLimits()">Check Rate Limits</button>
      <button onclick="saveSettings()">Save Settings</button>
    </div>`;
  }

  private _getScript(): string {
    return `
      <script nonce="${this._nonce}">
        const vscode = acquireVsCodeApi();
        const currentSettings = ${JSON.stringify(this._settings)};
    
        // Initialize form with current settings
        document.getElementById('apiProvider').value = currentSettings.apiProvider || 'huggingface';
        document.getElementById('commitVerbose').checked = currentSettings.commit?.verbose ?? true;
        document.getElementById('geminiApiKey').value = currentSettings.gemini?.apiKey || '';
        document.getElementById('geminiModel').value = currentSettings.gemini?.model || 'gemini-2.0-flash';
        document.getElementById('huggingfaceApiKey').value = currentSettings.huggingface?.apiKey || '';
        document.getElementById('huggingfaceModel').value = currentSettings.huggingface?.model || '';
        document.getElementById('ollamaUrl').value = currentSettings.ollama?.url || '';
        document.getElementById('ollamaModel').value = currentSettings.ollama?.model || '';
        document.getElementById('mistralApiKey').value = currentSettings.mistral?.apiKey || '';
        document.getElementById('mistralModel').value = currentSettings.mistral?.model || 'mistral-large-latest';
    
        // Show/hide sections based on selected provider
        function updateVisibleSettings() {
          const provider = document.getElementById('apiProvider').value;
          document.getElementById('geminiSettings').style.display =
            provider === 'gemini' ? 'block' : 'none';
          document.getElementById('huggingfaceSettings').style.display =
            provider === 'huggingface' ? 'block' : 'none';
          document.getElementById('ollamaSettings').style.display =
            provider === 'ollama' ? 'block' : 'none';
          document.getElementById('mistralSettings').style.display =
            provider === 'mistral' ? 'block' : 'none';
        }
    
        // Initialize UI state immediately
        updateVisibleSettings();
        
        // Add event listener for future changes
        document.getElementById('apiProvider').addEventListener('change', updateVisibleSettings);
    
        function saveSettings() {
          const newSettings = {
            apiProvider: document.getElementById('apiProvider').value,
            debug: currentSettings.debug,
            gemini: {
              apiKey: document.getElementById('geminiApiKey').value,
              model: document.getElementById('geminiModel').value
            },
            huggingface: {
              apiKey: document.getElementById('huggingfaceApiKey').value,
              model: document.getElementById('huggingfaceModel').value
            },
            ollama: {
              url: document.getElementById('ollamaUrl').value,
              model: document.getElementById('ollamaModel').value
            },
            mistral: {
              apiKey: document.getElementById('mistralApiKey').value,
              model: document.getElementById('mistralModel').value
            },
            commit: {
              verbose: document.getElementById('commitVerbose').checked
            }
          };
    
          vscode.postMessage({
            command: 'saveSettings',
            settings: newSettings
          });
        }
        
        function checkApiSetup() {
          vscode.postMessage({
            command: 'executeCommand',
            commandId: 'ai-commit-assistant.checkApiSetup'
          });
        }
    
        function checkRateLimits() {
          vscode.postMessage({
            command: 'executeCommand',
            commandId: 'ai-commit-assistant.checkRateLimits'
          });
        }
      </script>`;
  }
}

