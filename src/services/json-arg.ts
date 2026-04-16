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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
