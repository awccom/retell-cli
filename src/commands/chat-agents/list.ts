/**
 * Chat Agents List Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { parseNumericFlag } from "../../services/numeric-flag";
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
      query.limit = parseNumericFlag(options.limit, "--limit");
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.paginationKeyVersion !== undefined) {
      query.pagination_key_version = parseNumericFlag(
        options.paginationKeyVersion,
        "--pagination-key-version",
      );
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
