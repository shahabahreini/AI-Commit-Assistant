// types.ts

import * as vscode from "vscode";

// Provider types
export type ApiProvider = "gemini" | "huggingface" | "ollama" | "mistral" | "cohere" | "openai" | "together" | "openrouter";
export type CommitStyle = "conventional" | "gitmoji" | "basic";

// Base configurations
export interface ProviderConfig {
    enabled: boolean;
    apiKey?: string;
    model?: string;
    customModel?: string;
    temperature?: number;
    url?: string;
}

export interface CommitConfig {
    style: CommitStyle;
    maxLength: number;
    includeScope: boolean;
    addBulletPoints: boolean;
    verbose: boolean;
}

// Extension configuration
export interface ExtensionConfig {
    provider: ApiProvider;
    debug: boolean;
    gemini: ProviderConfig;
    huggingface: ProviderConfig & {
        temperature: number;
    };
    ollama: ProviderConfig;
    commit: CommitConfig;
    mistral: {
        enabled: boolean;
        apiKey?: string;
        model: string;
    };
    cohere: {
        enabled: boolean;
        apiKey?: string;
        model: string;
    };
    openai: {
        enabled: boolean;
        apiKey?: string;
        model: string;
    };
    together: {
        enabled: boolean;
        apiKey?: string;
        model: string;
    };
    openrouter: {
        enabled: boolean;
        apiKey?: string;
        model: string;
    };
    promptCustomization: {
        enabled: boolean;
    };
}

// API responses
export interface HuggingFaceResponse {
    generated_text: string;
}

export interface OllamaResponse {
    response: string;
    done: boolean;
}

export interface MistralApiConfig extends BaseApiConfig {
    type: "mistral";
    apiKey: string;
    model: string;
}

export interface CohereApiConfig extends BaseApiConfig {
    type: "cohere";
    apiKey: string;
    model: string;
}

// Commit related types
export interface CommitMessage {
    summary: string;
    description: string;
}

// Extension state
export interface ExtensionState {
    debugChannel: vscode.OutputChannel;
    statusBarItem: vscode.StatusBarItem;
    context?: vscode.ExtensionContext;
}

// API configurations
export interface BaseApiConfig {
    type: ApiProvider;
}

export interface GeminiApiConfig extends BaseApiConfig {
    type: "gemini";
    apiKey?: string;
    model: GeminiModel;
}

export interface GeminiProviderConfig {
    enabled: boolean;
    apiKey?: string;
    model: GeminiModel;
}

export enum GeminiModel {
    // Updated model IDs for Gemini 2.5
    GEMINI_2_5_PRO = 'gemini-2.5-pro-exp-03-25',
    GEMINI_2_5_FLASH = 'gemini-2.5-flash-preview-04-17',
    GEMINI_2_0_FLASH = 'gemini-2.0-flash',
    GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
    GEMINI_1_5_FLASH = 'gemini-1.5-flash',
    GEMINI_1_5_FLASH_8B = 'gemini-1.5-flash-8b',
    GEMINI_1_5_PRO = 'gemini-1.5-pro',
}


export interface HuggingFaceApiConfig extends BaseApiConfig {
    type: "huggingface";
    apiKey: string;
    model: string;
    temperature: number;
}

export interface OllamaApiConfig extends BaseApiConfig {
    type: "ollama";
    url: string;
    model: string;
}

export interface OpenAIApiConfig extends BaseApiConfig {
    type: "openai";
    apiKey: string;
    model: string;
}

export interface TogetherApiConfig extends BaseApiConfig {
    type: "together";
    apiKey: string;
    model: string;
}

export interface OpenRouterApiConfig extends BaseApiConfig {
    type: "openrouter";
    apiKey: string;
    model: string;
}

export interface MistralResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            tool_calls: null | any;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        total_tokens: number;
        completion_tokens: number;
    };
}

export interface MistralRateLimit {
    reset: number;
    limit: number;
    remaining: number;
    queryCost: number;
    monthlyLimit: number;
    monthlyRemaining: number;
    minuteLimit: number;
    minuteRemaining: number;
    timestamp: number;
}


export type ApiConfig =
    | GeminiApiConfig
    | HuggingFaceApiConfig
    | OllamaApiConfig
    | MistralApiConfig
    | CohereApiConfig
    | OpenAIApiConfig
    | TogetherApiConfig
    | OpenRouterApiConfig;