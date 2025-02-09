import * as vscode from "vscode";

export type ApiProvider = "gemini" | "huggingface" | "ollama";

export interface ApiConfig {
    type: ApiProvider;
    apiKey?: string;
    model?: string;
    ollamaUrl?: string;
}

export interface ExtensionConfig {
    apiProvider: ApiProvider;
    geminiApiKey?: string;
    huggingfaceApiKey?: string;
    huggingfaceModel?: string;
    ollamaModel?: string;
    ollamaUrl?: string;
    debug?: boolean;
}

export interface HuggingFaceResponse {
    generated_text: string;
}

export interface OllamaResponse {
    response: string;
    done: boolean;
}

export interface CommitMessage {
    summary: string;
    description: string;
}

export interface ExtensionState {
    debugChannel: vscode.OutputChannel;
    statusBarItem: vscode.StatusBarItem;
    context?: vscode.ExtensionContext;
}
