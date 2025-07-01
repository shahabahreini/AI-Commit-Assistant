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
