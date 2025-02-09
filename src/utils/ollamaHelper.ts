// src/utils/ollamaHelper.ts
import { debugLog } from "../services/debug/logger";

export async function checkOllamaAvailability(ollamaUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${ollamaUrl}/api/version`, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        debugLog("Ollama availability check failed:", error);
        return false;
    }
}

export function getOllamaInstallInstructions(): string {
    const platform = process.platform;
    let instructions = "Ollama is not running or not installed. Please follow these steps:\n\n";

    switch (platform) {
        case 'darwin': // macOS
            instructions += `1. Install Ollama (if not installed):\n   curl https://ollama.ai/install.sh | sh\n\n2. Start Ollama:\n   - Open the Ollama application from your Applications folder\n   - Or run: open -a Ollama\n\n3. Wait a few seconds for Ollama to start`;
            break;
        case 'win32': // Windows
            instructions += `1. Download Ollama (if not installed):\n   Visit https://ollama.ai/download/windows\n\n2. Install and start Ollama:\n   - Run the installer\n   - Launch Ollama from the Start menu\n   - Wait for the Ollama icon to appear in the system tray\n\n3. The first start may take a few moments`;
            break;
        case 'linux':
            instructions += `1. Install Ollama (if not installed):\n   curl https://ollama.ai/install.sh | sh\n\n2. Start Ollama:\n   - Run: ollama serve\n   - Or set up systemd service:\n     sudo systemctl start ollama\n\n3. Wait a few seconds for Ollama to initialize`;
            break;
        default:
            instructions += "Visit https://ollama.ai/download for installation instructions for your platform.";
    }

    instructions += "\n\nAfter starting Ollama, please try generating the commit message again.";
    return instructions;
}
