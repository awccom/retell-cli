/**
 * Login Command
 *
 * Authenticates the user with Retell AI by prompting for an API key,
 * validating it with a test API call, and saving it to .retellrc.json
 */

import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';
import Retell from 'retell-sdk';
import { saveConfig, configFileExists } from '../services/config';
import { outputJson, handleSdkError } from '../services/output-formatter';

/**
 * Execute the login command
 *
 * Flow:
 * 1. Check if config already exists and prompt for overwrite
 * 2. Prompt user for API key
 * 3. Validate API key by making test API call
 * 4. Save to .retellrc.json
 * 5. Display success message with next steps
 */
export async function loginCommand(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    // Check if config already exists
    if (configFileExists()) {
      const overwrite = await rl.question('Config already exists. Overwrite? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        rl.close();
        outputJson({ message: 'Login cancelled' });
        return;
      }
    }

    // Prompt for API key
    const apiKey = await rl.question('Enter your Retell API key: ');
    rl.close();

    // Validate that key is not empty
    if (!apiKey || apiKey.trim() === '') {
      outputJson({
        error: 'API key cannot be empty',
        code: 'INVALID_INPUT',
      });
      process.exit(1);
      return; // For testing - ensures function stops even if exit is mocked
    }

    // Validate by testing API call
    const testClient = new Retell({ apiKey: apiKey.trim() });
    await testClient.agent.list({ limit: 1 }); // Throws AuthenticationError if invalid

    // Save to config
    saveConfig({ apiKey: apiKey.trim(), defaultFormat: 'json' });

    // Success message with next steps
    outputJson({
      message: 'Successfully authenticated!',
      configPath: './.retellrc.json',
      nextSteps: [
        'Try: retell agents list',
        'Try: retell transcripts list',
      ],
    });
  } catch (error) {
    rl.close();
    handleSdkError(error);
  }
}
