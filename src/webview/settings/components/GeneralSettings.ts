// src/webview/settings/components/GeneralSettings.ts
import { ExtensionSettings } from "../../../models/ExtensionSettings";

export class GeneralSettings {
  private _settings: ExtensionSettings;

  constructor(settings: ExtensionSettings) {
    this._settings = settings;
  }

  public render(): string {
    return `
    <div class="settings-section general-settings-compact">
      <h3>General Settings</h3>
      <div class="form-group compact-form">
        <div class="compact-toggles">
          <div class="compact-toggle-row" data-tooltip="When enabled, generates detailed commit messages with bullet points. When disabled, only generates the summary line.">
            <div class="toggle-switch">
              <input type="checkbox" id="commitVerbose" ${this._settings.commit?.verbose ? "checked" : ""} />
              <label for="commitVerbose" class="toggle-slider"></label>
            </div>
            <label class="compact-label" for="commitVerbose">Verbose Messages</label>
          </div>
          <div class="compact-toggle-row" data-tooltip="When enabled, shows a dialog to add custom context when generating commit messages.">
            <div class="toggle-switch">
              <input type="checkbox" id="promptCustomizationEnabled" ${this._settings.promptCustomization?.enabled ? "checked" : ""} />
              <label for="promptCustomizationEnabled" class="toggle-slider"></label>
            </div>
            <label class="compact-label" for="promptCustomizationEnabled">Prompt Customization</label>
          </div>
          <div class="compact-toggle-row" data-tooltip="When enabled, saves your last custom prompt and uses it as default for future commit message generation. The prompt can be copied to clipboard for editing." style="display: ${this._settings.promptCustomization?.enabled ? "flex" : "none"};" id="saveLastPromptRow">
            <div class="toggle-switch">
              <input type="checkbox" id="saveLastPrompt" ${this._settings.promptCustomization?.saveLastPrompt ? "checked" : ""} />
              <label for="saveLastPrompt" class="toggle-slider"></label>
            </div>
            <label class="compact-label" for="saveLastPrompt">Save Last Custom Prompt</label>
          </div>
          <div class="compact-toggle-row" data-tooltip="When enabled, shows model information and estimated token count before generating commit messages.">
            <div class="toggle-switch">
              <input type="checkbox" id="showDiagnostics" ${this._settings.showDiagnostics ? "checked" : ""} />
              <label for="showDiagnostics" class="toggle-slider"></label>
            </div>
            <label class="compact-label" for="showDiagnostics">Show Diagnostics</label>
          </div>
          <div class="compact-toggle-row" data-tooltip="Help improve GitMind by sharing anonymous usage analytics. Privacy First: No code content, file names, or personal information is collected. This setting works alongside VS Code's global telemetry setting.">
            <div class="toggle-switch">
              <input type="checkbox" id="telemetryEnabled" ${this._settings.telemetry?.enabled !== false ? "checked" : ""} />
              <label for="telemetryEnabled" class="toggle-slider"></label>
            </div>
            <label class="compact-label" for="telemetryEnabled">Anonymous Analytics 🛡️</label>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="apiProvider">API Provider</label>
        <select id="apiProvider">
          <option value="gemini" ${this._settings.apiProvider === "gemini" ? "selected" : ""}>Gemini</option>
          <option value="huggingface" ${this._settings.apiProvider === "huggingface" ? "selected" : ""}>Hugging Face</option>
          <option value="ollama" ${this._settings.apiProvider === "ollama" ? "selected" : ""}>Ollama</option>
          <option value="mistral" ${this._settings.apiProvider === "mistral" ? "selected" : ""}>Mistral</option>
          <option value="cohere" ${this._settings.apiProvider === "cohere" ? "selected" : ""}>Cohere</option>
          <option value="openai" ${this._settings.apiProvider === "openai" ? "selected" : ""}>OpenAI</option>
          <option value="together" ${this._settings.apiProvider === "together" ? "selected" : ""}>Together AI</option>
          <option value="openrouter" ${this._settings.apiProvider === "openrouter" ? "selected" : ""}>OpenRouter</option>
          <option value="anthropic" ${this._settings.apiProvider === "anthropic" ? "selected" : ""}>Anthropic</option>
          <option value="copilot" ${this._settings.apiProvider === "copilot" ? "selected" : ""}>GitHub Copilot</option>
          <option value="deepseek" ${this._settings.apiProvider === "deepseek" ? "selected" : ""}>DeepSeek</option>
          <option value="grok" ${this._settings.apiProvider === "grok" ? "selected" : ""}>Grok</option>
          <option value="perplexity" ${this._settings.apiProvider === "perplexity" ? "selected" : ""}>Perplexity</option>
        </select>
      </div>
    </div>`;
  }
}
