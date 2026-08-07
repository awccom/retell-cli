/**
 * Rerun Chat Analysis Command
 *
 * Reruns paid post-chat analysis for an ended chat.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  filterFields,
  handleSdkError,
  outputJson,
} from "../../services/output-formatter";

export interface RerunChatAnalysisOptions {
  fields?: string;
}

export async function rerunChatAnalysisCommand(
  chatId: string,
  options: RerunChatAnalysisOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const result = await client.chat.rerunAnalysis(chatId);
    const output = options.fields
      ? filterFields(
          result,
          options.fields.split(",").map((field) => field.trim()),
        )
      : result;
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
