import * as vscode from "vscode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let debugChannel: vscode.OutputChannel;

// Interfaces
interface ApiConfig {
  type: "gemini" | "huggingface" | "ollama";
  apiKey?: string;
  model?: string;
  ollamaUrl?: string;
}

interface HuggingFaceResponse {
  generated_text: string;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

interface CommitMessage {
  summary: string;
  description: string;
}

function debugLog(message: string, data?: any) {
  const config = vscode.workspace.getConfiguration("aiCommitAssistant");
  const isDebugMode = config.get<boolean>("debug") || false;

  if (isDebugMode) {
    const timestamp = new Date().toISOString();
    debugChannel.appendLine(`[${timestamp}] ${message}`);
    if (data) {
      debugChannel.appendLine(JSON.stringify(data, null, 2));
    }
    debugChannel.show(true);
  }
}

async function callOllamaAPI(
  baseUrl: string,
  model: string,
  diff: string
): Promise<string> {
  const prompt = `Generate a detailed commit message for the following changes:

${diff}

Requirements:
1. First line must:
   - Start with one of: feat|fix|docs|style|refactor|test|chore
   - Be under 50 characters
   - Use imperative mood
   - Summarize the change

2. Leave one blank line after the first line

3. Write a CONCISE description with 2-4 bullet points that explains:
   - What changes were made
   - Why the changes were necessary (if relevant)
   - Impact of the changes

Format your response EXACTLY as:
<type>: <short description>

- <point 1>
- <point 2>
- <point 3 if needed>`;

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
        temperature: 0.1,
        top_p: 0.95,
        system:
          "You are a commit message generator that creates clear, concise, and informative commit messages.",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    debugLog("Ollama API Error:", error);
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const result = (await response.json()) as OllamaResponse;
  let cleanedResponse = model.toLowerCase().includes("deepseek")
    ? cleanDeepSeekResponse(result.response)
    : result.response;

  debugLog("Ollama Response (after cleaning):", cleanedResponse);
  return cleanedResponse;
}

async function callHuggingFaceAPI(
  apiKey: string,
  model: string,
  diff: string
): Promise<string> {
  const prompt = `Analyze the following git diff and generate a commit message. The commit message should follow conventional commits format and accurately reflect the type of changes made:

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
# Commit Summary
<type>: brief description (max 72 chars)

# Detailed Description
- Point 1
- Point 2
- Point 3 (if needed)`;

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
          temperature: 0.1,
          top_p: 0.95,
          return_full_text: false,
          do_sample: false,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    debugLog("Hugging Face API Error:", error);
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const result = (await response.json()) as
    | HuggingFaceResponse
    | HuggingFaceResponse[];
  const generatedText = Array.isArray(result)
    ? result[0].generated_text
    : result.generated_text;
  debugLog("Hugging Face Response:", generatedText);
  return generatedText;
}

async function processResponse(response: string): Promise<CommitMessage> {
  debugLog("Processing Response:", response);
  try {
    // Clean the response first
    response = response
      .replace(/\*\*/g, "") // Remove all ** markers
      .replace(/`/g, ""); // Remove all ` markers

    const lines = response
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    const summaryPattern =
      /^(feat|fix|docs|style|refactor|test|chore)(\([^)]+\))?:\s+[^\n]+$/i;
    let summary = "";
    let description = "";
    let bulletPoints: string[] = [];
    let foundSummary = false;

    // First pass: find the summary line
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!foundSummary && summaryPattern.test(cleanLine)) {
        summary = cleanLine;
        foundSummary = true;
        continue;
      }

      // Collect bullet points after finding summary
      if (foundSummary && cleanLine) {
        if (cleanLine.startsWith("-")) {
          bulletPoints.push(cleanLine);
        } else if (!cleanLine.startsWith("#") && !cleanLine.startsWith("*")) {
          // If it's a regular line, convert it to bullet point
          bulletPoints.push(`- ${cleanLine}`);
        }
      }
    }

    // If no valid summary was found, use the first line that looks reasonable
    if (!summary) {
      const firstLine = lines[0]?.trim();
      if (firstLine && !firstLine.startsWith("-")) {
        // Try to format it as a conventional commit
        const type = firstLine.toLowerCase().includes("feat")
          ? "feat"
          : firstLine.toLowerCase().includes("fix")
            ? "fix"
            : firstLine.toLowerCase().includes("docs")
              ? "docs"
              : firstLine.toLowerCase().includes("style")
                ? "style"
                : firstLine.toLowerCase().includes("refactor")
                  ? "refactor"
                  : firstLine.toLowerCase().includes("test")
                    ? "test"
                    : "chore";

        summary = `${type}: ${firstLine.replace(/^[^:]*:\s*/, "")}`;
      } else {
        summary = "chore: update code";
      }
    }

    // Clean up summary
    summary = summary
      .replace(/\[.*?\]/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Ensure summary is not too long
    if (summary.length > 50) {
      summary = summary.substring(0, 47) + "...";
    }

    // Build description from bullet points
    if (bulletPoints.length > 0) {
      description = bulletPoints.join("\n");
    } else {
      description = "- Update implementation with necessary changes";
    }

    debugLog("Processed Commit Message:", { summary, description });
    return { summary, description };
  } catch (error) {
    debugLog("Error Processing Response:", error);
    return {
      summary: "chore: update code",
      description: "- Update implementation",
    };
  }
}

function parseMarkdownContent(content: string): CommitMessage {
  const summaryMatch = content.match(/# Commit Summary\s*\n([^\n#]*)/);
  const descriptionMatch = content.match(
    /# Detailed Description\s*\n([\s\S]*?)(?:\n#|$)/
  );

  const summary = summaryMatch ? summaryMatch[1].trim() : "chore: update code";
  const description = descriptionMatch
    ? descriptionMatch[1].trim()
    : "Update implementation";

  return { summary, description };
}

function cleanDeepSeekResponse(response: string): string {
  response = response.replace(/<think>[\s\S]*?<\/think>/g, "");
  response = response.replace(/<[^>]*>/g, "");
  response = response.trim().replace(/\s+/g, " ");
  return response;
}

export async function activate(context: vscode.ExtensionContext) {
  debugChannel = vscode.window.createOutputChannel("AI Commit Assistant Debug");
  context.subscriptions.push(debugChannel);

  let toggleDebugCommand = vscode.commands.registerCommand(
    "ai-commit-assistant.toggleDebug",
    async () => {
      const config = vscode.workspace.getConfiguration("aiCommitAssistant");
      const currentDebug = config.get<boolean>("debug") || false;
      await config.update("debug", !currentDebug, true);
      vscode.window.showInformationMessage(
        `Debug mode ${!currentDebug ? "enabled" : "disabled"}`
      );
    }
  );

  context.subscriptions.push(toggleDebugCommand);

  let disposable = vscode.commands.registerCommand(
    "ai-commit-assistant.generateCommitMessage",
    async () => {
      try {
        debugLog("Command Started: generateCommitMessage");

        // Set generating state
        await vscode.commands.executeCommand(
          "setContext",
          "ai-commit-assistant.isGenerating",
          true
        );

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error("No workspace folder found");
        }

        try {
          await execAsync("git rev-parse --is-inside-work-tree", {
            cwd: workspaceFolder.uri.fsPath,
          });
        } catch (error) {
          throw new Error("Not a git repository");
        }

        const { stdout: diff } = await execAsync("git diff --staged", {
          cwd: workspaceFolder.uri.fsPath,
        });

        if (!diff) {
          const { stdout: unstagesDiff } = await execAsync("git diff", {
            cwd: workspaceFolder.uri.fsPath,
          });

          if (!unstagesDiff) {
            throw new Error("No changes detected");
          } else {
            const answer = await vscode.window.showWarningMessage(
              "No staged changes found. Would you like to generate a commit message for unstaged changes?",
              "Yes",
              "No"
            );
            if (answer !== "Yes") {
              return;
            }
          }
        }

        const config = vscode.workspace.getConfiguration("aiCommitAssistant");
        const apiProvider = config.get<string>("apiProvider") || "gemini";
        const geminiApiKey =
          config.get<string>("geminiApiKey") || process.env.GEMINI_API_KEY;
        const huggingfaceApiKey =
          config.get<string>("huggingfaceApiKey") ||
          process.env.HUGGINGFACE_API_KEY;
        const huggingfaceModel =
          config.get<string>("huggingfaceModel") ||
          "mistralai/Mistral-7B-Instruct-v0.3";
        const ollamaUrl =
          config.get<string>("ollamaUrl") || "http://localhost:11434";
        const ollamaModel = config.get<string>("ollamaModel") || "mistral";

        let apiConfig: ApiConfig;
        let commitMessage: CommitMessage;

        if (apiProvider === "gemini" && geminiApiKey) {
          debugLog("Using Gemini API");
          apiConfig = { type: "gemini", apiKey: geminiApiKey };
          const genAI = new GoogleGenerativeAI(apiConfig.apiKey!);
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
# Commit Summary
<type>: brief description (max 50 chars)

# Detailed Description
- Point 1
- Point 2
- Point 3 (if needed)`;

          debugLog("Prompt:", promptText);

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
          });

          const response = await result.response;
          debugLog("Gemini Response:", response.text());
          commitMessage = parseMarkdownContent(response.text());
        } else if (apiProvider === "huggingface" && huggingfaceApiKey) {
          apiConfig = {
            type: "huggingface",
            apiKey: huggingfaceApiKey,
            model: huggingfaceModel,
          };
          const rawResponse = await callHuggingFaceAPI(
            apiConfig.apiKey!,
            apiConfig.model!,
            diff
          );
          commitMessage = await processResponse(rawResponse);
        } else if (apiProvider === "ollama") {
          apiConfig = {
            type: "ollama",
            ollamaUrl: ollamaUrl,
            model: ollamaModel,
          };
          const rawResponse = await callOllamaAPI(
            apiConfig.ollamaUrl!,
            apiConfig.model!,
            diff
          );
          commitMessage = await processResponse(rawResponse);
        } else {
          const setKeyAction = "Configure API";
          const result = await vscode.window.showErrorMessage(
            `API configuration not found for ${apiProvider}. Please configure your API settings.`,
            setKeyAction
          );
          if (result === setKeyAction) {
            await vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "aiCommitAssistant"
            );
          }
          return;
        }

        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
          throw new Error("Git extension not found");
        }

        try {
          const git = gitExtension.exports.getAPI(1);
          if (!git) {
            throw new Error("Git API not available");
          }

          const repositories = git.repositories;
          if (!repositories || repositories.length === 0) {
            throw new Error("No Git repositories found");
          }

          const repository = repositories[0];
          if (repository) {
            repository.inputBox.value = `${commitMessage.summary}\n\n${commitMessage.description}`;
          }
        } catch (err: unknown) {
          console.error("Error accessing Git repository:", err);
          const errorMessage =
            err instanceof Error ? err.message : "An unknown error occurred";
          debugLog("Git Repository Error:", err);
          vscode.window.showErrorMessage(
            `Failed to set commit message in Source Control: ${errorMessage}`
          );
        }

        // Reset generating state
        await vscode.commands.executeCommand(
          "setContext",
          "ai-commit-assistant.isGenerating",
          false
        );
      } catch (error: unknown) {
        // Reset generating state on error
        await vscode.commands.executeCommand(
          "setContext",
          "ai-commit-assistant.isGenerating",
          false
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        debugLog("Command Error:", error);
        vscode.window.showErrorMessage(`Error: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() { }
