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
import { readJsonObjectFile } from "../../services/json-arg";
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
    const rawBody = readJsonObjectFile(options.file, "--file");
    if (Object.keys(rawBody).length === 0) {
      const err = new Error(
        "--file body is empty. Pass at least one mutation field (e.g. agent_name, response_engine).",
      );
      err.name = "ValidationError";
      throw err;
    }
    const body = rawBody as unknown as ChatAgentUpdateParams;

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
