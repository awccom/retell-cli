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

const CHAT_AGENT_FILTER = {
  filter_criteria: {
    channel: {
      op: "eq" as const,
      type: "string" as const,
      value: "chat" as const,
    },
  },
};

export interface ListChatAgentsOptions {
  limit?: string;
  paginationKey?: string;
  fields?: string;
}

export async function listChatAgentsCommand(
  options: ListChatAgentsOptions = {},
): Promise<void> {
  try {
    const query: ChatAgentListParams = { ...CHAT_AGENT_FILTER };
    if (options.limit !== undefined) {
      query.limit = parseNumericFlag(options.limit, "--limit");
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;

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
