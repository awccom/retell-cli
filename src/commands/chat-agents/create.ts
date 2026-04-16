/**
 * Chat Agents Create Command
 *
 * Creates a new chat agent. Requires exactly one response-engine flag or a
 * full body via --file.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonFile } from "../../services/json-arg";
import type { ChatAgentCreateParams } from "retell-sdk/resources/chat-agent";

export interface CreateChatAgentOptions {
  file?: string;
  name?: string;
  llmId?: string;
  flowId?: string;
  customLlm?: string;
  fields?: string;
}

export async function createChatAgentCommand(
  options: CreateChatAgentOptions = {},
): Promise<void> {
  try {
    let params: ChatAgentCreateParams;

    if (options.file) {
      params = readJsonFile(options.file, "--file") as ChatAgentCreateParams;
    } else {
      const engineCount = [
        options.llmId,
        options.flowId,
        options.customLlm,
      ].filter(Boolean).length;
      if (engineCount === 0) {
        throwValidation(
          "Must specify one of: --llm-id, --flow-id, or --custom-llm (or use --file)",
        );
      }
      if (engineCount > 1) {
        throwValidation(
          "Only one of --llm-id, --flow-id, or --custom-llm can be specified",
        );
      }

      let responseEngine: ChatAgentCreateParams["response_engine"];
      if (options.llmId) {
        responseEngine = { type: "retell-llm", llm_id: options.llmId };
      } else if (options.flowId) {
        responseEngine = {
          type: "conversation-flow",
          conversation_flow_id: options.flowId,
        };
      } else {
        responseEngine = {
          type: "custom-llm",
          llm_websocket_url: options.customLlm!,
        };
      }

      params = { response_engine: responseEngine };
      if (options.name) params.agent_name = options.name;
    }

    const client = getRetellClient();
    const agent = await client.chatAgent.create(params);

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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
