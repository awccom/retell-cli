/**
 * Agent Create Command
 *
 * Creates a new agent with the specified configuration.
 * Usage: retell agents create --voice <voice_id> [options]
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface CreateAgentOptions {
  voice: string;
  name?: string;
  llmId?: string;
  flowId?: string;
  customLlm?: string;
  file?: string;
  fields?: string;
}

/**
 * Create a new agent
 *
 * @param options Command options
 */
export async function createAgentCommand(
  options: CreateAgentOptions,
): Promise<void> {
  try {
    const client = getRetellClient();

    let config: Record<string, unknown>;

    // If file provided, use that config
    if (options.file) {
      if (!existsSync(options.file)) {
        outputError(`Config file not found: ${options.file}`, "FILE_NOT_FOUND");
        return;
      }

      try {
        const content = readFileSync(options.file, "utf-8");
        config = JSON.parse(content);
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          outputError(
            `Invalid JSON in config file: ${error.message}`,
            "INVALID_JSON",
          );
        } else if (error instanceof Error) {
          outputError(
            `Error reading config file: ${error.message}`,
            "FILE_ERROR",
          );
        }
        return;
      }
    } else {
      // Build config from options
      // Count how many response engine types are specified
      const engineCount = [
        options.llmId,
        options.flowId,
        options.customLlm,
      ].filter(Boolean).length;

      if (engineCount === 0) {
        outputError(
          "Must specify one of: --llm-id, --flow-id, or --custom-llm",
          "MISSING_RESPONSE_ENGINE",
        );
        return;
      }

      if (engineCount > 1) {
        outputError(
          "Only one of --llm-id, --flow-id, or --custom-llm can be specified",
          "MULTIPLE_RESPONSE_ENGINES",
        );
        return;
      }

      // Build response engine based on type
      let responseEngine: Record<string, unknown>;

      if (options.llmId) {
        responseEngine = {
          type: "retell-llm",
          llm_id: options.llmId,
        };
      } else if (options.flowId) {
        responseEngine = {
          type: "conversation-flow",
          conversation_flow_id: options.flowId,
        };
      } else {
        responseEngine = {
          type: "custom-llm",
          llm_websocket_url: options.customLlm,
        };
      }

      config = {
        voice_id: options.voice,
        response_engine: responseEngine,
      };

      if (options.name) {
        config.agent_name = options.name;
      }
    }

    // Create the agent
    const agent = await client.agent.create(config as any);

    // Format output
    const output = options.fields
      ? filterFields(
          agent,
          options.fields.split(",").map((f) => f.trim()),
        )
      : agent;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
