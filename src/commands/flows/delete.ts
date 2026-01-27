/**
 * Conversation Flow Delete Command
 *
 * Deletes a conversation flow by ID.
 * Usage: retell flows delete <conversation_flow_id>
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";
import type { FlowMutationOutput } from "../../types/flows";

/**
 * Delete a conversation flow
 *
 * @param conversationFlowId The conversation flow ID to delete
 */
export async function deleteFlowCommand(
  conversationFlowId: string,
): Promise<void> {
  try {
    const client = getRetellClient();

    // Delete the conversation flow
    await client.conversationFlow.delete(conversationFlowId);

    const output: FlowMutationOutput = {
      message: "Conversation flow deleted successfully",
      conversation_flow_id: conversationFlowId,
      operation: "delete",
    };

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
