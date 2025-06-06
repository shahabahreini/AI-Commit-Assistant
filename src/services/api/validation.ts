import * as vscode from "vscode";
import { debugLog } from "../debug/logger";
import { validateGeminiAPIKey } from "./gemini";
import { getApiConfig } from "../../config/settings";
import { ApiConfig, MistralRateLimit, ApiProvider } from "../../config/types";
import { RequestManager } from "../../utils/requestManager";
import { isCopilotAvailable, validateCopilotAccess } from "./copilot";

interface ApiCheckResult {
    success: boolean;
    provider: string;
    model?: string;
    responseTime?: number;
    details?: string;
    error?: string;
    troubleshooting?: string;
}

interface RateLimitsCheckResult {
    success: boolean;
    limits?: {
        reset: number;
        limit: number;
        remaining: number;
        queryCost: number;
    };
    notes?: string;
    error?: string;
}


// In src/services/api/validation.ts
export async function checkApiSetup(): Promise<ApiCheckResult> {
    const config: ApiConfig = getApiConfig();
    let result: ApiCheckResult = {
        success: false,
        provider: config.type,
        details: '',
    };

    try {
        switch (config.type) {
            case "gemini":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your Gemini API key in the settings";
                } else {
                    const isValid = await validateGeminiAPIKey(config.apiKey);
                    result.success = isValid;
                    if (isValid) {
                        result.model = config.model || "gemini-2.5-flash-preview-04-17";
                        result.responseTime = 500; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your Gemini API key configuration";
                    }
                }
                break;

            case "mistral":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your Mistral API key in the settings";
                } else {
                    const rateLimits = await checkMistralRateLimits(config.apiKey);
                    result.success = !!rateLimits;
                    if (rateLimits) {
                        result.model = config.model;
                        result.responseTime = 500; // Placeholder value
                        result.details = `Remaining requests: ${rateLimits.current.remaining}`;
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your Mistral API key configuration";
                    }
                }
                break;

            case "huggingface":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your Hugging Face API key in the settings";
                } else {
                    const isValid = await validateHuggingFaceApiKey(config.apiKey);
                    result.success = isValid;
                    if (isValid) {
                        result.model = config.model || "";
                        result.responseTime = 600; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your Hugging Face API key configuration";
                    }
                }
                break;

            case "ollama":
                const isAvailable = await checkOllamaAvailability(config.url || "http://localhost:11434");
                result.success = isAvailable;
                if (isAvailable) {
                    result.model = config.model || "";
                    result.responseTime = 200; // Placeholder value for local service
                    result.details = "Ollama service is running and accessible";
                } else {
                    result.error = "Service not available";
                    result.troubleshooting = "Please check if Ollama is running and accessible at the configured URL";
                }
                break;

            case "cohere":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your Cohere API key in the settings";
                } else {
                    const isValid = await validateCohereApiKey(config.apiKey);
                    result.success = isValid;
                    if (isValid) {
                        result.model = config.model || "command";
                        result.responseTime = 550; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your Cohere API key configuration";
                    }
                }
                break;

            case "openai":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your OpenAI API key in the settings";
                } else {
                    const isValid = await validateOpenAIApiKey(config.apiKey);
                    result.success = isValid;
                    if (isValid) {
                        result.model = config.model || "gpt-3.5-turbo";
                        result.responseTime = 550; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your OpenAI API key configuration";
                    }
                }
                break;

            case "together":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your Together AI API key in the settings";
                } else {
                    const isValid = await validateTogetherApiKey(config.apiKey);
                    result.success = isValid;
                    if (isValid) {
                        result.model = config.model || "meta-llama/Llama-3.3-70B-Instruct-Turbo";
                        result.responseTime = 550; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your Together AI API key configuration";
                    }
                }
                break;

            case "openrouter":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your OpenRouter API key in the settings";
                } else {
                    const isValid = await validateOpenRouterApiKey(config.apiKey);
                    result.success = isValid;
                    if (isValid) {
                        result.model = config.model || "default model";
                        result.responseTime = 550; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = "Invalid API key";
                        result.troubleshooting = "Please check your OpenRouter API key configuration";
                    }
                }
                break;

            case "anthropic":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.troubleshooting = "Please enter your Anthropic API key in the settings";
                } else {
                    const validation = await validateAnthropicApiKey(config.apiKey);
                    result.success = validation.success;
                    if (validation.success) {
                        result.model = config.model || "claude-3-5-sonnet-20241022";
                        result.responseTime = 800; // Placeholder value
                        result.details = "Connection test successful";
                    } else {
                        result.error = validation.error || "Invalid API key";
                        result.troubleshooting = validation.troubleshooting || "Please check your API key configuration";
                    }
                }
                break;

            case "copilot":
                const isCopilotReady = await isCopilotAvailable();
                if (isCopilotReady) {
                    const accessResult = await validateCopilotAccess();
                    result.success = accessResult.success;
                    if (accessResult.success) {
                        result.model = config.model || "gpt-4o";
                        result.responseTime = 400; // Placeholder value for VS Code API
                        result.details = "GitHub Copilot is available and authenticated";
                    } else {
                        result.error = accessResult.error || "Copilot access validation failed";
                        result.troubleshooting = "Please ensure you're signed in to GitHub Copilot and have an active subscription";
                    }
                } else {
                    result.error = "GitHub Copilot not available";
                    result.troubleshooting = "Please install and authenticate GitHub Copilot extension";
                }
                break;
        }

        return result;
    } catch (error) {
        debugLog("API setup check error:", error);
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
        result.troubleshooting = "An unexpected error occurred during the API check";
        return result;
    }
}

export async function checkRateLimits(): Promise<RateLimitsCheckResult> {
    const config: ApiConfig = getApiConfig();
    let result: RateLimitsCheckResult = {
        success: false
    };

    try {
        switch (config.type) {
            case "mistral":
                if (!config.apiKey) {
                    result.error = "API key not configured";
                    result.notes = "Please configure your Mistral API key";
                } else {
                    const rateLimits = await checkMistralRateLimits(config.apiKey);
                    if (rateLimits) {
                        result.success = true;
                        result.limits = {
                            reset: rateLimits.current.reset,
                            limit: rateLimits.current.limit,
                            remaining: rateLimits.current.remaining,
                            queryCost: rateLimits.current.queryCost
                        };
                        // Add warning about rate limit checks affecting quota
                        result.notes = `Rate limits retrieved successfully. Note: Checking rate limits consumes API tokens (${rateLimits.current.queryCost} tokens for this request).`;
                    } else {
                        result.error = "Failed to retrieve rate limits";
                        result.notes = "Please check your API key and try again";
                    }
                }
                break;

            case "gemini":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                    limit: 60,
                    remaining: 50,
                    queryCost: 1
                };
                result.notes = "Gemini provides quota-based rate limits rather than time-based limits";
                break;

            case "huggingface":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                    limit: 30000,
                    remaining: 29000,
                    queryCost: 1
                };
                result.notes = "Hugging Face rate limits depend on your account tier";
                break;

            case "ollama":
                result.success = true;
                result.notes = "Ollama is a local service with no API rate limits";
                break;

            case "cohere":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                    limit: 100,
                    remaining: 90,
                    queryCost: 1
                };
                result.notes = "Cohere rate limits depend on your account tier and model";
                break;

            case "openai":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                    limit: 200,
                    remaining: 180,
                    queryCost: 1
                };
                result.notes = "OpenAI rate limits depend on your account tier and model";
                break;

            case "together":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                    limit: 100,
                    remaining: 90,
                    queryCost: 1
                };
                result.notes = "Together AI rate limits depend on your account tier and model";
                break;

            case "openrouter":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                    limit: 100,
                    remaining: 90,
                    queryCost: 1
                };
                result.notes = "OpenRouter rate limits depend on your account tier and selected model";
                break;

            case "anthropic":
                result.success = true;
                result.limits = {
                    reset: Math.floor(Date.now() / 1000) + 3600,
                    limit: 1000,
                    remaining: 950,
                    queryCost: 1
                };
                result.notes = "Rate limits depend on your account tier and model usage";
                break;

            case "copilot":
                result.success = true;
                result.notes = "GitHub Copilot uses VS Code's built-in rate limiting and does not expose specific rate limit information";
                break;

            default:
                result.success = false;
                // Fix: Remove the type assertion and use string interpolation with the known config.type
                result.notes = "Rate limits not available for this provider";
                break;
        }
    } catch (error) {
        debugLog("Rate limits check error:", error);
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
        result.notes = "An unexpected error occurred while checking rate limits";
    }

    return result;
}

async function validateHuggingFaceApiKey(apiKey: string): Promise<boolean> {
    const requestManager = RequestManager.getInstance();
    const controller = requestManager.getController();

    try {
        const response = await fetch("https://huggingface.co/api/models?limit=1", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            signal: controller.signal
        });

        return response.ok;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return false;
        }
        debugLog("Hugging Face API validation error:", error);
        return false;
    }
}

async function validateOpenAIApiKey(apiKey: string): Promise<boolean> {
    const requestManager = RequestManager.getInstance();
    const controller = requestManager.getController();

    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            signal: controller.signal
        });

        return response.ok;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return false;
        }
        debugLog("OpenAI API validation error:", error);
        return false;
    }
}

interface RateLimitComparison {
    current: MistralRateLimit;
    previous?: MistralRateLimit;
    anomalies: string[];
}

let lastRateLimit: MistralRateLimit | null = null;

async function checkMistralRateLimits(apiKey: string): Promise<RateLimitComparison | null> {
    const requestManager = RequestManager.getInstance();
    const controller = requestManager.getController();

    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 1
            }),
            signal: controller.signal
        });

        const headers = response.headers;
        const currentRateLimit: MistralRateLimit = {
            reset: parseInt(headers.get('ratelimitbysize-reset') || '0'),
            limit: parseInt(headers.get('ratelimitbysize-limit') || '0'),
            remaining: parseInt(headers.get('ratelimitbysize-remaining') || '0'),
            queryCost: parseInt(headers.get('ratelimitbysize-query-cost') || '0'),
            monthlyLimit: parseInt(headers.get('x-ratelimitbysize-limit-month') || '0'),
            monthlyRemaining: parseInt(headers.get('x-ratelimitbysize-remaining-month') || '0'),
            minuteLimit: parseInt(headers.get('x-ratelimitbysize-limit-minute') || '0'),
            minuteRemaining: parseInt(headers.get('x-ratelimitbysize-remaining-minute') || '0'),
            timestamp: Date.now()
        };

        // Detect anomalies
        const anomalies: string[] = [];

        if (lastRateLimit) {
            // Check if remaining tokens didn't decrease as expected
            const expectedRemaining = lastRateLimit.remaining - currentRateLimit.queryCost;
            if (currentRateLimit.remaining > expectedRemaining) {
                anomalies.push(`Remaining tokens higher than expected: ${currentRateLimit.remaining} vs expected ${expectedRemaining}`);
            }

            // Check if monthly remaining increased
            if (currentRateLimit.monthlyRemaining > lastRateLimit.monthlyRemaining) {
                const increase = currentRateLimit.monthlyRemaining - lastRateLimit.monthlyRemaining;
                anomalies.push(`Monthly remaining increased by ${increase} tokens`);
            }

            // Check if reset time is inconsistent
            const timeDiff = (currentRateLimit.timestamp - lastRateLimit.timestamp) / 1000;
            const resetDiff = lastRateLimit.reset - currentRateLimit.reset;
            if (Math.abs(resetDiff - timeDiff) > 5) { // 5 second tolerance
                anomalies.push(`Reset timer inconsistency: expected ~${Math.round(timeDiff)}s, got ${resetDiff}s`);
            }
        }

        const result: RateLimitComparison = {
            current: currentRateLimit,
            previous: lastRateLimit || undefined,
            anomalies
        };

        // Store for next comparison
        lastRateLimit = currentRateLimit;

        return result;

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return null;
        }
        debugLog("Mistral rate limit check error:", error);
        return null;
    }
}

async function checkOllamaAvailability(url: string): Promise<boolean> {
    try {
        const response = await fetch(`${url}/api/version`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        return response.ok;
    } catch (error) {
        debugLog("Ollama availability check error:", error);
        return false;
    }
}

async function validateCohereApiKey(apiKey: string): Promise<boolean> {
    try {
        // Use Cohere's API to validate the key with a minimal request
        const response = await fetch("https://api.cohere.ai/v1/tokenize", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: "test" // Minimal text to tokenize
            })
        });

        // If we get a successful response, the API key is valid
        return response.ok;
    } catch (error) {
        debugLog("Cohere API validation error:", error);
        return false;
    }
}

async function validateTogetherApiKey(apiKey: string): Promise<boolean> {
    try {
        // Use a lightweight endpoint to validate the API key
        const response = await fetch("https://api.together.xyz/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        // If we get a successful response, the API key is valid
        return response.ok;
    } catch (error) {
        debugLog("Together API validation error:", error);
        return false;
    }
}

async function validateOpenRouterApiKey(apiKey: string): Promise<boolean> {
    try {
        // Use a lightweight endpoint to validate the API key
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://github.com/shahabahreini/AI-Commit-Assistant",
                "X-Title": "GitMind: AI Commit Assistant"
            }
        });

        // If we get a successful response, the API key is valid
        return response.ok;
    } catch (error) {
        debugLog("OpenRouter API validation error:", error);
        return false;
    }
}

async function validateAnthropicApiKey(apiKey: string): Promise<{ success: boolean; error?: string; troubleshooting?: string }> {
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
                "anthropic-beta": "messages-2023-12-15"
            },
            body: JSON.stringify({
                model: "claude-3-5-haiku-20241022",
                max_tokens: 10,
                messages: [
                    {
                        role: "user",
                        content: "Test"
                    }
                ]
            })
        });

        if (response.ok) {
            return { success: true };
        }

        // Handle error responses
        const errorText = await response.text();
        debugLog(`Anthropic API validation error: ${response.status} ${errorText}`);

        let errorMessage = `Anthropic API error: ${response.status}`;
        let errorType = '';
        let troubleshooting = "Please check your API key configuration";

        try {
            const errorData = JSON.parse(errorText);
            // Handle Anthropic API error structure: { "error": { "message": "...", "type": "..." }, "type": "error" }
            if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
                errorType = errorData.error.type || '';
            }
            // Fallback: check if there's a direct message field
            else if (errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (parseError) {
            // If we can't parse the error, use the raw text
            errorMessage = errorText || errorMessage;
        }

        // Provide specific troubleshooting based on error type and status
        if (response.status === 401) {
            // Invalid API key
            troubleshooting = "Please check that your Anthropic API key is correct and active";
        } else if (response.status === 403) {
            // Insufficient credits or permissions
            if (errorMessage.toLowerCase().includes('credit') || errorMessage.toLowerCase().includes('balance')) {
                troubleshooting = "Your Anthropic account has insufficient credits. Please add credits to your account";
            } else {
                troubleshooting = "Your API key may not have the required permissions. Please check your Anthropic account settings";
            }
        } else if (response.status === 429) {
            // Rate limit exceeded
            const retryAfter = response.headers.get('retry-after');
            if (retryAfter) {
                troubleshooting = `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying`;
            } else {
                troubleshooting = "Rate limit exceeded. Please try again in a few minutes";
            }
        } else if (response.status === 400 && errorType === 'invalid_request_error') {
            troubleshooting = "The request format is invalid. This may indicate an API compatibility issue";
        }

        return {
            success: false,
            error: errorMessage,
            troubleshooting: troubleshooting
        };

    } catch (error) {
        debugLog("Anthropic API validation network error:", error);
        return {
            success: false,
            error: "Network error while validating API key",
            troubleshooting: "Please check your internet connection and try again"
        };
    }
}
