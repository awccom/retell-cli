/**
 * Chat Agents Versions Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ChatAgentVersionsOptions {
  fields?: string;
}

export async function chatAgentVersionsCommand(
  agentId: string,
  options: ChatAgentVersionsOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const versions = await client.chatAgent.getVersions(agentId);

    const output = options.fields
      ? filterFields(
          versions,
          options.fields.split(",").map((f) => f.trim()),
        )
      : versions;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
