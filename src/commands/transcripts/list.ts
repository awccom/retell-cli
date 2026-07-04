/**
 * List Calls Command
 *
 * Lists all call transcripts with optional filtering and pagination.
 * Usage: retell transcripts list [--limit <number>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { getPaginatedItems } from "../../services/paginated-response";

// ===== TYPES =====

export interface ListTranscriptsOptions {
  limit?: number;
  fields?: string;
}

// ===== COMMAND IMPLEMENTATION =====

/**
 * List all call transcripts
 *
 * @param options Command options (limit)
 */
export async function listTranscriptsCommand(
  options: ListTranscriptsOptions,
): Promise<void> {
  try {
    const client = getRetellClient();

    // Call the SDK to list calls
    const response = await client.call.list({
      limit: options.limit || 50,
    });
    const calls = getPaginatedItems(response);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          calls,
          options.fields.split(",").map((f) => f.trim()),
        )
      : calls;

    // Output as JSON
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
