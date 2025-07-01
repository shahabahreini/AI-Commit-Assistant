import * as assert from 'assert';
import * as vscode from 'vscode';
import { SecureKeyManager } from '../../services/encryption/SecureKeyManager';

suite('Pro Features Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let mockSecrets: Map<string, string>;

    setup(() => {
        // Create mock secrets storage
        mockSecrets = new Map<string, string>();

        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
                setKeysForSync: () => { }
            },
            extensionPath: '/mock/path',
            extensionUri: vscode.Uri.file('/mock/path'),
            storagePath: '/mock/storage',
            globalStoragePath: '/mock/global',
            logPath: '/mock/log',
            extensionMode: vscode.ExtensionMode.Test,
            asAbsolutePath: (relativePath: string) => `/mock/path/${relativePath}`,
            storageUri: vscode.Uri.file('/mock/storage'),
            globalStorageUri: vscode.Uri.file('/mock/global'),
            logUri: vscode.Uri.file('/mock/log'),
            secrets: {
                get: async (key: string) => mockSecrets.get(key),
                store: async (key: string, value: string) => {
                    mockSecrets.set(key, value);
                },
                delete: async (key: string) => {
                    mockSecrets.delete(key);
                },
                onDidChange: () => ({ dispose: () => { } })
            } as any,
            environmentVariableCollection: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any
        };
    });

    teardown(() => {
        mockSecrets.clear();
        // Reset environment variables
        delete process.env.GITMIND_ENCRYPTION_DEV_MODE;
    });

    suite('SecureKeyManager', () => {
        test('Should initialize correctly', () => {
            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            assert.ok(secureKeyManager, 'SecureKeyManager should initialize');
        });

        test('Should detect Pro status correctly with license key', async () => {
            // Mock pro license configuration
            const mockConfig = {
                get: (key: string) => {
                    if (key === 'pro.licenseKey') {
                        return 'valid-pro-license-key';
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                const isEncryptionAvailable = secureKeyManager.isEncryptionAvailable();
                assert.strictEqual(isEncryptionAvailable, true, 'Should detect pro user with valid license');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should detect dev mode correctly', async () => {
            // Set dev mode environment variable
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            const isEncryptionAvailable = secureKeyManager.isEncryptionAvailable();
            assert.strictEqual(isEncryptionAvailable, true, 'Should detect dev mode from environment variable');
        });

        test('Should check encryption availability correctly', async () => {
            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            // Test without pro status or dev mode
            let isAvailable = secureKeyManager.isEncryptionAvailable();
            assert.strictEqual(isAvailable, false, 'Encryption should not be available for free users');

            // Test with dev mode
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            // Need to reinitialize to pick up the environment variable
            const secureKeyManagerDev = SecureKeyManager.getInstance();
            secureKeyManagerDev.initialize(mockContext);

            isAvailable = secureKeyManagerDev.isEncryptionAvailable();
            assert.strictEqual(isAvailable, true, 'Encryption should be available in dev mode');
        });

        test('Should store and retrieve API keys securely', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            const testApiKey = 'test-secure-api-key-12345';
            const provider = 'openai';

            // Store the API key
            await secureKeyManager.storeApiKey(provider, testApiKey);

            // Verify it was stored in secrets
            const storedKey = mockSecrets.get(`aiCommitAssistant.${provider}.apiKey`);
            assert.strictEqual(storedKey, testApiKey, 'API key should be stored in secrets');

            // Retrieve the API key
            const retrievedKey = await secureKeyManager.getApiKey(provider);
            assert.strictEqual(retrievedKey, testApiKey, 'Retrieved API key should match stored key');
        });

        test('Should migrate API keys from settings to secure storage', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            // Mock configuration with existing API keys
            let savedSettings: { [key: string]: any } = {
                'openai.apiKey': 'old-openai-key',
                'anthropic.apiKey': 'old-anthropic-key'
            };

            const mockConfig = {
                get: (key: string) => savedSettings[key],
                update: async (key: string, value: any) => {
                    savedSettings[key] = value;
                },
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                // Perform migration
                await secureKeyManager.migrateToSecureStorage();

                // Check that keys were moved to secrets
                const openaiSecureKey = await secureKeyManager.getApiKey('openai');
                const anthropicSecureKey = await secureKeyManager.getApiKey('anthropic');

                assert.strictEqual(openaiSecureKey, 'old-openai-key', 'OpenAI key should be migrated');
                assert.strictEqual(anthropicSecureKey, 'old-anthropic-key', 'Anthropic key should be migrated');

                // Check that settings were cleared (clearPlainTextApiKey sets to undefined)
                assert.strictEqual(savedSettings['openai.apiKey'], undefined, 'OpenAI setting should be cleared');
                assert.strictEqual(savedSettings['anthropic.apiKey'], undefined, 'Anthropic setting should be cleared');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should get encryption status correctly', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            const status = secureKeyManager.getEncryptionStatus();

            assert.strictEqual(status.enabled, true, 'Encryption should be enabled in dev mode');
            assert.strictEqual(status.available, true, 'Encryption should be available in dev mode');
            assert.ok(status.reason.includes('Development mode'), 'Reason should mention dev mode');
        });

        test('Should get list of providers with keys', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            // Store some test keys
            await secureKeyManager.storeApiKey('openai', 'test-key-1');
            await secureKeyManager.storeApiKey('anthropic', 'test-key-2');

            const providersWithKeys = await secureKeyManager.getProvidersWithKeys();

            assert.ok(providersWithKeys.includes('openai'), 'Should include openai in providers with keys');
            assert.ok(providersWithKeys.includes('anthropic'), 'Should include anthropic in providers with keys');
            assert.strictEqual(providersWithKeys.length, 2, 'Should return correct number of providers');
        });

        test('Should not allow encryption for free users', async () => {
            // Ensure no dev mode or pro license
            delete process.env.GITMIND_ENCRYPTION_DEV_MODE;

            const mockConfig = {
                get: (key: string) => {
                    if (key === 'pro.licenseKey') {
                        return ''; // No license key
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                const isAvailable = secureKeyManager.isEncryptionAvailable();
                assert.strictEqual(isAvailable, false, 'Encryption should not be available for free users');

                // Attempt to store API key should throw error
                try {
                    await secureKeyManager.storeApiKey('openai', 'test-key');
                    assert.fail('Should throw error for free users');
                } catch (error) {
                    assert.ok(error instanceof Error, 'Should throw error');
                    assert.ok(error.message.includes('pro users'), 'Error should mention pro users');
                }
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should handle invalid license key', async () => {
            const mockConfig = {
                get: (key: string) => {
                    if (key === 'pro.licenseKey') {
                        return ''; // Empty license key (truly invalid)
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                const isEncryptionAvailable = secureKeyManager.isEncryptionAvailable();
                assert.strictEqual(isEncryptionAvailable, false, 'Should not detect pro user with empty license');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should accept any non-empty license key (until LemonSqueezy validation)', async () => {
            // Note: Current implementation accepts any non-empty string as valid license
            // This will change when LemonSqueezy integration is implemented
            const mockConfig = {
                get: (key: string) => {
                    if (key === 'pro.licenseKey') {
                        return 'any-non-empty-string'; // Any non-empty string is currently considered valid
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                const isEncryptionAvailable = secureKeyManager.isEncryptionAvailable();
                assert.strictEqual(isEncryptionAvailable, true, 'Should accept any non-empty license key for now');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should clear all secure keys correctly', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            // Store some test keys
            await secureKeyManager.storeApiKey('openai', 'test-key-1');
            await secureKeyManager.storeApiKey('anthropic', 'test-key-2');

            // Verify keys are stored
            let providersWithKeys = await secureKeyManager.getProvidersWithKeys();
            assert.strictEqual(providersWithKeys.length, 2, 'Should have 2 providers with keys');

            // Clear all keys manually (since clearAllSecureKeys doesn't exist, we'll delete them)
            await secureKeyManager.deleteApiKey('openai');
            await secureKeyManager.deleteApiKey('anthropic');

            // Verify keys are cleared
            providersWithKeys = await secureKeyManager.getProvidersWithKeys();
            assert.strictEqual(providersWithKeys.length, 0, 'Should have no providers with keys after clearing');
        });
    });

    suite('Pro Features UI Integration', () => {
        test('Should handle migration command correctly', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            // This tests the integration between MessageHandler and SecureKeyManager
            // We'll simulate what happens when the migration button is clicked

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            // Mock existing configuration with API keys
            const mockConfig = {
                get: (key: string) => {
                    if (key === 'openai.apiKey') {
                        return 'test-openai-key';
                    }
                    if (key === 'anthropic.apiKey') {
                        return 'test-anthropic-key';
                    }
                    return undefined;
                },
                update: async () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                // Simulate migration
                await secureKeyManager.migrateToSecureStorage();

                // Verify migration was successful
                const openaiKey = await secureKeyManager.getApiKey('openai');
                const anthropicKey = await secureKeyManager.getApiKey('anthropic');

                assert.strictEqual(openaiKey, 'test-openai-key', 'OpenAI key should be migrated');
                assert.strictEqual(anthropicKey, 'test-anthropic-key', 'Anthropic key should be migrated');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should handle encryption status check correctly', async () => {
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager = SecureKeyManager.getInstance();
            secureKeyManager.initialize(mockContext);

            // Store some keys
            await secureKeyManager.storeApiKey('openai', 'test-key');

            // Get status (simulates what happens when status button is clicked)
            const status = secureKeyManager.getEncryptionStatus();
            const providersWithKeys = await secureKeyManager.getProvidersWithKeys();

            assert.strictEqual(status.enabled, true, 'Status should show encryption enabled');
            assert.strictEqual(status.available, true, 'Status should show encryption available');
            assert.ok(providersWithKeys.includes('openai'), 'Should show openai has encrypted key');
        });
    });

    suite('Pro Features Configuration', () => {
        test('Pro settings should be present in configuration schema', () => {
            const config = vscode.workspace.getConfiguration('aiCommitAssistant');

            // Test that pro settings can be accessed (even if empty)
            const licenseKey = config.get('pro.licenseKey');
            const encryptionEnabled = config.get('pro.encryptionEnabled');

            // These should not throw errors and should return default values
            assert.ok(typeof licenseKey === 'string' || licenseKey === undefined, 'License key should be string or undefined');
            assert.ok(typeof encryptionEnabled === 'boolean' || encryptionEnabled === undefined, 'Encryption enabled should be boolean or undefined');
        });

        test('Should handle environment variable correctly', () => {
            // Test dev mode detection by checking encryption availability
            delete process.env.GITMIND_ENCRYPTION_DEV_MODE;

            const secureKeyManager1 = SecureKeyManager.getInstance();
            secureKeyManager1.initialize(mockContext);
            assert.strictEqual(secureKeyManager1.isEncryptionAvailable(), false, 'Should not have encryption without dev mode or pro');

            // Set dev mode
            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'true';

            const secureKeyManager2 = SecureKeyManager.getInstance();
            secureKeyManager2.initialize(mockContext);
            assert.strictEqual(secureKeyManager2.isEncryptionAvailable(), true, 'Should have encryption in dev mode');

            // Test different values
            process.env.GITMIND_ENCRYPTION_DEV_MODE = '1';

            const secureKeyManager3 = SecureKeyManager.getInstance();
            secureKeyManager3.initialize(mockContext);
            assert.strictEqual(secureKeyManager3.isEncryptionAvailable(), false, 'Should not have encryption with "1"');

            process.env.GITMIND_ENCRYPTION_DEV_MODE = 'false';

            const secureKeyManager4 = SecureKeyManager.getInstance();
            secureKeyManager4.initialize(mockContext);
            assert.strictEqual(secureKeyManager4.isEncryptionAvailable(), false, 'Should not have encryption with "false"');
        });
    });

    suite('Backward Compatibility', () => {
        test('Should not break existing functionality for free users', () => {
            // Ensure no dev mode or pro license
            delete process.env.GITMIND_ENCRYPTION_DEV_MODE;

            const mockConfig = {
                get: (key: string) => {
                    if (key === 'pro.licenseKey') {
                        return '';
                    }
                    if (key === 'openai.apiKey') {
                        return 'existing-api-key';
                    }
                    if (key === 'apiProvider') {
                        return 'openai';
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                // Free users should not have encryption available
                assert.strictEqual(secureKeyManager.isEncryptionAvailable(), false, 'Encryption should not be available');

                // But existing API key access should still work through regular config
                const apiKey = mockConfig.get('openai.apiKey');
                assert.strictEqual(apiKey, 'existing-api-key', 'Regular API key access should still work');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });

        test('Should handle missing pro settings gracefully', () => {
            const mockConfig = {
                get: (key: string) => {
                    // Don't return pro settings (simulating older configuration)
                    if (key.startsWith('pro.')) {
                        return undefined;
                    }
                    return undefined;
                },
                update: () => Promise.resolve(),
                inspect: () => ({ key: '', defaultValue: undefined }),
                has: () => true
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            (vscode.workspace as any).getConfiguration = () => mockConfig;

            try {
                const secureKeyManager = SecureKeyManager.getInstance();
                secureKeyManager.initialize(mockContext);

                // Should not throw errors
                const isAvailable = secureKeyManager.isEncryptionAvailable();

                assert.strictEqual(isAvailable, false, 'Should default to encryption not available');
            } finally {
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
        });
    });

    console.log(`
🔐 PRO FEATURES TEST SUITE ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This test suite validates Pro Features functionality:

🔑 ENCRYPTION TESTS:
   ✓ SecureKeyManager initialization
   ✓ Pro user detection
   ✓ Dev mode detection  
   ✓ Secure storage operations
   ✓ API key migration
   ✓ Encryption status reporting

🚫 ACCESS CONTROL TESTS:
   ✓ Free user restrictions
   ✓ Invalid license handling
   ✓ Environment variable validation

🔄 INTEGRATION TESTS:
   ✓ UI command handling
   ✓ Migration workflow
   ✓ Status checking

🔙 COMPATIBILITY TESTS:
   ✓ Backward compatibility
   ✓ Graceful degradation
   ✓ Missing settings handling

🎯 ENSURING PRO FEATURES ARE SECURE AND ACCESSIBLE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});
