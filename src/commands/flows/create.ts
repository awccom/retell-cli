/**
 * Conversation Flow Create Command
 *
 * Creates a new conversation flow from a JSON file.
 * Usage: retell flows create --file <path>
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type { CreateFlowOptions, FlowMutationOutput } from "../../types/flows";

/**
 * Create a new conversation flow
 *
 * @param options Command options
 */
export async function createFlowCommand(
  options: CreateFlowOptions,
): Promise<void> {
  try {
    // Validate file exists
    if (!existsSync(options.file)) {
      outputError(`Flow file not found: ${options.file}`, "FILE_NOT_FOUND");
      return;
    }

    // Parse flow configuration
    let flowConfig: Record<string, unknown>;
    try {
      const content = readFileSync(options.file, "utf-8");
      flowConfig = JSON.parse(content);
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

    // Validate required fields
    if (!flowConfig.start_speaker) {
      outputError(
        'Flow configuration must have a "start_speaker" field (user or agent)',
        "INVALID_FLOW",
      );
      return;
    }

    const client = getRetellClient();

    // Create the conversation flow
    const flow = await client.conversationFlow.create(flowConfig as any);

    const output: FlowMutationOutput = {
      message: "Conversation flow created successfully",
      conversation_flow_id: flow.conversation_flow_id,
      version: flow.version,
      operation: "create",
    };

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
