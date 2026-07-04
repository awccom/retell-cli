/**
 * Config File Management Service
 *
 * Manages Retell CLI configuration files and environment variable overrides.
 * Priority: RETELL_API_KEY > cwd .retellrc.json > home ~/.retellrc.json > XDG config.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  chmodSync,
  mkdirSync,
} from "fs";
import { dirname, join } from "path";
import * as os from "os";
import { z } from "zod";

// ===== CONFIG SCHEMA =====

export const ConfigSchema = z.object({
  apiKey: z.string().min(1, "API key cannot be empty"),
  defaultFormat: z.enum(["json", "text"]).default("json"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ConfigScope = "local" | "global" | "xdg";

export interface ConfigPathOptions {
  cwd?: string;
  homeDir?: string;
  xdgConfigHome?: string;
  scope?: ConfigScope;
}

// ===== CONSTANTS =====

const CONFIG_FILE_NAME = ".retellrc.json";
const XDG_CONFIG_FILE_NAME = "config.json";
const XDG_CONFIG_DIR_NAME = "retell";
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

function resolveCwd(options: ConfigPathOptions = {}): string {
  return options.cwd ?? process.cwd();
}

function resolveHomeDir(options: ConfigPathOptions = {}): string {
  return options.homeDir ?? os.homedir();
}

function resolveXdgConfigHome(options: ConfigPathOptions = {}): string {
  const xdgConfigHome = options.xdgConfigHome || process.env.XDG_CONFIG_HOME;
  return xdgConfigHome || join(resolveHomeDir(options), ".config");
}

/**
 * Get the path to the cwd-local config file.
 */
export function getLocalConfigFilePath(
  options: ConfigPathOptions = {},
): string {
  return join(resolveCwd(options), CONFIG_FILE_NAME);
}

/**
 * Get the path to the home/global config file.
 */
export function getHomeConfigFilePath(options: ConfigPathOptions = {}): string {
  return join(resolveHomeDir(options), CONFIG_FILE_NAME);
}

/**
 * Get the path to the optional XDG config file.
 */
export function getXdgConfigFilePath(options: ConfigPathOptions = {}): string {
  return join(
    resolveXdgConfigHome(options),
    XDG_CONFIG_DIR_NAME,
    XDG_CONFIG_FILE_NAME,
  );
}

/**
 * Get config search paths in precedence order, excluding env var.
 */
export function getConfigSearchPaths(
  options: ConfigPathOptions = {},
): string[] {
  return [
    getLocalConfigFilePath(options),
    getHomeConfigFilePath(options),
    getXdgConfigFilePath(options),
  ];
}

function getConfigPathForScope(options: ConfigPathOptions = {}): string {
  switch (options.scope ?? "global") {
    case "global":
      return getHomeConfigFilePath(options);
    case "xdg":
      return getXdgConfigFilePath(options);
    case "local":
    default:
      return getLocalConfigFilePath(options);
  }
}

/**
 * Read and parse one config file.
 */
function readConfigFile(configPath: string): Config | null {
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
        `Invalid config file format at ${configPath}: ${error.errors
          .map((e) => e.message)
          .join(", ")}`,
        "INVALID_CONFIG",
      );
    }
    if (error instanceof SyntaxError) {
      throw new ConfigError(
        `Config file contains invalid JSON at ${configPath}: ${error.message}`,
        "INVALID_JSON",
      );
    }
    throw error;
  }
}

/**
 * Get API key from environment variable.
 */
function getApiKeyFromEnv(): string | null {
  return process.env.RETELL_API_KEY || null;
}

// ===== PUBLIC API =====

/**
 * Get the current configuration.
 *
 * Priority order:
 * 1. RETELL_API_KEY environment variable
 * 2. .retellrc.json in current directory
 * 3. ~/.retellrc.json
 * 4. ~/.config/retell/config.json or $XDG_CONFIG_HOME/retell/config.json
 * 5. Throw error (user must run `retell login`)
 *
 * @throws {ConfigError} If no config is found
 */
export function getConfig(options: ConfigPathOptions = {}): Config {
  // 1. Check environment variable
  const envApiKey = getApiKeyFromEnv();
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      defaultFormat: "json", // Default when using env var
    };
  }

  // 2. Check config files in precedence order
  for (const configPath of getConfigSearchPaths(options)) {
    const fileConfig = readConfigFile(configPath);
    if (fileConfig) {
      return fileConfig;
    }
  }

  // 3. No config found
  throw new ConfigError(
    `No configuration found. Please run \`retell login\` to authenticate. Checked: ${getConfigSearchPaths(
      options,
    ).join(", ")}`,
    "NO_CONFIG",
  );
}

/**
 * Save configuration to a config file.
 *
 * Defaults to the home/global config because the CLI is commonly installed globally.
 * Use { scope: "local" } to write a cwd-local .retellrc.json for project overrides.
 *
 * @param config Configuration to save
 * @param options Path/scope options
 * @throws {ConfigError} If validation fails
 */
export function saveConfig(
  config: Partial<Config>,
  options: ConfigPathOptions = { scope: "global" },
): string {
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

  const configPath = getConfigPathForScope({ scope: "global", ...options });

  // Write file
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2), {
      encoding: "utf-8",
    });

    // Set restrictive permissions (600 = rw-------)
    chmodSync(configPath, CONFIG_FILE_PERMISSIONS);
    return configPath;
  } catch (error: any) {
    throw new ConfigError(
      `Failed to save config: ${error.message}`,
      "WRITE_ERROR",
    );
  }
}

/**
 * Check if a config file exists for a given scope.
 */
export function configFileExists(options: ConfigPathOptions = {}): boolean {
  return existsSync(getConfigPathForScope(options));
}

/**
 * Get the path to a config file for a given scope.
 */
export function getConfigFilePath(options: ConfigPathOptions = {}): string {
  return getConfigPathForScope(options);
}

/**
 * Check if running with environment variable override.
 */
export function isUsingEnvVar(): boolean {
  return getApiKeyFromEnv() !== null;
}
