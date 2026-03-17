/**
 * Conversation Flow Update Command
 *
 * Updates an existing conversation flow from a JSON file.
 * Usage: retell flows update <conversation_flow_id> --file <path> [--engine-version <number>]
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type { UpdateFlowOptions, FlowMutationOutput } from "../../types/flows";

/**
 * Update an existing conversation flow
 *
 * @param conversationFlowId The conversation flow ID
 * @param options Command options
 */
export async function updateFlowCommand(
  conversationFlowId: string,
  options: UpdateFlowOptions,
): Promise<void> {
  try {
    // Validate file exists
    if (!existsSync(options.file)) {
      outputError(`Flow file not found: ${options.file}`, "FILE_NOT_FOUND");
      return;
    }

    // Parse flow updates
    let flowUpdates: Record<string, unknown>;
    try {
      const content = readFileSync(options.file, "utf-8");
      flowUpdates = JSON.parse(content);
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        outputError(
          `Invalid JSON in flow file: ${error.message}`,
          "INVALID_JSON",
        );
      } else if (error instanceof Error) {
        outputError(
          `Error reading flow file: ${error.message}`,
          "FILE_READ_ERROR",
        );
      }
      return;
    }

    // Add version if specified
    if (options.version !== undefined) {
      flowUpdates.version = options.version;
    }

    const client = getRetellClient();

    // Update the conversation flow
    const flow = await client.conversationFlow.update(
      conversationFlowId,
      flowUpdates as any,
    );

    const output: FlowMutationOutput = {
      message: "Conversation flow updated successfully",
      conversation_flow_id: flow.conversation_flow_id,
      version: flow.version,
      operation: "update",
    };

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
