/**
 * Chat Agents Get Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetChatAgentOptions {
  version?: string;
  fields?: string;
}

export async function getChatAgentCommand(
  agentId: string,
  options: GetChatAgentOptions = {},
): Promise<void> {
  try {
    const query: { version?: number } = {};
    if (options.version !== undefined) {
      const v = Number(options.version);
      if (isNaN(v)) throwValidation("--version must be a number");
      query.version = v;
    }

    const client = getRetellClient();
    const agent = await client.chatAgent.retrieve(agentId, query as any);

    const output = options.fields
      ? filterFields(
          agent,
          options.fields.split(",").map((f) => f.trim()),
        )
      : agent;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
