// src/services/encryption/SecureKeyManager.ts
import * as vscode from 'vscode';
import { debugLog } from '../debug/logger';

// Placeholder text to display in settings when a key is encrypted
export const ENCRYPTED_KEY_PLACEHOLDER = "[ENCRYPTED]";


/**
 * Manages secure storage and retrieval of API keys using VSCode's SecretStorage API
 * This class ensures API keys are encrypted and stored securely, only accessible to this extension
 */
export class SecureKeyManager {
    private static instance: SecureKeyManager;
    private context: vscode.ExtensionContext | undefined;

    private constructor() { }

    /**
     * Gets the singleton instance of SecureKeyManager
     */
    public static getInstance(): SecureKeyManager {
        if (!SecureKeyManager.instance) {
            SecureKeyManager.instance = new SecureKeyManager();
        }
        return SecureKeyManager.instance;
    }

    /**
     * Initializes the SecureKeyManager with the extension context
     * Must be called during extension activation
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        debugLog('SecureKeyManager initialized');
    }

    /**
     * Checks if encryption is available for the current user
     * This feature is only available for pro users or when dev mode is enabled
     */
    public isEncryptionAvailable(): boolean {
        // Check for development mode override
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        if (devModeEnabled) {
            debugLog('Encryption available: Development mode enabled');
            return true;
        }

        // Check if user has pro subscription
        const proEnabled = this.isProUser();
        debugLog(`Encryption available: Pro user status = ${proEnabled}`);
        return proEnabled;
    }

    /**
     * Checks if the user has a pro subscription
     * TODO: Implement actual subscription validation with LemonSqueezy
     * For now, this is a placeholder that returns false
     */
    private isProUser(): boolean {
        // TODO: Implement actual pro user validation
        // This will check against LemonSqueezy subscription status in the future
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        const proLicenseKey = config.get<string>('pro.licenseKey');

        // For now, return false - will be implemented with LemonSqueezy integration
        return !!proLicenseKey && proLicenseKey.length > 0;
    }

    /**
     * Checks if SecretStorage API is available
     */
    private isSecretStorageAvailable(): boolean {
        return !!this.context && !!this.context.secrets;
    }

    /**
     * Stores an API key securely using VSCode's SecretStorage
     * @param provider The AI provider name (e.g., 'openai', 'anthropic')
     * @param apiKey The API key to store securely
     */
    /**
     * Stores an API key securely and manages plain text storage based on user status
     */
    public async storeApiKey(provider: string, apiKey: string): Promise<void> {
        if (!this.isSecretStorageAvailable()) {
            throw new Error('Secure storage is not available in this VS Code version.');
        }

        const secretKey = `aiCommitAssistant.${provider}.apiKey`;
        const isProUser = this.isProUser();
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionAvailable = isProUser || devModeEnabled;

        // Get current encryption setting from configuration
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        const encryptionEnabled = config.get<boolean>('pro.encryptionEnabled', false);

        try {
            // Always store the key securely (as backup even for free users)
            await this.context!.secrets.store(secretKey, apiKey);
            debugLog(`API key stored securely for provider: ${provider}`);

            if (encryptionAvailable && encryptionEnabled) {
                // Pro users with encryption enabled: clear plain text and use secure storage
                await this.clearPlainTextApiKey(provider);
                debugLog(`Cleared plain text key for Pro user with encryption enabled: ${provider}`);
            } else {
                // Free users OR Pro users with encryption disabled: also store in plain text for accessibility
                await config.update(`${provider}.apiKey`, apiKey, vscode.ConfigurationTarget.Global);
                debugLog(`Stored key in both secure and plain text for ${encryptionAvailable ? 'Pro user with encryption disabled' : 'free user'}: ${provider}`);
            }

        } catch (error) {
            debugLog(`Failed to store API key for ${provider}:`, error);
            throw new Error(`Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieves an API key securely from VSCode's SecretStorage
     * @param provider The AI provider name
     * @returns The decrypted API key or undefined if not found
     * Gets an API key for a provider with robust logic:
     * - Always try secure storage first (keys are always encrypted)
     * - For Pro users: use secure storage and auto-migrate from plain text
     * - For free users: use plain text storage but keep secure keys as backup
     * - When encryption is enabled, returns a placeholder for UI display
     */
    public async getApiKey(provider: string, forDisplay: boolean = true): Promise<string | undefined> {
        if (!this.isSecretStorageAvailable()) {
            debugLog('Secret storage not available, falling back to plain text');
            return this.getPlainTextApiKey(provider);
        }

        const secretKey = `aiCommitAssistant.${provider}.apiKey`;
        const isProUser = this.isProUser();
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionAvailable = isProUser || devModeEnabled;

        // Get current encryption setting from configuration
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        const encryptionEnabled = config.get<boolean>('pro.encryptionEnabled', false);

        try {
            // Try to get the key from secure storage first
            const secureKey = await this.context!.secrets.get(secretKey);

            if (secureKey) {
                // We have a secure key
                if (encryptionAvailable && encryptionEnabled) {
                    // Pro user with encryption enabled: use secure key
                    debugLog(`Using secure API key for provider: ${provider}`);
                    
                    // If this is for display purposes (UI or settings.json), return the placeholder
                    if (forDisplay) {
                        return ENCRYPTED_KEY_PLACEHOLDER;
                    }
                    
                    // Otherwise return the actual key for API calls
                    return secureKey;
                } else {
                    // Free user or encryption disabled: use plain text but keep secure key as backup
                    const plainTextKey = this.getPlainTextApiKey(provider);
                    if (!plainTextKey) {
                        // If no plain text key exists but we have a secure key, restore it
                        // This happens when a user downgrades from Pro or disables encryption
                        debugLog(`Restoring API key from secure storage for provider: ${provider}`);
                        await this.restoreToPlainText(provider, secureKey);
                        return secureKey;
                    }
                    return plainTextKey;
                }
            } else {
                // No secure key exists, use plain text
                const plainTextKey = this.getPlainTextApiKey(provider);
                
                // If we're a pro user with encryption enabled and have a plain text key,
                // we should migrate it to secure storage
                if (plainTextKey && encryptionAvailable && encryptionEnabled) {
                    debugLog(`Auto-migrating API key to secure storage for provider: ${provider}`);
                    await this.storeApiKey(provider, plainTextKey);
                    
                    // Return placeholder for display if encryption is enabled
                    if (forDisplay) {
                        return ENCRYPTED_KEY_PLACEHOLDER;
                    }
                }
                
                return plainTextKey;
            }
        } catch (error) {
            debugLog(`Error retrieving API key for ${provider}:`, error);
            return this.getPlainTextApiKey(provider);
        }
    }
    
    /**
     * Gets the actual API key for internal use (API calls)
     * This always returns the real key, never a placeholder
     */
    public async getActualApiKey(provider: string): Promise<string | undefined> {
        return this.getApiKey(provider, false);
    }

    /**
     * Deletes an API key from secure storage
     * @param provider The AI provider name
     */
    public async deleteApiKey(provider: string): Promise<void> {
        if (!this.isSecretStorageAvailable()) {
            throw new Error('Secure storage is not available in this VS Code version.');
        }

        const secretKey = `aiCommitAssistant.${provider}.apiKey`;

        try {
            await this.context!.secrets.delete(secretKey);
            debugLog(`API key deleted for provider: ${provider}`);

            // Also clear plain text key
            await this.clearPlainTextApiKey(provider);

        } catch (error) {
            debugLog(`Failed to delete API key for ${provider}:`, error);
            throw new Error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Migrates existing plain text API keys to secure storage
     * This should be called during extension activation for pro users
     */
    /**
     * Migrates API keys based on current user status
     * This is the same as handleUserStatusChange but with different messaging
     */
    public async migrateToSecureStorage(): Promise<{ success: boolean; message: string; details?: string[] }> {
        debugLog('Starting API key migration process...');

        const result = await this.handleUserStatusChange();

        // Update the messaging to be more specific to manual migration
        if (result.success && result.details && result.details.length > 0) {
            const hasActualMigrations = result.details.some(detail => detail.includes('migrated') || detail.includes('restored'));
            if (hasActualMigrations) {
                return {
                    ...result,
                    message: result.message.replace('migrated', 'migrated via manual process')
                };
            }
        }

        return result;
    }

    /**
     * Migrate keys back to plain text storage (for when user downgrades from Pro)
     */
    public async migrateToPlainText(): Promise<{ success: boolean; message: string; details?: string[] }> {
        if (!this.context) {
            return { success: false, message: 'SecureKeyManager not initialized' };
        }

        try {
            const results: string[] = [];
            const config = vscode.workspace.getConfiguration('aiCommitAssistant');

            const providers = [
                'gemini', 'huggingface', 'mistral', 'cohere', 'openai',
                'together', 'openrouter', 'anthropic', 'deepseek', 'grok', 'perplexity'
            ];

            // Get all encrypted keys and move them back to plain text
            for (const provider of providers) {
                const keyName = `${provider}_api_key`;
                const encryptedKey = await this.context.secrets.get(keyName);

                if (encryptedKey) {
                    // Move to plain text storage
                    await config.update(`${provider}.apiKey`, encryptedKey, vscode.ConfigurationTarget.Global);
                    // Remove from encrypted storage
                    await this.context.secrets.delete(keyName);
                    results.push(`✓ ${provider.toUpperCase()} key moved to plain text storage`);
                    debugLog(`Migrated ${provider} key back to plain text storage`);
                }
            }

            // Disable encryption setting
            await config.update('pro.encryptionEnabled', false, vscode.ConfigurationTarget.Global);

            return {
                success: true,
                message: results.length > 0 ? 'API keys successfully moved to plain text storage' : 'No encrypted keys found to migrate',
                details: results
            };
        } catch (error) {
            debugLog('Error migrating to plain text:', error);
            return { success: false, message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    /**
     * Auto-migrate keys based on current user status
     */
    public async autoMigrateBasedOnUserStatus(): Promise<void> {
        const isCurrentlyPro = this.isProUser();
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionStatus = this.getEncryptionStatus();

        // If encryption was previously enabled but user is not pro (and not in dev mode), migrate back to plain text
        if (!isCurrentlyPro && !devModeEnabled) {
            const config = vscode.workspace.getConfiguration('aiCommitAssistant');
            const encryptionWasEnabled = config.get<boolean>('pro.encryptionEnabled', false);

            if (encryptionWasEnabled) {
                debugLog('User is no longer Pro but encryption is enabled. Auto-migrating to plain text...');
                try {
                    const result = await this.migrateToPlainText();
                    if (result.success) {
                        vscode.window.showInformationMessage(
                            `GitMind: API keys have been moved back to standard storage as you're no longer a Pro user. Your keys are safe and accessible. 🔓`
                        );
                    }
                } catch (error) {
                    debugLog('Failed to auto-migrate to plain text:', error);
                }
            }
        }
    }

    /**
     * Handles user status changes and migrates keys accordingly
     * Called when license key is added/removed
     */
    public async handleUserStatusChange(): Promise<{ success: boolean; message: string; details?: string[] }> {
        if (!this.isSecretStorageAvailable()) {
            return { success: false, message: 'VS Code SecretStorage not available' };
        }

        try {
            const providers = [
                'gemini', 'huggingface', 'mistral', 'cohere', 'openai',
                'together', 'openrouter', 'anthropic', 'deepseek', 'grok', 'perplexity'
            ];

            const isProUser = this.isProUser();
            const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
            const encryptionAvailable = isProUser || devModeEnabled;

            let migratedCount = 0;
            const results: string[] = [];

            for (const provider of providers) {
                try {
                    const secureKey = await this.context!.secrets.get(`aiCommitAssistant.${provider}.apiKey`);
                    const plainTextKey = this.getPlainTextApiKey(provider);

                    if (encryptionAvailable) {
                        // Became Pro: migrate plain text to secure, clear plain text
                        if (plainTextKey && !secureKey) {
                            await this.context!.secrets.store(`aiCommitAssistant.${provider}.apiKey`, plainTextKey);
                            await this.clearPlainTextApiKey(provider);
                            migratedCount++;
                            results.push(`✓ ${provider.toUpperCase()} key migrated to secure storage`);
                        } else if (plainTextKey && secureKey) {
                            // Both exist, clear plain text
                            await this.clearPlainTextApiKey(provider);
                            results.push(`✓ ${provider.toUpperCase()} plain text key cleared (secure version retained)`);
                        }
                    } else {
                        // Became Free: ensure plain text access while keeping secure backup
                        if (secureKey && !plainTextKey) {
                            await this.restoreToPlainText(provider, secureKey);
                            migratedCount++;
                            results.push(`✓ ${provider.toUpperCase()} key restored to plain text access`);
                        }
                    }
                } catch (error) {
                    debugLog(`Failed to handle status change for ${provider}:`, error);
                    results.push(`✗ ${provider.toUpperCase()} migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            const statusType = encryptionAvailable ? 'Pro' : 'Free';
            if (migratedCount > 0) {
                return {
                    success: true,
                    message: `Successfully migrated ${migratedCount} API keys for ${statusType} user`,
                    details: results
                };
            } else {
                return {
                    success: true,
                    message: `No API key migration needed for ${statusType} user`,
                    details: results.length > 0 ? results : [`All API keys are already properly configured for ${statusType} users`]
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            debugLog('Failed to handle user status change:', errorMessage);
            return { success: false, message: `Migration failed: ${errorMessage}` };
        }
    }

    /**
     * Handles encryption toggle - migrates keys between storage types
     */
    public async handleEncryptionToggle(enabled: boolean): Promise<{ success: boolean; message: string; details?: string[] }> {
        if (!this.isSecretStorageAvailable()) {
            return { success: false, message: 'VS Code SecretStorage not available' };
        }

        const isProUser = this.isProUser();
        const devModeEnabled = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const encryptionAvailable = isProUser || devModeEnabled;

        if (!encryptionAvailable) {
            return { success: false, message: 'Encryption not available for your account level' };
        }

        try {
            const providers = [
                'gemini', 'huggingface', 'mistral', 'cohere', 'openai',
                'together', 'openrouter', 'anthropic', 'deepseek', 'grok', 'perplexity'
            ];

            let migratedCount = 0;
            const results: string[] = [];

            for (const provider of providers) {
                try {
                    const secureKey = await this.context!.secrets.get(`aiCommitAssistant.${provider}.apiKey`);
                    const plainTextKey = this.getPlainTextApiKey(provider);

                    if (enabled) {
                        // Encryption turned ON: migrate from plain text to secure storage
                        if (plainTextKey && !secureKey) {
                            await this.context!.secrets.store(`aiCommitAssistant.${provider}.apiKey`, plainTextKey);
                            await this.clearPlainTextApiKey(provider);
                            migratedCount++;
                            results.push(`✓ ${provider.toUpperCase()} key migrated to secure storage`);
                        } else if (plainTextKey && secureKey) {
                            // Both exist, clear plain text and keep secure
                            await this.clearPlainTextApiKey(provider);
                            results.push(`✓ ${provider.toUpperCase()} plain text key cleared (secure version retained)`);
                        } else if (secureKey) {
                            results.push(`✓ ${provider.toUpperCase()} key already in secure storage`);
                        }
                    } else {
                        // Encryption turned OFF: migrate from secure to plain text storage
                        if (secureKey && !plainTextKey) {
                            await this.restoreToPlainText(provider, secureKey);
                            migratedCount++;
                            results.push(`✓ ${provider.toUpperCase()} key restored to plain text access`);
                        } else if (plainTextKey) {
                            results.push(`✓ ${provider.toUpperCase()} key already accessible in plain text`);
                        }
                    }
                } catch (error) {
                    debugLog(`Failed to handle encryption toggle for ${provider}:`, error);
                    results.push(`✗ ${provider.toUpperCase()} migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            const action = enabled ? 'enabled' : 'disabled';
            if (migratedCount > 0) {
                return {
                    success: true,
                    message: `Successfully ${action} encryption and migrated ${migratedCount} API keys`,
                    details: results
                };
            } else {
                return {
                    success: true,
                    message: `Encryption ${action} - no key migration needed`,
                    details: results.length > 0 ? results : [`All API keys are already properly configured for encryption ${action}`]
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            debugLog('Failed to handle encryption toggle:', errorMessage);
            return { success: false, message: `Encryption toggle failed: ${errorMessage}` };
        }
    }

    /**
     * Gets API key from plain text VSCode settings (fallback for non-pro users)
     */
    private getPlainTextApiKey(provider: string): string | undefined {
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        return config.get<string>(`${provider}.apiKey`);
    }

    /**
     * Clears API key from plain text VSCode settings
     */
    private async clearPlainTextApiKey(provider: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiCommitAssistant');
        await config.update(`${provider}.apiKey`, undefined, vscode.ConfigurationTarget.Global);
        debugLog(`Cleared plain text API key for provider: ${provider}`);
    }

    /**
     * Checks if a provider has an API key (either secure or plain text)
     */
    public async hasApiKey(provider: string): Promise<boolean> {
        const apiKey = await this.getApiKey(provider);
        return !!apiKey && apiKey.trim().length > 0;
    }

    /**
     * Lists all providers that have stored API keys
     */
    public async getProvidersWithKeys(): Promise<string[]> {
        const providers = [
            'gemini', 'huggingface', 'mistral', 'cohere', 'openai',
            'together', 'openrouter', 'anthropic', 'deepseek', 'grok', 'perplexity'
        ];

        const providersWithKeys: string[] = [];

        for (const provider of providers) {
            if (await this.hasApiKey(provider)) {
                providersWithKeys.push(provider);
            }
        }

        return providersWithKeys;
    }

    /**
     * Gets encryption status for the UI
     */
    public getEncryptionStatus(): {
        available: boolean;
        enabled: boolean;
        reason: string;
    } {
        const devMode = process.env.GITMIND_ENCRYPTION_DEV_MODE === 'true';
        const isProUser = this.isProUser();
        const secretStorageAvailable = this.isSecretStorageAvailable();

        if (devMode) {
            return {
                available: true,
                enabled: secretStorageAvailable,
                reason: 'Development mode enabled'
            };
        }

        if (isProUser) {
            return {
                available: true,
                enabled: secretStorageAvailable,
                reason: secretStorageAvailable ? 'Pro user with secure storage' : 'Pro user - VS Code SecretStorage unavailable'
            };
        }

        return {
            available: false,
            enabled: false,
            reason: 'Upgrade to GitMind Pro for encrypted API key storage'
        };
    }

    /**
     * Restores a key from secure storage back to plain text (for downgraded users)
     */
    private async restoreToPlainText(provider: string, secureKey: string): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('aiCommitAssistant');
            await config.update(`${provider}.apiKey`, secureKey, vscode.ConfigurationTarget.Global);
            debugLog(`Restored API key to plain text for provider: ${provider}`);
        } catch (error) {
            debugLog(`Failed to restore API key to plain text for ${provider}:`, error);
            throw error;
        }
    }
}
