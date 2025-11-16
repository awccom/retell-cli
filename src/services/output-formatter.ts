/**
 * Output Formatting Service
 *
 * Provides consistent JSON and error output formatting for the CLI.
 * All output goes to stdout, errors go to stderr.
 */

import Retell from 'retell-sdk';

// ===== HELPER FUNCTIONS =====

/**
 * Get a nested value from an object using dot notation
 *
 * @param obj The object to traverse
 * @param path Dot-separated path (e.g., "user.profile.name")
 * @returns The value at the path, or undefined if not found
 *
 * @example
 * getNestedValue({ user: { name: "John" } }, "user.name") // Returns "John"
 * getNestedValue({ data: [{ id: 1 }] }, "data.0.id") // Returns 1
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array indices
    if (Array.isArray(current)) {
      const index = parseInt(key, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else if (typeof current === 'object') {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 *
 * @param obj The object to modify
 * @param path Dot-separated path (e.g., "user.profile.name")
 * @param value The value to set
 *
 * @example
 * const obj = {};
 * setNestedValue(obj, "user.name", "John");
 * // obj is now { user: { name: "John" } }
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      // Determine if next key is an array index
      const nextKey = keys[keys.indexOf(key) + 1];
      const isNextKeyArrayIndex = nextKey && /^\d+$/.test(nextKey);
      current[key] = isNextKeyArrayIndex ? [] : {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

// ===== PUBLIC API =====

/**
 * Output data as pretty-printed JSON to stdout
 *
 * @param data Data to output as JSON
 */
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output an error message as JSON to stderr and exit with code 1
 *
 * @param error Error message or Error object
 * @param code Error code (defaults to 'UNKNOWN_ERROR')
 */
export function outputError(error: Error | string, code?: string): never {
  const errorObj = {
    error: typeof error === 'string' ? error : error.message,
    code: code || 'UNKNOWN_ERROR',
  };

  console.error(JSON.stringify(errorObj, null, 2));
  process.exit(1);
}

/**
 * Handle errors from the Retell SDK with appropriate error codes
 *
 * This function recognizes SDK error types and outputs user-friendly
 * error messages with appropriate error codes.
 *
 * @param error Unknown error (typically from a catch block)
 */
export function handleSdkError(error: unknown): never {
  // Handle Retell SDK errors
  if (error instanceof Retell.NotFoundError) {
    outputError('Resource not found', 'NOT_FOUND');
  }

  if (error instanceof Retell.AuthenticationError) {
    outputError(
      'Authentication failed. Invalid API key. Please run `retell login` to authenticate.',
      'AUTH_ERROR'
    );
  }

  if (error instanceof Retell.BadRequestError) {
    const message = error.message || 'Invalid request parameters';
    outputError(message, 'BAD_REQUEST');
  }

  if (error instanceof Retell.RateLimitError) {
    outputError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT');
  }

  if (error instanceof Retell.PermissionDeniedError) {
    outputError('Permission denied. Check your API key permissions.', 'PERMISSION_DENIED');
  }

  if (error instanceof Retell.InternalServerError) {
    outputError('Retell API server error. Please try again later.', 'SERVER_ERROR');
  }

  if (error instanceof Retell.APIConnectionError) {
    outputError('Failed to connect to Retell API. Check your network connection.', 'CONNECTION_ERROR');
  }

  if (error instanceof Retell.APIConnectionTimeoutError) {
    outputError('Request to Retell API timed out. Please try again.', 'TIMEOUT_ERROR');
  }

  if (error instanceof Retell.APIError) {
    // Generic API error
    const message = error.message || 'An API error occurred';
    outputError(message, 'API_ERROR');
  }

  // Non-SDK error
  if (error instanceof Error) {
    outputError(error.message, 'UNKNOWN_ERROR');
  }

  // Completely unknown error type
  outputError('An unexpected error occurred', 'UNKNOWN_ERROR');
}

/**
 * Output a success message (for operations that don't return data)
 *
 * @param message Success message
 * @param data Optional additional data
 */
export function outputSuccess(message: string, data?: Record<string, unknown>): void {
  const output = {
    message,
    ...data,
  };
  outputJson(output);
}

/**
 * Filter an object to include only specified fields
 *
 * Supports dot notation for nested fields (e.g., "user.profile.name").
 * Handles both objects and arrays gracefully.
 * Invalid or missing fields are skipped with a warning (unless strict mode is enabled).
 *
 * @param data The data to filter (object or array)
 * @param fields Array of field paths to include (supports dot notation)
 * @param options Optional configuration
 * @returns Filtered data containing only the specified fields
 *
 * @example
 * // Simple field selection
 * filterFields({ name: "John", age: 30, email: "john@example.com" }, ["name", "age"])
 * // Returns: { name: "John", age: 30 }
 *
 * @example
 * // Nested field selection
 * filterFields(
 *   { user: { profile: { name: "John", bio: "..." }, id: 123 } },
 *   ["user.profile.name", "user.id"]
 * )
 * // Returns: { user: { profile: { name: "John" }, id: 123 } }
 *
 * @example
 * // Array handling
 * filterFields([{ id: 1, name: "A" }, { id: 2, name: "B" }], ["name"])
 * // Returns: [{ name: "A" }, { name: "B" }]
 */
export function filterFields(
  data: any,
  fields: string[],
  options: { strict?: boolean } = {}
): any {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays - filter each element
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields, options));
  }

  // Handle non-object types - return as-is
  if (typeof data !== 'object') {
    return data;
  }

  // Filter object fields
  const result: any = {};
  const warnings: string[] = [];

  for (const field of fields) {
    const value = getNestedValue(data, field);

    if (value === undefined) {
      const warning = `Field '${field}' not found in data`;
      warnings.push(warning);

      if (options.strict) {
        throw new Error(warning);
      }

      // In non-strict mode, skip this field
      continue;
    }

    // Set the value in the result object
    setNestedValue(result, field, value);
  }

  // Log warnings to stderr if any (but don't fail)
  if (warnings.length > 0 && !options.strict) {
    console.warn(JSON.stringify({ warnings }, null, 2));
  }

  return result;
}
