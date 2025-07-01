// src/webview/settings/components/ProFeaturesSettings.ts
import { ExtensionSettings } from "../../../models/ExtensionSettings";

export class ProFeaturesSettings {
    private _settings: ExtensionSettings;

    constructor(settings: ExtensionSettings) {
        this._settings = settings;
    }

    public render(): string {
        const isProUser = !!this._settings.pro?.licenseKey && this._settings.pro.licenseKey.length > 0;
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionAvailable = isProUser || devModeEnabled;

        // Use the setting as provided by the backend (which handles defaults properly)
        const encryptionEnabled = this._settings.pro?.encryptionEnabled ?? false;

        return `
            <div id="proFeaturesSettings" class="settings-section pro-features-section">
                <div class="tabs-container">
                    <div class="tabs-header">
                        <button class="tab-button active" data-tab="free-tab">Free Features</button>
                        <button class="tab-button" data-tab="pro-tab">Pro Features</button>
                    </div>
                    
                    <div class="tab-content active" id="free-tab">
                        <div class="minimalist-card">
                            <div class="card-content">
                                <div class="free-features-toggles">
                                    <div class="toggle-item">
                                        <div class="toggle-switch">
                                            <input type="checkbox" id="commitVerbose" ${this._settings.commit?.verbose ? "checked" : ""} data-setting="commit.verbose" />
                                             <label for="commitVerbose" class="toggle-slider"></label>
                                        </div>
                                        <label class="toggle-label" for="commitVerbose">Verbose Messages</label>
                                    </div>
                                    
                                    <div class="toggle-item">
                                        <div class="toggle-switch">
                                            <input type="checkbox" id="promptCustomizationEnabled" ${this._settings.promptCustomization?.enabled ? "checked" : ""} data-setting="promptCustomization.enabled" />
                                            <label for="promptCustomizationEnabled" class="toggle-slider"></label>
                                        </div>
                                        <label class="toggle-label" for="promptCustomizationEnabled">Prompt Customization</label>
                                    </div>
                                    
                                    <div class="toggle-item" style="display: ${this._settings.promptCustomization?.enabled ? "flex" : "none"};" id="saveLastPromptRow" data-tooltip="When enabled, saves your last custom prompt and uses it as default for future commit message generation. The prompt can be copied to clipboard for editing.">
                                        <div class="toggle-switch">
                                            <input type="checkbox" id="saveLastPrompt" ${this._settings.promptCustomization?.saveLastPrompt ? "checked" : ""} data-setting="promptCustomization.saveLastPrompt" />
                                            <label for="saveLastPrompt" class="toggle-slider"></label>
                                        </div>
                                        <label class="toggle-label" for="saveLastPrompt">Save Last Custom Prompt</label>
                                    </div>
                                    
                                    <div class="toggle-item">
                                        <div class="toggle-switch">
                                            <input type="checkbox" id="showDiagnostics" ${this._settings.showDiagnostics ? "checked" : ""} data-setting="showDiagnostics" />
                                            <label for="showDiagnostics" class="toggle-slider"></label>
                                        </div>
                                        <label class="toggle-label" for="showDiagnostics">Show Diagnostics</label>
                                    </div>
                                    
                                    <div class="toggle-item">
                                        <div class="toggle-switch">
                                            <input type="checkbox" id="telemetryEnabled" ${this._settings.telemetry?.enabled !== false ? "checked" : ""} data-setting="telemetry.enabled" />
                                            <label for="telemetryEnabled" class="toggle-slider"></label>
                                        </div>
                                        <label class="toggle-label" for="telemetryEnabled">Anonymous Analytics 🛡️</label>
                                    </div>
                                </div>
                                
                                ${!isProUser && !devModeEnabled ? this.renderUpgradePrompt() : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="pro-tab">
                        <div class="minimalist-card">
                            <div class="card-content">
                                <div class="toggle-item" data-tooltip="${this.getEncryptionTooltip(encryptionAvailable, devModeEnabled)}">
                                    <div class="toggle-switch ${!encryptionAvailable ? 'disabled' : ''}">
                                        <input type="checkbox" 
                                               id="encryptionEnabled" 
                                               ${encryptionEnabled ? "checked" : ""} 
                                               ${!encryptionAvailable ? "disabled" : ""}
                                               data-setting="pro.encryptionEnabled" />
                                        <label for="encryptionEnabled" class="toggle-slider ${!encryptionAvailable ? 'disabled' : ''}"></label>
                                    </div>
                                    <label class="toggle-label" for="encryptionEnabled">
                                        <span class="feature-icon">🔒</span> Encrypted API Key Storage
                                    </label>
                                </div>
                                
                                <div class="pro-license-section">
                                    <div class="license-key-container">
                                        <label for="proLicenseKey" class="license-key-label">
                                            License Key
                                            ${!isProUser ? '<span class="required">*</span>' : '<span class="verified">✓ Verified</span>'}
                                        </label>
                                        <input type="password" 
                                               id="proLicenseKey" 
                                               value="${this._settings.pro?.licenseKey || ""}" 
                                               placeholder="Enter license key"
                                               class="license-key-input ${isProUser ? 'verified' : ''}" />
                                        ${encryptionAvailable ? `
                                        <button id="checkEncryptionStatus" class="status-button" title="Check encryption status">
                                            <span class="action-icon">📊</span> Check Status
                                        </button>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${devModeEnabled ? this.renderDevModeNotice() : ''}
            </div>
            
            <style>
                .tabs-container {
                    margin-top: 1rem;
                }
                
                .tabs-header {
                    display: flex;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    margin-bottom: 1rem;
                }
                
                .tab-button {
                    background: transparent;
                    border: none;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    color: var(--vscode-foreground);
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                    font-size: 0.9rem;
                }
                
                .tab-button.active {
                    border-bottom: 2px solid var(--vscode-button-background);
                    font-weight: 500;
                }
                
                .tab-content {
                    display: none;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                .minimalist-card {
                    background: var(--vscode-editor-background);
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .card-content {
                    padding: 1rem;
                }
                
                .feature-list {
                    list-style-type: none;
                    padding-left: 0.5rem;
                    margin-top: 0.5rem;
                }
                
                .feature-list li {
                    padding: 0.5rem 0;
                    display: flex;
                    align-items: center;
                }
                
                .feature-list li:before {
                    content: "\u2713";
                    margin-right: 0.5rem;
                    color: var(--vscode-terminal-ansiGreen);
                }
                
                /* Pro features specific styles */
                .pro-feature-list li:before {
                    content: "";
                    display: none;
                }
                
                .pro-feature {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
                }
                
                .pro-feature:last-child {
                    border-bottom: none;
                }
                
                .feature-icon {
                    margin-right: 0.75rem;
                    font-size: 1rem;
                }
                
                .feature-text {
                    flex: 1;
                    font-size: 0.9rem;
                }
                
                .feature-toggle {
                    display: flex;
                    align-items: center;
                }
                
                .feature-toggle input[type="checkbox"] {
                    margin: 0;
                }
                
                .toggle-slider {
                    position: relative;
                    display: inline-block;
                    width: 36px;
                    height: 18px;
                    background-color: var(--vscode-checkbox-background);
                    border-radius: 18px;
                    margin: 0;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 2px;
                    bottom: 2px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 50%;
                    transition: all 0.3s ease;
                }
                
                input:checked + .toggle-slider {
                    background-color: var(--vscode-button-background);
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(18px);
                }
                
                .encryption-actions-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 0.75rem;
                    gap: 0.5rem;
                }
                
                .pro-license-section {
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
                }
                
                .pro-license-section input {
                    width: 100%;
                    padding: 0.5rem;
                    font-size: 0.9rem;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border, transparent);
                    border-radius: 2px;
                }
                
                .pro-license-section .description {
                    font-size: 0.8rem;
                    margin-top: 0.25rem;
                    color: var(--vscode-descriptionForeground);
                }
                
                .verified {
                    color: var(--vscode-terminal-ansiGreen);
                    font-size: 0.8rem;
                }
                
                .required {
                    color: var(--vscode-errorForeground);
                    margin-left: 0.25rem;
                }
                
                /* Free features toggle styles */
                .free-features-toggles {
                    margin-top: 0.5rem;
                }
                
                .toggle-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                
                .toggle-item:last-child {
                    margin-bottom: 0;
                }
                
                .toggle-label {
                    margin-left: 0.75rem;
                    font-size: 0.9rem;
                }
                
                /* Minimal license key styling */
                .license-key-container {
                    display: flex;
                    align-items: center;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                }
                
                .license-key-label {
                    margin-right: 0.75rem;
                    font-size: 0.9rem;
                    white-space: nowrap;
                }
                
                .license-key-input {
                    max-width: 200px;
                    height: 24px;
                    padding: 2px 8px;
                    font-size: 0.9rem;
                }
                
                .status-button {
                    margin-left: 10px;
                    padding: 3px 8px;
                    font-size: 0.85rem;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    height: 24px;
                }
                
                .status-button:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .action-icon {
                    margin-right: 4px;
                    font-size: 0.9rem;
                }
            </style>
            
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const tabButtons = document.querySelectorAll('.tab-button');
                    const tabContents = document.querySelectorAll('.tab-content');
                    
                    // Function to switch tabs without losing state
                    window.switchTab = (tabId) => {
                        // Remove active class from all buttons and contents
                        tabButtons.forEach(btn => btn.classList.remove('active'));
                        tabContents.forEach(content => content.classList.remove('active'));
                        
                        // Add active class to selected button and content
                        document.querySelector('.tab-button[data-tab="' + tabId + '"]').classList.add('active');
                        document.getElementById(tabId).classList.add('active');
                    };
                    
                    // Set up tab button click handlers
                    tabButtons.forEach(button => {
                        button.addEventListener('click', () => {
                            const tabId = button.getAttribute('data-tab');
                            window.switchTab(tabId);
                        });
                    });
                    
                    // Prevent form controls in the Pro tab from switching tabs
                    document.querySelectorAll('#pro-tab input, #pro-tab button').forEach(element => {
                        element.addEventListener('change', (e) => {
                            e.stopPropagation();
                        });
                        
                        element.addEventListener('click', (e) => {
                            e.stopPropagation();
                        });
                    });
                });
            </script>`;
    }

    private renderUpgradePrompt(): string {
        return `
            <div class="upgrade-prompt">
                <div class="upgrade-content">
                    <div class="upgrade-icon">🚀</div>
                    <div class="upgrade-text">
                        <h4>Unlock Premium Features</h4>
                        <p>Upgrade to GitMind Pro to access encrypted API key storage and advanced features coming soon.</p>
                    </div>
                    <div class="upgrade-actions">
                        <button class="upgrade-button" onclick="window.open('https://gitmind.com/pro', '_blank')">
                            Upgrade to Pro
                        </button>
                    </div>
                </div>
            </div>`;
    }

    private getEncryptionTooltip(encryptionAvailable: boolean, devModeEnabled: boolean): string {
        if (devModeEnabled) {
            return encryptionAvailable
                ? "Encrypt and securely store your API keys using VS Code's SecretStorage"
                : "Encryption is available in development mode, but you need to provide a license key first.";
        }

        if (encryptionAvailable) {
            return "Encrypt and securely store your API keys using VS Code's SecretStorage";
        }

        return "Encryption is a Pro feature. Please upgrade to GitMind Pro to enable this feature.";
    }

    private renderDevModeNotice(): string {
        return `
            <div class="dev-mode-notice">
                <div class="notice-header">
                    <span class="dev-icon">⚡</span>
                    <strong>Development Mode Active</strong>
                </div>
                <p>Encryption features are enabled for testing. Set <code>GITMIND_ENCRYPTION_DEV_MODE=true</code> environment variable to enable.</p>
            </div>`;
    }

    // End of class
}
