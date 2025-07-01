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
                <h3>
                    <span class="pro-icon">💎</span>
                    Pro Features
                    ${!isProUser ? '<span class="upgrade-badge">Upgrade Required</span>' : '<span class="pro-badge">Pro Active</span>'}
                </h3>
                
                ${!isProUser && !devModeEnabled ? this.renderUpgradePrompt() : ''}
                
                <div class="form-group compact-form">
                    <div class="compact-toggles">
                        <div class="pro-feature-item">
                            <div class="feature-header">
                                <div class="feature-icon">🔒</div>
                                <div class="feature-info">
                                    <h4>Encrypted API Key Storage</h4>
                                    <p class="feature-description">
                                        Controls access to VS Code's encrypted SecretStorage for API keys. 
                                        Keys are always encrypted as backup, but this setting determines the access method for Pro users.
                                    </p>
                                </div>
                            </div>
                            
                            <div class="feature-controls">
                                <div class="compact-toggle-row ${!encryptionAvailable ? 'disabled' : ''}" 
                                     data-tooltip="${this.getEncryptionTooltip(encryptionAvailable, devModeEnabled)}">
                                    <div class="toggle-switch">
                                        <input type="checkbox" 
                                               id="encryptionEnabled" 
                                               ${encryptionEnabled ? "checked" : ""} 
                                               ${!encryptionAvailable ? "disabled" : ""}
                                               data-setting="pro.encryptionEnabled" />
                                        <label for="encryptionEnabled" class="toggle-slider ${!encryptionAvailable ? 'disabled' : ''}"></label>
                                    </div>
                                    <label class="compact-label ${!encryptionAvailable ? 'disabled' : ''}" for="encryptionEnabled">
                                        Enable Encryption
                                    </label>
                                </div>
                                
                                ${encryptionAvailable ? this.renderEncryptionActions() : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="pro-license-section">
                    <div class="form-group">
                        <label for="proLicenseKey">
                            License Key
                            ${!isProUser ? '<span class="required">*</span>' : '<span class="verified">✓ Verified</span>'}
                        </label>
                        <input type="password" 
                               id="proLicenseKey" 
                               value="${this._settings.pro?.licenseKey || ""}" 
                               placeholder="Enter your GitMind Pro license key"
                               class="${isProUser ? 'verified' : ''}" />
                        <div class="description">
                            ${!isProUser
                ? 'Enter your GitMind Pro license key to unlock premium features.'
                : 'Your Pro subscription is active and verified.'
            }
                        </div>
                    </div>
                </div>
                
                ${devModeEnabled ? this.renderDevModeNotice() : ''}
            </div>`;
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

    private renderEncryptionActions(): string {
        return `
            <div class="encryption-actions">
                <button id="migrateToSecure" class="secondary-button" title="Migrate existing API keys to encrypted storage">
                    🔄 Migrate Keys
                </button>
                <button id="checkEncryptionStatus" class="secondary-button" title="Check encryption status">
                    📊 Check Status
                </button>
            </div>`;
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

    private getEncryptionTooltip(encryptionAvailable: boolean, devModeEnabled: boolean): string {
        if (devModeEnabled) {
            return "Encryption available in development mode for testing";
        }

        if (encryptionAvailable) {
            return "Encrypt and securely store your API keys using VS Code's SecretStorage";
        }

        return "Upgrade to GitMind Pro to enable encrypted API key storage";
    }
}
