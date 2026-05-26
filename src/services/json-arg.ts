/**
 * JSON Argument Helper
 *
 * Parses CLI flag values that accept inline JSON or a `@path` reference to a
 * JSON file. Used by commands that take metadata, dynamic variables, or other
 * structured request bodies.
 */

import { readFileSync, existsSync } from "fs";

/**
 * Parse a CLI flag value as JSON.
 *
 * Accepts:
 *   - `undefined` -> returns undefined (flag not provided)
 *   - `@/path/to/file.json` -> reads file, parses JSON
 *   - `{...}` / `[...]` / scalar JSON -> parses directly
 *
 * Throws a ValidationError with context on parse failure or missing file.
 */
export function loadJsonArg(
  value: string | undefined,
  flagName: string,
): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value.startsWith("@")) {
    const path = value.slice(1);
    if (path === "") {
      throwValidation(`${flagName}: empty path after @`);
    }
    if (!existsSync(path)) {
      throwValidation(`${flagName}: file not found: ${path}`);
    }
    let content: string;
    try {
      content = readFileSync(path, "utf-8");
    } catch (err) {
      throwValidation(
        `${flagName}: failed to read ${path}: ${(err as Error).message}`,
      );
    }
    try {
      return JSON.parse(content);
    } catch (err) {
      throwValidation(
        `${flagName}: invalid JSON in ${path}: ${(err as Error).message}`,
      );
    }
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    throwValidation(`${flagName}: invalid JSON: ${(err as Error).message}`);
  }
}

/**
 * Parse a CLI JSON flag and assert it is an object whose values are strings.
 * Retell dynamic-variable params are string-valued in the current SDK.
 */
export function loadStringRecordArg(
  value: string | undefined,
  flagName: string,
): Record<string, string> | undefined {
  const parsed = loadJsonArg(value, flagName);
  if (parsed === undefined) return undefined;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throwValidation(`${flagName} must be a JSON object`);
  }

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val !== "string") {
      throwValidation(`${flagName}.${key} must be a string`);
    }
    result[key] = val;
  }
  return result;
}

/**
 * Read and parse a JSON file from disk. Used for body-as-file flags.
 */
export function readJsonFile(path: string, flagName: string): unknown {
  if (!existsSync(path)) {
    throwValidation(`${flagName}: file not found: ${path}`);
  }
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch (err) {
    throwValidation(
      `${flagName}: failed to read ${path}: ${(err as Error).message}`,
    );
  }
  try {
    return JSON.parse(content);
  } catch (err) {
    throwValidation(
      `${flagName}: invalid JSON in ${path}: ${(err as Error).message}`,
    );
  }
}

/**
 * Read a JSON file and assert it parses to a plain object (not an array, null,
 * or scalar). For body-as-file flags whose SDK params are object-shaped.
 */
export function readJsonObjectFile(
  path: string,
  flagName: string,
): Record<string, unknown> {
  const parsed = readJsonFile(path, flagName);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throwValidation(
      `${flagName}: ${path} must contain a JSON object, not ${jsonKind(parsed)}`,
    );
  }
  return parsed as Record<string, unknown>;
}

function jsonKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
