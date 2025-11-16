/**
 * Output Formatting Service
 *
 * Provides consistent JSON and error output formatting for the CLI.
 * All output goes to stdout, errors go to stderr.
 */

import Retell from 'retell-sdk';

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
