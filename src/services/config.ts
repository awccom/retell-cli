/**
 * Config File Management Service
 *
 * Manages the .retellrc.json configuration file and environment variable overrides.
 * Priority: ENV VAR > .retellrc.json > prompt user
 */

import { readFileSync, writeFileSync, existsSync, chmodSync } from "fs";
import { join } from "path";
import { z } from "zod";

// ===== CONFIG SCHEMA =====

export const ConfigSchema = z.object({
  apiKey: z.string().min(1, "API key cannot be empty"),
  defaultFormat: z.enum(["json", "text"]).default("json"),
});

export type Config = z.infer<typeof ConfigSchema>;

// ===== CONSTANTS =====

const CONFIG_FILE_NAME = ".retellrc.json";
const CONFIG_FILE_PERMISSIONS = 0o600; // Read/write for owner only

// ===== ERRORS =====

export class ConfigError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Get the path to the config file in the current working directory
 */
function getConfigPath(): string {
  return join(process.cwd(), CONFIG_FILE_NAME);
}

/**
 * Read and parse the config file
 */
function readConfigFile(): Config | null {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return ConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigError(
        `Invalid config file format: ${error.errors.map((e) => e.message).join(", ")}`,
        "INVALID_CONFIG",
      );
    }
    if (error instanceof SyntaxError) {
      throw new ConfigError(
        `Config file contains invalid JSON: ${error.message}`,
        "INVALID_JSON",
      );
    }
    throw error;
  }
}

/**
 * Get API key from environment variable
 */
function getApiKeyFromEnv(): string | null {
  return process.env.RETELL_API_KEY || null;
}

// ===== PUBLIC API =====

/**
 * Get the current configuration
 *
 * Priority order:
 * 1. RETELL_API_KEY environment variable
 * 2. .retellrc.json in current directory
 * 3. Throw error (user must run `retell login`)
 *
 * @throws {ConfigError} If no config is found
 */
export function getConfig(): Config {
  // 1. Check environment variable
  const envApiKey = getApiKeyFromEnv();
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      defaultFormat: "json", // Default when using env var
    };
  }

  // 2. Check config file
  const fileConfig = readConfigFile();
  if (fileConfig) {
    return fileConfig;
  }

  // 3. No config found
  throw new ConfigError(
    "No configuration found. Please run `retell login` to authenticate.",
    "NO_CONFIG",
  );
}

/**
 * Save configuration to .retellrc.json
 *
 * @param config Configuration to save
 * @throws {ConfigError} If validation fails
 */
export function saveConfig(config: Partial<Config>): void {
  // Validate config
  let validatedConfig: Config;
  try {
    validatedConfig = ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigError(
        `Invalid configuration: ${error.errors.map((e) => e.message).join(", ")}`,
        "INVALID_CONFIG",
      );
    }
    throw error;
  }

  const configPath = getConfigPath();

  // Write file
  try {
    writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2), {
      encoding: "utf-8",
    });

    // Set restrictive permissions (600 = rw-------)
    chmodSync(configPath, CONFIG_FILE_PERMISSIONS);
  } catch (error: any) {
    throw new ConfigError(
      `Failed to save config: ${error.message}`,
      "WRITE_ERROR",
    );
  }
}

/**
 * Check if a config file exists in the current directory
 */
export function configFileExists(): boolean {
  return existsSync(getConfigPath());
}

/**
 * Get the path to the config file
 */
export function getConfigFilePath(): string {
  return getConfigPath();
}

/**
 * Check if running with environment variable override
 */
export function isUsingEnvVar(): boolean {
  return getApiKeyFromEnv() !== null;
}
