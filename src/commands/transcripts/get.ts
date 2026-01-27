/**
 * Get Call Command
 *
 * Retrieves detailed transcript for a specific call.
 * Usage: retell transcripts get <call_id>
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

// ===== TYPES =====

export interface GetTranscriptOptions {
  fields?: string;
}

// ===== COMMAND IMPLEMENTATION =====

/**
 * Get a specific call transcript
 *
 * @param callId The call ID to retrieve
 * @param options Command options (fields)
 */
export async function getTranscriptCommand(
  callId: string,
  options: GetTranscriptOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();

    // Retrieve the call from the API
    const call = await client.call.retrieve(callId);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          call,
          options.fields.split(",").map((f) => f.trim()),
        )
      : call;

    // Output the call object as JSON
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
