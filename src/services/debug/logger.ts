// src/services/debug/logger.ts
import * as vscode from "vscode";

let debugChannel: vscode.OutputChannel | undefined;

export function initializeLogger(channel: vscode.OutputChannel) {
    debugChannel = channel;
    debugLog('Debug logger initialized');
}

export function debugLog(message: string, data?: any) {
    const config = vscode.workspace.getConfiguration("aiCommitAssistant");
    const isDebugMode = config.get<boolean>("debug") || false;

    if (isDebugMode && debugChannel) {
        const timestamp = new Date().toISOString();
        debugChannel.appendLine(`[${timestamp}] ${message}`);
        if (data !== undefined) {
            if (typeof data === 'string') {
                debugChannel.appendLine(data);
            } else {
                try {
                    debugChannel.appendLine(JSON.stringify(data, null, 2));
                } catch (error) {
                    debugChannel.appendLine(`[Error serializing data: ${error}]`);
                }
            }
        }
        debugChannel.show(true); // Force the debug channel to show
    }
}
