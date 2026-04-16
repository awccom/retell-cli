/**
 * Flag Guards
 *
 * Shared validators for CLI flag values that flow into SDK params.
 * Commander treats `--flag ""` as a defined string, so required-field
 * assignments pass empty strings straight through to the SDK unless
 * guarded here.
 */

export function requireNonEmpty(value: string, flagName: string): string {
  if (value.trim() === "") {
    throwValidation(`${flagName} must not be empty`);
  }
  return value;
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
