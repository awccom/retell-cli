/**
 * Conversation Flow Get Command
 *
 * Gets a specific conversation flow by ID.
 * Usage: retell flows get <conversation_flow_id> [--engine-version <number>] [--fields <fields>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { GetFlowOptions } from "../../types/flows";

/**
 * Get a specific conversation flow
 *
 * @param conversationFlowId The conversation flow ID
 * @param options Command options
 */
export async function getFlowCommand(
  conversationFlowId: string,
  options: GetFlowOptions,
): Promise<void> {
  try {
    const client = getRetellClient();

    // Build retrieve options
    const retrieveOptions: { version?: number } = {};
    if (options.version !== undefined) {
      retrieveOptions.version = options.version;
    }

    // Call the SDK to get the conversation flow
    const flow = await client.conversationFlow.retrieve(
      conversationFlowId,
      retrieveOptions,
    );

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          flow,
          options.fields.split(",").map((f) => f.trim()),
        )
      : flow;

    // Output as JSON
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
