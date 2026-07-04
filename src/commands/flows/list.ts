/**
 * Conversation Flow List Command
 *
 * Lists all conversation flows.
 * Usage: retell flows list [--limit <number>] [--pagination-key <key>] [--sort-order <order>] [--fields <fields>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "../../services/paginated-response";
import type { ListFlowsOptions } from "../../types/flows";
import type { ConversationFlowListParams } from "retell-sdk/resources/conversation-flow";

/**
 * List all conversation flows
 *
 * @param options Command options
 */
export async function listFlowsCommand(
  options: ListFlowsOptions,
): Promise<void> {
  try {
    const client = getRetellClient();
    const query: ConversationFlowListParams = {
      limit: options.limit || 100,
    };
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.sortOrder) {
      if (!["ascending", "descending"].includes(options.sortOrder)) {
        throwValidation("--sort-order must be 'ascending' or 'descending'");
      }
      query.sort_order = options.sortOrder as "ascending" | "descending";
    }

    // Call the SDK to list conversation flows
    const response = await client.conversationFlow.list(query);
    const flows = getPaginatedItems(response);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          flows,
          options.fields.split(",").map((f) => f.trim()),
        )
      : flows;

    // Output as JSON
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
