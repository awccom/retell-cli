import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";

export interface CreateChatAgentVersionOptions {
  baseVersion: string;
}

export async function createChatAgentVersionCommand(
  agentId: string,
  options: CreateChatAgentVersionOptions,
): Promise<void> {
  try {
    const client = getRetellClient();
    const version = await client.chatAgent.createVersion(agentId, {
      base_version: parsePositiveIntegerFlag(
        options.baseVersion,
        "--base-version",
      ),
    });

    outputJson(version);
  } catch (error) {
    handleSdkError(error);
  }
}
