import { debugLog } from "../debug/logger";
import { MistralResponse, MistralRateLimit } from "../../config/types";

function extractRateLimits(headers: Headers): MistralRateLimit {
    return {
        reset: parseInt(headers.get('ratelimitbysize-reset') || '0'),
        limit: parseInt(headers.get('ratelimitbysize-limit') || '0'),
        remaining: parseInt(headers.get('ratelimitbysize-remaining') || '0'),
        queryCost: parseInt(headers.get('ratelimitbysize-query-cost') || '0')
    };
}

export async function callMistralAPI(apiKey: string, model: string, diff: string): Promise<string> {
    const prompt = `As a Git commit message generator, analyze this specific diff and create ONE commit message that accurately describes these changes:

Git Diff:
${diff}

## Requirements

### Subject Line (First Line)
- Must start with one of these types:
  - feat: New feature
  - fix: Bug fix
  - docs: Documentation changes
  - style: Code style/formatting changes (no code change)
  - refactor: Code refactoring (no functional change)
  - test: Adding/modifying tests
  - chore: Maintenance tasks, build changes, etc.
- Maximum 72 characters
- Use imperative mood ("Add" not "Added")
- No period at the end
- Must be technical and specific

## Expected Format
<type>: <concise description>

- <detailed change explanation>
- <additional context if needed>`;

    debugLog("Calling Mistral API", { model });
    debugLog("Prompt:", prompt);

    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "user", content: prompt }
                ]
            })
        });

        // Extract and log rate limits
        const rateLimits = extractRateLimits(response.headers);
        debugLog("Mistral API Rate Limits:", rateLimits);

        // Check rate limits
        if (rateLimits.remaining <= 0) {
            const resetTime = new Date(rateLimits.reset * 1000);
            throw new Error(`Rate limit exceeded. Reset at ${resetTime.toLocaleString()}`);
        }

        if (!response.ok) {
            let errorMessage: string;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || 'Unknown error';
            } catch {
                errorMessage = response.statusText;
            }
            throw new Error(`Mistral API error (${response.status}): ${errorMessage}`);
        }

        const result = await response.json() as MistralResponse;
        const generatedText = result.choices[0]?.message?.content;

        if (!generatedText) {
            throw new Error("No generated text in response");
        }

        debugLog("Mistral API Response:", generatedText);
        return generatedText;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("Mistral API error")) {
                throw error;
            }
            throw new Error(`Mistral API call failed: ${error.message}`);
        }
        throw new Error(`Unexpected error during Mistral API call: ${String(error)}`);
    }
}
