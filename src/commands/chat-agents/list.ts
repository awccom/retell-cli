/**
 * Chat Agents List Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { ChatAgentListParams } from "retell-sdk/resources/chat-agent";

export interface ListChatAgentsOptions {
  limit?: string;
  paginationKey?: string;
  paginationKeyVersion?: string;
  fields?: string;
}

export async function listChatAgentsCommand(
  options: ListChatAgentsOptions = {},
): Promise<void> {
  try {
    const query: ChatAgentListParams = {};
    if (options.limit !== undefined) {
      const v = Number(options.limit);
      if (isNaN(v)) throwValidation("--limit must be a number");
      query.limit = v;
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.paginationKeyVersion !== undefined) {
      const v = Number(options.paginationKeyVersion);
      if (isNaN(v))
        throwValidation("--pagination-key-version must be a number");
      query.pagination_key_version = v;
    }

    const client = getRetellClient();
    const agents = await client.chatAgent.list(query);

    const output = options.fields
      ? filterFields(
          agents,
          options.fields.split(",").map((f) => f.trim()),
        )
      : agents;

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
