/**
 * Chats Complete Command
 *
 * Sends a user message to an existing chat and gets the agent's completion.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ChatCompleteOptions {
  chatId: string;
  content: string;
  fields?: string;
}

export async function chatCompleteCommand(
  options: ChatCompleteOptions,
): Promise<void> {
  try {
    const client = getRetellClient();
    const result = await client.chat.createChatCompletion({
      chat_id: options.chatId,
      content: options.content,
    });

    const output = options.fields
      ? filterFields(
          result,
          options.fields.split(",").map((f) => f.trim()),
        )
      : result;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
