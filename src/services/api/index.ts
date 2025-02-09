import { ApiConfig } from "../../config/types";
import { callGeminiAPI } from "./gemini";
import { callHuggingFaceAPI } from "./huggingface";
import { callOllamaAPI } from "./ollama";

export async function generateCommitMessage(config: ApiConfig, diff: string): Promise<string> {
    switch (config.type) {
        case "gemini":
            if (!config.apiKey) {
                throw new Error("Gemini API key not configured");
            }
            return callGeminiAPI(config.apiKey, diff);

        case "huggingface":
            if (!config.apiKey || !config.model) {
                throw new Error("Hugging Face configuration incomplete");
            }
            return callHuggingFaceAPI(config.apiKey, config.model, diff);

        case "ollama":
            if (!config.ollamaUrl || !config.model) {
                throw new Error("Ollama configuration incomplete");
            }
            return callOllamaAPI(config.ollamaUrl, config.model, diff);

        default:
            throw new Error(`Unsupported API provider: ${config.type}`);
    }
}
