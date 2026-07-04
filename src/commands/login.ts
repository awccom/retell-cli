/**
 * Login Command
 *
 * Authenticates the user with Retell AI by prompting for an API key,
 * validating it with a test API call, and saving it to global or local config.
 */

import * as readline from "readline/promises";
import { stdin, stdout } from "process";
import Retell from "retell-sdk";
import {
  saveConfig,
  configFileExists,
  getConfigFilePath,
  type ConfigScope,
} from "../services/config";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../services/output-formatter";

export interface LoginOptions {
  global?: boolean;
  local?: boolean;
}

function resolveLoginScope(options: LoginOptions): ConfigScope {
  if (options.global && options.local) {
    outputError("Use only one of --global or --local", "INVALID_INPUT");
  }

  return options.local ? "local" : "global";
}

/**
 * Execute the login command
 *
 * Flow:
 * 1. Pick target config scope (global/home by default, local with --local)
 * 2. Check if target config already exists and prompt for overwrite
 * 3. Prompt user for API key
 * 4. Validate API key by making test API call
 * 5. Save to config file
 * 6. Display success message with next steps
 */
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  const scope = resolveLoginScope(options);
  const configPath = getConfigFilePath({ scope });
  const scopeLabel = scope === "global" ? "global/home" : "local";
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    // Check if target config already exists
    if (configFileExists({ scope })) {
      const overwrite = await rl.question(
        `${scopeLabel} config already exists at ${configPath}. Overwrite? (y/n): `,
      );
      if (overwrite.toLowerCase() !== "y") {
        outputJson({ message: "Login cancelled" });
        return;
      }
    }

    // Prompt for API key
    const apiKey = await rl.question("Enter your Retell API key: ");

    // Validate that key is not empty
    if (!apiKey || apiKey.trim() === "") {
      outputJson({
        error: "API key cannot be empty",
        code: "INVALID_INPUT",
      });
      process.exit(1);
      return; // For testing - ensures function stops even if exit is mocked
    }

    const trimmedApiKey = apiKey.trim();

    // Validate by testing API call
    const testClient = new Retell({ apiKey: trimmedApiKey });
    await testClient.agent.list({ limit: 1 }); // Throws AuthenticationError if invalid

    // Save to config
    const savedConfigPath = saveConfig(
      { apiKey: trimmedApiKey, defaultFormat: "json" },
      { scope },
    );

    // Success message with next steps
    outputJson({
      message: "Successfully authenticated!",
      scope,
      configPath: savedConfigPath,
      nextSteps:
        scope === "global"
          ? [
              "Try from any directory: retell agents list",
              "Try from any directory: retell transcripts list",
            ]
          : [
              "Try from this directory: retell agents list",
              "Use retell login --global for auth from any directory",
            ],
    });
  } catch (error) {
    handleSdkError(error);
  } finally {
    rl.close();
  }
}
