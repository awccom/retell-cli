/**
 * Flow Components List Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "../../services/paginated-response";
import type { ConversationFlowComponentListParams } from "retell-sdk/resources/conversation-flow-component";

export interface ListFlowComponentsOptions {
  limit?: string;
  paginationKey?: string;
  sortOrder?: string;
  fields?: string;
}

export async function listFlowComponentsCommand(
  options: ListFlowComponentsOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const query: ConversationFlowComponentListParams = {};
    if (options.limit !== undefined) {
      query.limit = parsePositiveIntegerFlag(options.limit, "--limit");
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.sortOrder) {
      if (!["ascending", "descending"].includes(options.sortOrder)) {
        throwValidation("--sort-order must be 'ascending' or 'descending'");
      }
      query.sort_order = options.sortOrder as "ascending" | "descending";
    }
    const response = await client.conversationFlowComponent.list(query);
    const items = getPaginatedItems(response);

    const output = options.fields
      ? filterFields(
          items,
          options.fields.split(",").map((f) => f.trim()),
        )
      : items;

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
