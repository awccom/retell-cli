/**
 * Calls Stop Command
 *
 * Stops an ongoing call.
 * Usage: retell calls stop <call_id>
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function stopCallCommand(callId: string): Promise<void> {
  try {
    const client = getRetellClient();
    await client.call.stop(callId);

    outputJson({
      message: "Call stopped successfully",
      call_id: callId,
      operation: "stop",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
