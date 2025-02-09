import * as vscode from "vscode";
import { getConfiguration } from "../../config/settings";

let debugChannel: vscode.OutputChannel;

export function initializeLogger(channel: vscode.OutputChannel) {
    debugChannel = channel;
}

export function debugLog(message: string, data?: any) {
    const config = getConfiguration();

    if (config.debug && debugChannel) {
        const timestamp = new Date().toISOString();
        debugChannel.appendLine(`[${timestamp}] ${message}`);
        if (data) {
            debugChannel.appendLine(JSON.stringify(data, null, 2));
        }
        debugChannel.show(true);
    }
}
