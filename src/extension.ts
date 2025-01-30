// src/extension.ts
import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Status bar item for better visibility
let statusBarItem: vscode.StatusBarItem;

// Interface for API configurations
interface ApiConfig {
  type: 'gemini' | 'huggingface';
  apiKey: string;
  model?: string;
}

// Interface for Hugging Face API response
interface HuggingFaceResponse {
  generated_text: string;
}

// Add this interface near the top with other interfaces
interface CommitMessage {
  summary: string;
  description: string;
}

// Add this function to process Hugging Face responses
async function processHuggingFaceResponse(response: string): Promise<CommitMessage> {
  try {
    // First, try to find the actual commit message by looking for the last occurrence
    // of the commit format in the response
    const blocks = response.split('```');
    let cleanResponse = response;

    // If we find a code block, take the last one as it's usually the final answer
    if (blocks.length > 1) {
      cleanResponse = blocks[blocks.length - 2].trim();
    }

    // Split the response into sections based on headers
    const sections = cleanResponse.split('#').map(s => s.trim());

    let summary = '';
    let description = '';

    // Find the commit summary section
    const summarySection = sections.find(s =>
      s.toLowerCase().includes('commit summary') ||
      s.toLowerCase().includes('summary')
    );
    if (summarySection) {
      const summaryLines = summarySection.split('\n')
        .filter(line => line.trim())
        .filter(line => !line.toLowerCase().includes('commit summary'))
        .filter(line => !line.toLowerCase().includes('summary'));

      if (summaryLines.length > 0) {
        summary = summaryLines[0].trim();
      }
    }

    // Find the detailed description section
    const descriptionSection = sections.find(s =>
      s.toLowerCase().includes('detailed description') ||
      s.toLowerCase().includes('description')
    );
    if (descriptionSection) {
      const descriptionLines = descriptionSection.split('\n')
        .filter(line => line.trim())
        .filter(line => !line.toLowerCase().includes('detailed description'))
        .filter(line => !line.toLowerCase().includes('description'));

      if (descriptionLines.length > 0) {
        description = descriptionLines.join('\n').trim();
      }
    }

    // If no structured sections found, try fallback parsing
    if (!summary) {
      const summaryPattern = /(?:feat|fix|docs|style|refactor|test|chore):[^#\n]*/;
      const summaryMatch = cleanResponse.match(summaryPattern);
      if (summaryMatch) {
        summary = summaryMatch[0].trim();
      }
    }

    // Clean up and format
    summary = summary
      .replace(/\[.*?\]/g, '')  // Remove any [brackets]
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();

    description = description
      .replace(/\[.*?\]/g, '')  // Remove any [brackets]
      .replace(/^\n+|\n+$/g, '') // Remove leading/trailing newlines
      .trim();

    // Ensure proper formatting
    if (!summary.match(/^(feat|fix|docs|style|refactor|test|chore):/)) {
      summary = `feat: ${summary}`;
    }

    // Only use fallbacks if we really couldn't find anything
    if (!summary || summary.length < 5) {
      summary = 'feat: update code';
    }
    if (!description) {
      // Try to extract any remaining meaningful content
      const remainingContent = cleanResponse
        .split('\n')
        .filter(line =>
          line.trim() &&
          !line.includes('#') &&
          !line.toLowerCase().includes('commit summary') &&
          !line.toLowerCase().includes('detailed description')
        )
        .join('\n')
        .trim();

      description = remainingContent || 'Update implementation';
    }

    return {
      summary: summary.slice(0, 72),
      description
    };
  } catch (error) {
    console.error('Error processing response:', error);
    return {
      summary: 'feat: update code',
      description: 'Update implementation'
    };
  }
}



// Modify the callHuggingFaceAPI function
async function callHuggingFaceAPI(apiKey: string, model: string, diff: string): Promise<string> {
  const prompt = `<|system|>You are a git commit message writer. Generate only the commit message without any additional text or instructions.

<|user|>Write a commit message for this diff:
${diff}

Based on the following git diff, generate:
1. A concise commit summary (max 72 characters) following conventional commits format
2. A detailed technical description of the changes

Rules for commit summary:
- Use conventional commits format (feat:, fix:, docs:, style:, refactor:, test:, chore:)
- Keep it under 72 characters
- Use present tense
- Be specific and clear

Format your response exactly like this, nothing else:
# Commit Summary
feat: brief description

# Detailed Description
Technical details here

<|assistant|>`;

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 500,
          temperature: 0.1,  // Even lower temperature for more deterministic output
          top_p: 0.95,
          return_full_text: false,
          do_sample: false  // Use greedy decoding for more consistent output
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const result = await response.json() as HuggingFaceResponse | HuggingFaceResponse[];
  return Array.isArray(result) ? result[0].generated_text : result.generated_text;
}


// Function to parse markdown content
function parseMarkdownContent(content: string): [string, string] {
  const summaryMatch = content.match(/# Commit Summary\s*\n([^\n#]*)/);
  const descriptionMatch = content.match(/# Detailed Description\s*\n([\s\S]*?)(?:\n#|$)/);

  const summary = summaryMatch ? summaryMatch[1].trim() : '';
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';

  return [summary, description];
}

// Function to generate webview content
function getWebviewContent(content: string): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Generated Commit Message</title>
        <style>
            body {
                padding: 20px;
                line-height: 1.6;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            pre {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
            }
        </style>
    </head>
    <body>
        <div class="markdown-body">
            ${content}
        </div>
    </body>
    </html>`;
}

export async function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = "$(git-commit) AI Commit";
  statusBarItem.command = 'ai-commit-assistant.generateCommitMessage';
  statusBarItem.tooltip = 'Generate AI Commit Message';
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  let disposable = vscode.commands.registerCommand('ai-commit-assistant.generateCommitMessage', async () => {
    try {
      // Show loading state
      statusBarItem.text = "$(sync~spin) Generating commit...";

      // Get the current workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      // Validate git repository
      try {
        await execAsync('git rev-parse --is-inside-work-tree', {
          cwd: workspaceFolder.uri.fsPath
        });
      } catch (error) {
        throw new Error('Not a git repository');
      }

      // Get git diff
      const { stdout: diff } = await execAsync('git diff --staged', {
        cwd: workspaceFolder.uri.fsPath
      });

      if (!diff) {
        const { stdout: unstagesDiff } = await execAsync('git diff', {
          cwd: workspaceFolder.uri.fsPath
        });

        if (!unstagesDiff) {
          throw new Error('No changes detected');
        } else {
          const answer = await vscode.window.showWarningMessage(
            'No staged changes found. Would you like to generate a commit message for unstaged changes?',
            'Yes', 'No'
          );
          if (answer !== 'Yes') {
            return;
          }
        }
      }

      // Get configuration
      const config = vscode.workspace.getConfiguration('aiCommitAssistant');
      const apiProvider = config.get<string>('apiProvider') || 'gemini';
      const geminiApiKey = config.get<string>('geminiApiKey') || process.env.GEMINI_API_KEY;
      const huggingfaceApiKey = config.get<string>('huggingfaceApiKey') || process.env.HUGGINGFACE_API_KEY;
      const huggingfaceModel = config.get<string>('huggingfaceModel') || 'mistralai/Mistral-7B-Instruct-v0.3';

      let apiConfig: ApiConfig;

      if (apiProvider === 'gemini' && geminiApiKey) {
        apiConfig = { type: 'gemini', apiKey: geminiApiKey };
      } else if (apiProvider === 'huggingface' && huggingfaceApiKey) {
        apiConfig = {
          type: 'huggingface',
          apiKey: huggingfaceApiKey,
          model: huggingfaceModel
        };
      } else {
        const setKeyAction = 'Configure API';
        const result = await vscode.window.showErrorMessage(
          `API key not found for ${apiProvider}. Please configure your API settings.`,
          setKeyAction
        );
        if (result === setKeyAction) {
          await vscode.commands.executeCommand('workbench.action.openSettings', 'aiCommitAssistant');
        }
        return;
      }

      const prompt = `
                Based on the following git diff, generate:
                1. A concise commit summary (max 72 characters) following conventional commits format
                2. A detailed technical description of the changes

                Git Diff:
                ${diff}

                Format the output in markdown with:
                # Commit Summary
                [summary here]

                # Detailed Description
                [description here]

                Rules for commit summary:
                - Use conventional commits format (feat:, fix:, docs:, style:, refactor:, test:, chore:)
                - Keep it under 72 characters
                - Use present tense
                - Be specific and clear
            `;

      let text: string;

      let summary: string;
      let description: string;

      if (apiConfig.type === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiConfig.apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        [summary, description] = parseMarkdownContent(text);
      } else {
        // Hugging Face API call
        const rawResponse = await callHuggingFaceAPI(apiConfig.apiKey, apiConfig.model!, prompt);
        const processedResponse = await processHuggingFaceResponse(rawResponse);
        summary = processedResponse.summary;
        description = processedResponse.description;
        text = `# Commit Summary\n${summary}\n\n# Detailed Description\n${description}`;
      }

      // Create and show webview
      const panel = vscode.window.createWebviewPanel(
        'commitMessage',
        'AI Generated Commit Message',
        vscode.ViewColumn.One,
        {
          enableScripts: true
        }
      );

      panel.webview.html = getWebviewContent(text);

      // Populate Source Control input
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        throw new Error('Git extension not found');
      }

      try {
        const git = gitExtension.exports.getAPI(1);
        if (!git) {
          throw new Error('Git API not available');
        }

        const repositories = git.repositories;
        if (!repositories || repositories.length === 0) {
          throw new Error('No Git repositories found');
        }

        const repository = repositories[0];
        if (repository) {
          // Set the commit message in the Source Control input box
          repository.inputBox.value = `${summary}\n\n${description}`;
        }
      } catch (err: unknown) {
        console.error('Error accessing Git repository:', err);
        const errorMessage = err instanceof Error
          ? err.message
          : 'An unknown error occurred';
        vscode.window.showErrorMessage(`Failed to set commit message in Source Control: ${errorMessage}`);
      }

      // Reset status bar
      statusBarItem.text = "$(git-commit) AI Commit";
    } catch (error: unknown) {
      // Reset status bar on error
      statusBarItem.text = "$(git-commit) AI Commit";
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error';
      vscode.window.showErrorMessage(`Error: ${errorMessage}`);
    }
  });

  context.subscriptions.push(disposable);
}
