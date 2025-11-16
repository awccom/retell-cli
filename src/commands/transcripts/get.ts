/**
 * Get Call Command
 *
 * Retrieves detailed transcript for a specific call.
 * Usage: retell transcripts get <call_id>
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

// ===== COMMAND IMPLEMENTATION =====

/**
 * Get a specific call transcript
 *
 * @param callId The call ID to retrieve
 */
export async function getTranscriptCommand(callId: string): Promise<void> {
  try {
    const client = getRetellClient();

    // Retrieve the call from the API
    const call = await client.call.retrieve(callId);

    // Output the full call object as JSON
    outputJson(call);
  } catch (error) {
    handleSdkError(error);
  }
}
