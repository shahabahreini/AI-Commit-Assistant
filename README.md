# AI Commit Assistant for VS Code

Generate meaningful and consistent git commit messages using AI to enhance your development workflow. This extension supports both Google's Gemini AI and Hugging Face models for generating commit messages.

## Features

Transform your commit process with AI-powered assistance:

- **Dual AI Support**: Choose between Google's Gemini AI or Hugging Face models
- **Smart Analysis**: Automatically analyzes staged and unstaged changes
- **Conventional Commits**: Generates standardized commit messages following conventional commit format
- **Interactive Preview**: View generated commits in a formatted webview before applying
- **Status Bar Integration**: Quick access through VS Code's status bar
- **Efficient Workflow**: Automatically populates the Source Control input box

## Requirements

Before you begin, ensure you have:

- Visual Studio Code ^1.74.0
- Git installed and initialized in your workspace
- API Key for your chosen provider:
  - Google Gemini API key, or
  - Hugging Face API key

## Installation

1. Install from VS Code Marketplace
2. Configure your API key(s) in VS Code settings
3. Start generating AI-powered commit messages

### Compile

To compile the latest version from the source file, run the following command:

```bash
npm install
nvm install --lts
nvm use --lts
npm run package
```

## Configuration

Configure the extension through VS Code settings:

```json
{
  "aiCommitAssistant.apiProvider": "gemini",     // Choose "gemini" or "huggingface"
  "aiCommitAssistant.geminiApiKey": "",          // Your Gemini API key
  "aiCommitAssistant.huggingfaceApiKey": "",     // Your Hugging Face API key
  "aiCommitAssistant.huggingfaceModel": ""       // Hugging Face model ID
}
```

### Default Hugging Face Model

The extension uses `mistralai/Mistral-7B-Instruct-v0.3` by default. Other supported models include:

- `facebook/bart-large-cnn`
- `microsoft/DialoGPT-medium`

## Usage

1. Stage your changes in Git (optional - works with unstaged changes too)
2. Access the extension through:
   - Status bar "AI Commit" button
   - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) - "Generate AI Commit Message"
3. Review the generated message in the preview window
4. The message will automatically populate your Source Control input

## Features in Detail

### Commit Message Structure

- **Summary**: Follows conventional commits format (feat:, fix:, docs:, etc.)
- **Description**: Detailed technical explanation of changes
- **Format**: Automatically formatted to Git best practices

### AI Integration

- **Gemini AI**: Optimized for technical content and code analysis
- **Hugging Face**: Flexible model selection for different use cases

## Known Issues

Please be aware of the following:

- Large diffs may take longer to process
- API keys must be configured before first use
- Some Hugging Face models may have varying response formats

## Release Notes

### 0.0.5

- Added support for Hugging Face models
- Improved error handling and user feedback
- Added status bar integration
- Enhanced commit message preview

### 0.0.4

- Initial release with Gemini AI support
- Basic commit message generation
- Conventional commits format support

## Contributing

Found a bug or have a feature request? Please open an issue on our GitHub repository.

## License

This extension is licensed under the MIT License.

## Privacy Notice

This extension processes git diff information through:

- Google's Gemini AI service, and/or
- Hugging Face's API service

No personal or sensitive information is collected or stored.

---
**Note**: Configure your preferred API key in VS Code settings before first use.
