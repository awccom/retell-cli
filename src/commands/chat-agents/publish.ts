/**
 * Chat Agents Publish Command
 *
 * Publishes the draft configuration of a chat agent (makes it live).
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function publishChatAgentCommand(agentId: string): Promise<void> {
  try {
    const client = getRetellClient();
    await client.chatAgent.publish(agentId);

    outputJson({
      message: "Chat agent published successfully",
      agent_id: agentId,
      operation: "publish",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
