# Change Log

All notable changes to the "AI Commit Assistant" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.8] - 2024-02-10

### Changed

- Updated default Ollama model from "mistral" to "phi4" in aiCommitAssistant.ollamaModel settings
- Enhanced error message display system for better user experience
- Improved API error handling and user feedback mechanisms

### Added

- Selective modal display for Ollama connection issues with installation instructions
- More detailed API error diagnostics in Hugging Face integration
- JSON parsing capability for Hugging Face API error messages

### Fixed

- Improved error handling in huggingface.ts with better error message formatting
- Added fallback mechanisms for error handling when JSON parsing fails
- Enhanced error context preservation during error propagation

[0.1.8]: https://github.com/shahabahreini/AI-Commit-Assistant/releases/tag/v0.1.8-beta
