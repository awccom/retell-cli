/**
 * Chats End Command
 *
 * Ends an active chat session.
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function endChatCommand(chatId: string): Promise<void> {
  try {
    const client = getRetellClient();
    await client.chat.end(chatId);

    outputJson({
      message: "Chat ended successfully",
      chat_id: chatId,
      operation: "end",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
