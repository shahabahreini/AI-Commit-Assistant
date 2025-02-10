# AI Commit Assistant for VS Code

Generate meaningful and consistent git commit messages using AI. This extension supports multiple AI providers including Google's Gemini AI, Hugging Face models, and Ollama for generating conventional commit messages.

## Features

- **Multiple AI Provider Support**:
  - Google's Gemini AI
  - Hugging Face models
  - Ollama (local inference)
- **Smart Git Integration**:
  - Automatic analysis of staged changes
  - Support for unstaged changes with user confirmation
  - Direct integration with VS Code's Source Control
- **Conventional Commits Format**:
  - Standardized commit message structure
  - Type categorization (feat, fix, docs, style, refactor, test, chore)
  - Concise summary (72 characters) with detailed bullet-point description
- **Debug Mode**:
  - Toggleable debug logging
  - Detailed API interaction tracking
  - Timestamp-based logging for troubleshooting

## Requirements

- Visual Studio Code ^1.75.0
- Git installed and initialized in workspace
- One of the following API configurations:
  - Google Gemini API key
  - Hugging Face API key
  - Ollama running locally

## Installation

1. Install from VS Code Marketplace
2. Configure your preferred API provider in VS Code settings
3. Start generating commit messages

### Compile

To compile the latest version from the source file, run the following command:

```bash
npm install
nvm install --lts
nvm use --lts
npm run package
vsce package
```

## Configuration

```json
{
  "aiCommitAssistant.apiProvider": "gemini",     // "gemini", "huggingface", or "ollama"
  "aiCommitAssistant.geminiApiKey": "",          // Gemini API key
  "aiCommitAssistant.huggingfaceApiKey": "",     // Hugging Face API key
  "aiCommitAssistant.huggingfaceModel": "",      // Hugging Face model ID
  "aiCommitAssistant.ollamaUrl": "",            // Ollama URL (default: http://localhost:11434)
  "aiCommitAssistant.ollamaModel": "",          // Ollama model (default: mistral)
  "aiCommitAssistant.debug": false              // Enable/disable debug mode
}
```

### Default Models

- **Hugging Face**: `mistralai/Mistral-7B-Instruct-v0.3`
- **Ollama**: `mistral`
- **Gemini**: `gemini-pro`

## Usage

1. Stage your changes in Git (optional)
2. Access the extension via:
   - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) - "Generate AI Commit Message"
   - Source Control panel press "sparkle" icon
3. Review and edit the generated message
4. Commit your changes

## Generated Commit Structure

1. **Summary Line** (max 50 characters):
   - Starts with type (feat|fix|docs|style|refactor|test|chore)
   - Uses imperative mood
   - Clearly summarizes the change

2. **Description**:
   - 2-4 bullet points
   - Explains what changes were made
   - Describes why changes were necessary
   - Notes impact of changes

## Privacy Notice

This extension processes git diff information through the configured AI service. No personal or sensitive information is collected or stored. Debug logs are only stored locally when debug mode is enabled.

## License

MIT License

---
**Note**: Configure your preferred API provider and key in VS Code settings before first use.
