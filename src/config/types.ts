import * as vscode from "vscode";

export interface ApiConfig {
    type: "gemini" | "huggingface" | "ollama";
    apiKey?: string;
    model?: string;
    ollamaUrl?: string;
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
}
