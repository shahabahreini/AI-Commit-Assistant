import * as vscode from "vscode";
import { ExtensionState } from "./config/types";
import { getApiConfig } from "./config/settings";
import { generateCommitMessage } from "./services/api";
import { validateGitRepository, getDiff, setCommitMessage } from "./services/git/repository";
import { initializeLogger, debugLog } from "./services/debug/logger";
import { processResponse } from "./utils/commitFormatter";

const state: ExtensionState = {
  debugChannel: vscode.window.createOutputChannel("AI Commit Assistant Debug"),
  statusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
};

export async function activate(context: vscode.ExtensionContext) {
  initializeLogger(state.debugChannel);
  context.subscriptions.push(state.debugChannel);
  context.subscriptions.push(state.statusBarItem);

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

        await vscode.commands.executeCommand(
          "setContext",
          "ai-commit-assistant.isGenerating",
          true
        );
        state.statusBarItem.text = "$(sync~spin) Generating commit message...";
        state.statusBarItem.show();

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error("No workspace folder found");
        }

        await validateGitRepository(workspaceFolder);
        const diff = await getDiff(workspaceFolder);
        const apiConfig = getApiConfig();

        const rawResponse = await generateCommitMessage(apiConfig, diff);
        const commitMessage = await processResponse(rawResponse);
        await setCommitMessage(commitMessage);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        debugLog("Command Error:", error);
        vscode.window.showErrorMessage(`Error: ${errorMessage}`);
      } finally {
        await vscode.commands.executeCommand(
          "setContext",
          "ai-commit-assistant.isGenerating",
          false
        );
        state.statusBarItem.hide();
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (state.statusBarItem) {
    state.statusBarItem.dispose();
  }
}
