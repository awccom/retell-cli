/**
 * List Calls Command
 *
 * Lists all call transcripts with optional filtering and pagination.
 * Usage: retell transcripts list [--limit <number>]
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

// ===== TYPES =====

export interface ListTranscriptsOptions {
  limit?: number;
}

// ===== COMMAND IMPLEMENTATION =====

/**
 * List all call transcripts
 *
 * @param options Command options (limit)
 */
export async function listTranscriptsCommand(options: ListTranscriptsOptions): Promise<void> {
  try {
    const client = getRetellClient();

    // Call the SDK to list calls
    const calls = await client.call.list({
      limit: options.limit || 50,
    });

    // Output as JSON
    outputJson(calls);
  } catch (error) {
    handleSdkError(error);
  }
}
