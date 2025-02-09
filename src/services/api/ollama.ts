// src/services/api/ollama.ts
import { OllamaResponse } from "../../config/types";
import { debugLog } from "../debug/logger";

export async function callOllamaAPI(
    baseUrl: string,
    model: string,
    diff: string
): Promise<string> {
    const prompt = `Generate a detailed commit message for the following changes:

${diff}

Requirements:
1. First line must:
   - Start with one of: feat|fix|docs|style|refactor|test|chore
   - Be under 72 characters
   - Use imperative mood
   - Be technical and to the point

2. Leave one blank line after the first line

3. Write a CONCISE description with optimal bullet points that explains:
   - What and where changes were made
   - Impact of the changes (if neccessary)
   - Avoid buzzwords and jargons, be technical and concise

Format your response EXACTLY as:
<type>: <short description>

- <point 1>
- <point 2 and more if needed>`;

    try {
        debugLog("Calling Ollama API", { baseUrl, model });
        debugLog("Prompt:", prompt);

        const response = await fetch(`${baseUrl}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    system: "You are a Git commit message generator that creates clear, concise, and informative Git commit messages based on Git diff output.",
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            debugLog("Ollama API Error:", error);
            throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
        }

        const result = (await response.json()) as OllamaResponse;
        if (!result || !result.response) {
            throw new Error("Invalid response from Ollama API");
        }

        return result.response;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error("Could not connect to Ollama. Please make sure Ollama is running.");
        }
        throw error;
    }
}
