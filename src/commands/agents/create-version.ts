import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";

export interface CreateAgentVersionOptions {
  baseVersion: string;
}

export async function createAgentVersionCommand(
  agentId: string,
  options: CreateAgentVersionOptions,
): Promise<void> {
  try {
    const client = getRetellClient();
    const version = await client.agent.createVersion(agentId, {
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
