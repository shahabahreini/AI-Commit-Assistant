import { GoogleGenerativeAI } from "@google/generative-ai";
import { debugLog } from "../debug/logger";

export async function callGeminiAPI(apiKey: string, diff: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const promptText = `Analyze the following git diff and generate a commit message. The commit message should follow conventional commits format and accurately reflect the type of changes made:

    Git Diff:
    ${diff}

    Guidelines:
    1. Choose the most appropriate type based on the changes:
       - feat: New features or significant enhancements
       - fix: Bug fixes
       - docs: Documentation changes
       - style: Code style changes (formatting, semicolons, etc)
       - refactor: Code changes that neither fix bugs nor add features
       - test: Adding or modifying tests
       - chore: Changes to build process or auxiliary tools

    2. Format:
    <type>: brief description (max 72 chars)

    - Point 1
    - Point 2
    - Point 3 (if needed)`;

    debugLog("Prompt:", promptText);

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
    });

    const response = await result.response;
    debugLog("Gemini Response:", response.text());

    return response.text();
}
