import * as vscode from "vscode";
import { ApiConfig } from "./types";

export function getConfiguration(): {
    apiProvider: string;
    geminiApiKey: string;
    huggingfaceApiKey: string;
    huggingfaceModel: string;
    ollamaUrl: string;
    ollamaModel: string;
    debug: boolean;
} {
    const config = vscode.workspace.getConfiguration("aiCommitAssistant");
    return {
        apiProvider: config.get<string>("apiProvider") || "gemini",
        geminiApiKey: config.get<string>("geminiApiKey") || process.env.GEMINI_API_KEY || "",
        huggingfaceApiKey: config.get<string>("huggingfaceApiKey") || process.env.HUGGINGFACE_API_KEY || "",
        huggingfaceModel: config.get<string>("huggingfaceModel") || "mistralai/Mistral-7B-Instruct-v0.3",
        ollamaUrl: config.get<string>("ollamaUrl") || "http://localhost:11434",
        ollamaModel: config.get<string>("ollamaModel") || "mistral",
        debug: config.get<boolean>("debug") || false
    };
}

export function getApiConfig(): ApiConfig {
    const config = getConfiguration();

    switch (config.apiProvider) {
        case "gemini":
            return { type: "gemini", apiKey: config.geminiApiKey };
        case "huggingface":
            return {
                type: "huggingface",
                apiKey: config.huggingfaceApiKey,
                model: config.huggingfaceModel
            };
        case "ollama":
            return {
                type: "ollama",
                ollamaUrl: config.ollamaUrl,
                model: config.ollamaModel
            };
        default:
            return { type: "gemini" };
    }
}
