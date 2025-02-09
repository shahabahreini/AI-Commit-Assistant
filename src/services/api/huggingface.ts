import { HuggingFaceResponse } from "../../config/types";
import { debugLog } from "../debug/logger";

export async function callHuggingFaceAPI(
    apiKey: string,
    model: string,
    diff: string
): Promise<string> {
    const prompt = `As a Git commit message generator, analyze this specific diff and create ONE commit message that accurately describes these changes:

Git Diff:
${diff}

Requirements:
1. Generate ONLY ONE commit message
2. First line must:
   - Start with one of: feat|fix|docs|style|refactor|test|chore
   - Be under 72 characters
   - Use imperative mood
   - Be technical and to the point

3. Format your response EXACTLY as:
<type>: <brief description>

- <bullet point about the changes>
- <another bullet point if needed>

Do not include multiple examples or explanations. Just generate one specific commit message for this diff.`;

    debugLog("Calling Hugging Face API", { model });
    debugLog("Prompt:", prompt);

    const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 500,
                    //temperature: 0.1,
                    //top_p: 0.95,
                    return_full_text: false,
                    do_sample: true,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        debugLog("Hugging Face API Error:", error);
        throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const result = (await response.json()) as HuggingFaceResponse | HuggingFaceResponse[];
    return Array.isArray(result) ? result[0].generated_text : result.generated_text;
}
