import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";

export interface DeleteAgentVersionOptions {
  version: string;
}

export async function deleteAgentVersionCommand(
  agentId: string,
  options: DeleteAgentVersionOptions,
): Promise<void> {
  try {
    const version = parsePositiveIntegerFlag(options.version, "--version");
    const client = getRetellClient();
    await client.agent.deleteVersion(agentId, { version });

    outputJson({
      message: "Agent version deleted successfully",
      agent_id: agentId,
      version,
      operation: "delete-version",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
