/**
 * Chat Agents Update Command
 *
 * Updates a chat agent. Body must come from a JSON file.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonFile } from "../../services/json-arg";
import type { ChatAgentUpdateParams } from "retell-sdk/resources/chat-agent";

export interface UpdateChatAgentOptions {
  file: string;
  fields?: string;
}

export async function updateChatAgentCommand(
  agentId: string,
  options: UpdateChatAgentOptions,
): Promise<void> {
  try {
    const body = readJsonFile(options.file, "--file") as ChatAgentUpdateParams;

    const client = getRetellClient();
    const agent = await client.chatAgent.update(agentId, body);

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
