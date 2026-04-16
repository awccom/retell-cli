/**
 * Calls Delete Command
 *
 * Deletes a call and its associated data.
 * Usage: retell calls delete <call_id>
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function deleteCallCommand(callId: string): Promise<void> {
  try {
    const client = getRetellClient();
    await client.call.delete(callId);

    outputJson({
      message: "Call deleted successfully",
      call_id: callId,
      operation: "delete",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
