import * as vscode from "vscode";
import { ApiConfig } from "./types";
import { ExtensionConfig } from './types';

export function getConfiguration(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('aiCommitAssistant');

    return {
        apiProvider: config.get<"gemini" | "huggingface" | "ollama">('apiProvider', 'gemini'),
        geminiApiKey: config.get<string>('geminiApiKey'),
        huggingfaceApiKey: config.get<string>('huggingfaceApiKey'),
        huggingfaceModel: config.get<string>('huggingfaceModel'),
        ollamaModel: config.get<string>('ollamaModel'),
        ollamaUrl: config.get<string>('ollamaUrl', 'http://localhost:11434')
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
