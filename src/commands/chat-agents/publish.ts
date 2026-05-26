/**
 * Chat Agents Publish Command
 *
 * Publishes the draft configuration of a chat agent (makes it live).
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";
import { findNewestUnpublishedVersion } from "../../services/version-selection";

export interface PublishChatAgentOptions {
  version?: string;
  description?: string;
}

export async function publishChatAgentCommand(
  agentId: string,
  options: PublishChatAgentOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const version =
      options.version !== undefined
        ? parsePositiveIntegerFlag(options.version, "--version")
        : findNewestUnpublishedVersion(
            await client.chatAgent.getVersions(agentId),
            "chat agent",
          );

    await client.chatAgent.publish(agentId, {
      version,
      ...(options.description
        ? { version_description: options.description }
        : {}),
    });

    outputJson({
      message: "Chat agent published successfully",
      agent_id: agentId,
      version,
      operation: "publish",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
