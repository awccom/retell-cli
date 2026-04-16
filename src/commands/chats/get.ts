/**
 * Chats Get Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetChatOptions {
  fields?: string;
}

export async function getChatCommand(
  chatId: string,
  options: GetChatOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const chat = await client.chat.retrieve(chatId);

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
