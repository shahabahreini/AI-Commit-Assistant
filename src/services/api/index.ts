// src/services/api/index.ts
import * as vscode from "vscode";
import { ApiConfig } from "../../config/types";
import { callGeminiAPI } from "./gemini";
import { callHuggingFaceAPI } from "./huggingface";
import { callOllamaAPI } from "./ollama";
import { checkOllamaAvailability, getOllamaInstallInstructions } from "../../utils/ollamaHelper";
import { debugLog } from "../debug/logger";

export async function generateCommitMessage(config: ApiConfig, diff: string): Promise<string> {
    try {
        switch (config.type) {
            case "gemini":
                if (!config.apiKey) {
                    throw new Error("Gemini API key not configured. Please add your API key in the extension settings.");
                }
                return await callGeminiAPI(config.apiKey, diff);

            case "huggingface":
                if (!config.apiKey) {
                    throw new Error("Hugging Face API key not configured. Please add your API key in the extension settings.");
                }
                if (!config.model) {
                    throw new Error("Hugging Face model not specified. Please select a model in the extension settings.");
                }
                return await callHuggingFaceAPI(config.apiKey, config.model, diff);

            case "ollama":
                if (!config.ollamaUrl) {
                    throw new Error("Ollama URL not configured. Please check the extension settings.");
                }
                if (!config.model) {
                    throw new Error("Ollama model not specified. Please select a model in the extension settings.");
                }

                // Check if Ollama is running
                const isOllamaAvailable = await checkOllamaAvailability(config.ollamaUrl);
                if (!isOllamaAvailable) {
                    const instructions = getOllamaInstallInstructions();
                    await vscode.window.showErrorMessage("Ollama Connection Error", {
                        modal: true,
                        detail: instructions
                    });
                    throw new Error("Ollama is not running. Please start Ollama and try again.");
                }

                return await callOllamaAPI(config.ollamaUrl, config.model, diff);

            default:
                throw new Error(`Unsupported API provider: ${config.type}`);
        }
    } catch (error) {
        debugLog("API Error:", error);

        // Format the error message for display
        let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

        // Only show modal for Ollama connection issues
        if (config.type === "ollama" && errorMessage.includes("Ollama is not running")) {
            const instructions = getOllamaInstallInstructions();
            await vscode.window.showErrorMessage("Ollama Connection Error", {
                modal: true,
                detail: instructions
            });
        }

        // Don't show another error message, just throw the error
        throw error;
    }
}
