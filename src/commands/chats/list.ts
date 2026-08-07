/**
 * Chats List Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import {
  parseNonNegativeIntegerFlag,
  parsePositiveIntegerFlag,
} from "../../services/numeric-flag";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "../../services/paginated-response";
import { loadListFilter } from "../../services/list-filter";
import type { ChatListParams } from "retell-sdk/resources/chat";

export interface ListChatsOptions {
  limit?: string;
  paginationKey?: string;
  sortOrder?: string;
  skip?: string;
  includeTotal?: boolean;
  filter?: string;
  filterFile?: string;
  fields?: string;
}

export async function listChatsCommand(
  options: ListChatsOptions = {},
): Promise<void> {
  try {
    if (options.skip !== undefined && options.paginationKey !== undefined) {
      throwValidation("--skip and --pagination-key cannot be used together");
    }

    const query: ChatListParams = {};
    if (options.limit !== undefined) {
      query.limit = parsePositiveIntegerFlag(options.limit, "--limit");
    }
    if (options.paginationKey !== undefined) {
      query.pagination_key = options.paginationKey;
    }
    if (options.skip !== undefined) {
      query.skip = parseNonNegativeIntegerFlag(options.skip, "--skip");
    }
    if (options.sortOrder !== undefined) {
      if (!["ascending", "descending"].includes(options.sortOrder)) {
        throwValidation("--sort-order must be 'ascending' or 'descending'");
      }
      query.sort_order = options.sortOrder as "ascending" | "descending";
    }
    if (options.includeTotal) query.include_total = true;

    const filter = loadListFilter(options);
    if (filter) {
      query.filter_criteria = filter as ChatListParams["filter_criteria"];
    }

    const client = getRetellClient();
    const response = await client.chat.list(query);
    const chats = getPaginatedItems(response);
    const output = options.fields
      ? filterFields(
          chats,
          options.fields.split(",").map((field) => field.trim()),
        )
      : chats;

    outputJson(withPaginationMetadata(response, output));
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
