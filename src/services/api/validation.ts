import * as vscode from "vscode";
import { debugLog } from "../debug/logger";
import { validateGeminiAPIKey } from "./gemini";
import { getApiConfig } from "../../config/settings";
import { ApiConfig, MistralRateLimit, ApiProvider } from "../../config/types";

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
                        result.model = config.model || "gemini-2.0-flash";
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
                        result.details = `Remaining requests: ${rateLimits.remaining}`;
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
                        result.limits = rateLimits;
                        // Add warning about rate limit checks affecting quota
                        result.notes = `Rate limits retrieved successfully. Note: Checking rate limits consumes API tokens (${rateLimits.queryCost} tokens for this request).`;
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
    try {
        // Use the models endpoint which requires authentication
        const response = await fetch("https://huggingface.co/api/models?limit=1", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
        });

        // If we get a successful response, the API key is valid
        return response.ok;
    } catch (error) {
        debugLog("Hugging Face API validation error:", error);
        return false;
    }
}



async function checkMistralRateLimits(apiKey: string): Promise<MistralRateLimit | null> {
    try {
        // Send a minimal request to get rate limits from headers
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "mistral-tiny",  // Use the smallest model to minimize token usage
                messages: [{ role: "user", content: "Hello" }]  // Minimal prompt
            })
        });

        if (!response.ok) {
            return null;
        }

        // Extract rate limit information from headers
        return {
            reset: parseInt(response.headers.get('ratelimitbysize-reset') || '0'),
            limit: parseInt(response.headers.get('ratelimitbysize-limit') || '0'),
            remaining: parseInt(response.headers.get('ratelimitbysize-remaining') || '0'),
            queryCost: parseInt(response.headers.get('ratelimitbysize-query-cost') || '0'),
<<<<<<< HEAD
            monthlyLimit: parseInt(response.headers.get('ratelimitbysize-monthly-limit') || '0'),
            monthlyRemaining: parseInt(response.headers.get('ratelimitbysize-monthly-remaining') || '0')
=======
            monthlyLimit: parseInt(response.headers.get('x-ratelimitbysize-limit-month') || '0'),
            monthlyRemaining: parseInt(response.headers.get('x-ratelimitbysize-remaining-month') || '0')
>>>>>>> 21c43f784307392313d40cc19bbf664f96494e4c
        };
    } catch (error) {
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
