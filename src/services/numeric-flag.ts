/**
 * Numeric Flag Helper
 *
 * Parses CLI flag values that must be numbers. Rejects empty/whitespace-only
 * strings, since `Number("")` and `Number(" ")` both silently return 0.
 */

export function parseNumericFlag(value: string, flagName: string): number {
  if (value.trim() === "") {
    throwValidation(`${flagName} must be a number`);
  }
  const v = Number(value);
  if (!Number.isFinite(v)) {
    throwValidation(`${flagName} must be a number`);
  }
  return v;
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
