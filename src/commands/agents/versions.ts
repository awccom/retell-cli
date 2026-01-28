/**
 * Agent Versions Command
 *
 * Lists all versions of an agent.
 * Usage: retell agents versions <agent_id>
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface AgentVersionsOptions {
  fields?: string;
}

/**
 * List all versions of an agent
 *
 * @param agentId The agent ID to get versions for
 * @param options Command options
 */
export async function agentVersionsCommand(
  agentId: string,
  options: AgentVersionsOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();

    const versions = await client.agent.getVersions(agentId);

    // Format output showing version details
    const formatted = versions.map((v) => ({
      version: v.version,
      is_published: v.is_published,
      agent_name: v.agent_name,
      last_modification_timestamp: v.last_modification_timestamp,
    }));

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          formatted,
          options.fields.split(",").map((f) => f.trim()),
        )
      : formatted;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
