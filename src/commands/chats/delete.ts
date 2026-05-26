import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function deleteChatCommand(chatId: string): Promise<void> {
  try {
    const client = getRetellClient();
    await client.chat.delete(chatId);

    outputJson({
      message: "Chat deleted successfully",
      chat_id: chatId,
      operation: "delete",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
