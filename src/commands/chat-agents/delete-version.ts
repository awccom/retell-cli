import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";

export interface DeleteChatAgentVersionOptions {
  version: string;
}

export async function deleteChatAgentVersionCommand(
  agentId: string,
  options: DeleteChatAgentVersionOptions,
): Promise<void> {
  try {
    const version = parsePositiveIntegerFlag(options.version, "--version");
    const client = getRetellClient();
    await client.chatAgent.deleteVersion(agentId, { version });

    outputJson({
      message: "Chat agent version deleted successfully",
      agent_id: agentId,
      version,
      operation: "delete-version",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
