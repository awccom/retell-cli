/**
 * Chat Agents Delete Command
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function deleteChatAgentCommand(agentId: string): Promise<void> {
  try {
    const client = getRetellClient();
    await client.chatAgent.delete(agentId);

    outputJson({
      message: "Chat agent deleted successfully",
      agent_id: agentId,
      operation: "delete",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
