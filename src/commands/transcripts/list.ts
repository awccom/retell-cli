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

// ===== TYPES =====

export interface ListTranscriptsOptions {
  limit?: number;
  fields?: string;
}

function getCallItems(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (
    response &&
    typeof response === "object" &&
    Array.isArray((response as { items?: unknown }).items)
  ) {
    return (response as { items: unknown[] }).items;
  }
  return [];
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
    const calls = getCallItems(response);

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
