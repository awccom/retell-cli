/**
 * Conversation Flow List Command
 *
 * Lists all conversation flows.
 * Usage: retell flows list [--limit <number>] [--fields <fields>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { ListFlowsOptions } from "../../types/flows";

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

    // Call the SDK to list conversation flows
    const flows = await client.conversationFlow.list({
      limit: options.limit || 100,
    });

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          flows,
          options.fields.split(",").map((f) => f.trim()),
        )
      : flows;

    // Output as JSON
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
