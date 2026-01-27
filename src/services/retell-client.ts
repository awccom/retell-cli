/**
 * Retell Client Service (Singleton)
 *
 * Provides a singleton instance of the Retell SDK client configured with
 * the API key from the config service.
 */

import Retell from "retell-sdk";
import { getConfig, ConfigError } from "./config";

// ===== SINGLETON STATE =====

let clientInstance: Retell | null = null;

// ===== CLIENT CONFIGURATION =====

const CLIENT_CONFIG = {
  maxRetries: 2, // Retry failed requests 2 times (SDK default)
  timeout: 60000, // 60 second timeout (SDK default)
};

// ===== PUBLIC API =====

/**
 * Get the singleton Retell client instance
 *
 * The client is configured with:
 * - API key from config service (env var or .retellrc.json)
 * - 2 automatic retries with exponential backoff
 * - 60 second timeout
 *
 * @throws {ConfigError} If no API key is configured
 * @returns {Retell} Configured Retell SDK client
 */
export function getRetellClient(): Retell {
  if (!clientInstance) {
    // Get API key from config service
    let apiKey: string;
    try {
      const config = getConfig();
      apiKey = config.apiKey;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error; // Re-throw config errors
      }
      throw new Error(
        `Failed to initialize Retell client: ${(error as Error).message}`,
      );
    }

    // Initialize client
    clientInstance = new Retell({
      apiKey,
      maxRetries: CLIENT_CONFIG.maxRetries,
      timeout: CLIENT_CONFIG.timeout,
    });
  }

  return clientInstance;
}

/**
 * Reset the singleton client instance
 *
 * This is primarily used for testing to ensure a fresh client instance.
 * In production, this should rarely be needed.
 */
export function resetClient(): void {
  clientInstance = null;
}

/**
 * Check if the client has been initialized
 *
 * @returns {boolean} True if client instance exists
 */
export function isClientInitialized(): boolean {
  return clientInstance !== null;
}
