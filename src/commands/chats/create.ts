/**
 * Chats Create Command
 *
 * Starts a new chat session with a chat agent.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg, loadStringRecordArg } from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
import type { ChatCreateParams } from "retell-sdk/resources/chat";

export interface CreateChatOptions {
  agentId: string;
  agentVersion?: string;
  metadata?: string;
  dynamicVariables?: string;
  fields?: string;
}

export async function createChatCommand(
  options: CreateChatOptions,
): Promise<void> {
  try {
    const params: ChatCreateParams = {
      agent_id: requireNonEmpty(options.agentId, "--agent-id"),
    };

    if (options.agentVersion !== undefined) {
      params.agent_version = parseNumericFlag(
        options.agentVersion,
        "--agent-version",
      );
    }

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadStringRecordArg(
      options.dynamicVariables,
      "--dynamic-variables",
    );
    if (dv !== undefined) params.retell_llm_dynamic_variables = dv;

    const client = getRetellClient();
    const chat = await client.chat.create(params);

    const output = options.fields
      ? filterFields(
          chat,
          options.fields.split(",").map((f) => f.trim()),
        )
      : chat;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
