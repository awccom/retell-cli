/**
 * Chats SMS Command
 *
 * Creates an SMS-backed chat session.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg } from "../../services/json-arg";
import type { ChatCreateSMSChatParams } from "retell-sdk/resources/chat";

export interface CreateSmsChatOptions {
  fromNumber: string;
  toNumber: string;
  overrideAgentId?: string;
  overrideAgentVersion?: string;
  metadata?: string;
  dynamicVariables?: string;
  fields?: string;
}

export async function createSmsChatCommand(
  options: CreateSmsChatOptions,
): Promise<void> {
  try {
    const params: ChatCreateSMSChatParams = {
      from_number: options.fromNumber,
      to_number: options.toNumber,
    };

    if (options.overrideAgentId)
      params.override_agent_id = options.overrideAgentId;
    if (options.overrideAgentVersion !== undefined) {
      const v = Number(options.overrideAgentVersion);
      if (isNaN(v))
        throwValidation("--override-agent-version must be a number");
      params.override_agent_version = v;
    }

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadJsonArg(options.dynamicVariables, "--dynamic-variables");
    if (dv !== undefined)
      params.retell_llm_dynamic_variables = dv as Record<string, unknown>;

    const client = getRetellClient();
    const chat = await client.chat.createSMSChat(params);

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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
