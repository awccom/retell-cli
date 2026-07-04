/**
 * Chats List Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { parseNumericFlag } from "../../services/numeric-flag";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "../../services/paginated-response";
import type { ChatListParams } from "retell-sdk/resources/chat";

export interface ListChatsOptions {
  limit?: string;
  paginationKey?: string;
  sortOrder?: string;
  fields?: string;
}

export async function listChatsCommand(
  options: ListChatsOptions = {},
): Promise<void> {
  try {
    const query: ChatListParams = {};
    if (options.limit !== undefined) {
      query.limit = parseNumericFlag(options.limit, "--limit");
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.sortOrder) {
      if (!["ascending", "descending"].includes(options.sortOrder))
        throwValidation("--sort-order must be 'ascending' or 'descending'");
      query.sort_order = options.sortOrder as "ascending" | "descending";
    }

    const client = getRetellClient();
    const response = await client.chat.list(query);
    const chats = getPaginatedItems(response);

    const output = options.fields
      ? filterFields(
          chats,
          options.fields.split(",").map((f) => f.trim()),
        )
      : chats;

    outputJson(withPaginationMetadata(response, output));
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
