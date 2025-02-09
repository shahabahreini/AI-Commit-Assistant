import { debugLog } from "../services/debug/logger";

export async function checkOllamaAvailability(ollamaUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(`${ollamaUrl}/api/version`, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Clean up the timeout
        return response.ok;
    } catch (error) {
        debugLog("Ollama availability check failed:", error);
        return false;
    }
}

export function getOllamaInstallInstructions(): string {
    const platform = process.platform;
    let instructions = "Ollama is not running. Please follow these steps:\n\n";

    switch (platform) {
        case 'darwin':
            instructions += `1. Install Ollama:\n   curl https://ollama.ai/install.sh | sh\n\n2. Start Ollama:\n   open -a Ollama`;
            break;
        case 'win32':
            instructions += `1. Download Ollama from: https://ollama.ai/download/windows\n2. Install and run the Ollama application`;
            break;
        case 'linux':
            instructions += `1. Install Ollama:\n   curl https://ollama.ai/install.sh | sh\n\n2. Start Ollama:\n   ollama serve`;
            break;
        default:
            instructions += "Please visit https://ollama.ai/download for installation instructions.";
    }

    instructions += "\n\nAfter starting Ollama, try generating the commit message again.";
    return instructions;
}