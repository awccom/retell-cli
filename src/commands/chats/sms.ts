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
import { loadJsonArg, loadStringRecordArg } from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
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
      from_number: requireNonEmpty(options.fromNumber, "--from-number"),
      to_number: requireNonEmpty(options.toNumber, "--to-number"),
    };

    if (options.overrideAgentId)
      params.override_agent_id = options.overrideAgentId;
    if (options.overrideAgentVersion !== undefined) {
      params.override_agent_version = parseNumericFlag(
        options.overrideAgentVersion,
        "--override-agent-version",
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
