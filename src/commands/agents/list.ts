/**
 * List Agents Command
 *
 * Lists all agents with formatted output showing key configuration fields.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ListAgentsOptions {
  limit?: number;
  fields?: string;
}

/**
 * List all agents with optional pagination
 *
 * Retrieves a list of agents from the Retell API and outputs them as formatted JSON.
 * Each agent entry includes basic information (ID, name, version, publish status) and
 * response engine configuration.
 *
 * @param options Command options
 * @param options.limit Maximum number of agents to retrieve (default: 100, must be positive)
 *
 * @throws {AuthenticationError} If the API key is invalid or missing
 * @throws {APIConnectionError} If there's a network error connecting to the API
 * @throws {RateLimitError} If the API rate limit is exceeded
 * @throws {APIError} For other API-related errors
 *
 * @example
 * // List agents with default limit (100)
 * await listAgentsCommand({});
 *
 * @example
 * // List agents with custom limit
 * await listAgentsCommand({ limit: 50 });
 */
export async function listAgentsCommand(
  options: ListAgentsOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();

    const agents = await client.agent.list({
      limit: options.limit || 100,
    });

    // Format for cleaner output
    const formatted = agents.map((agent) => {
      // Extract response engine ID based on type
      let response_engine_id: string;
      switch (agent.response_engine.type) {
        case "retell-llm":
          response_engine_id = agent.response_engine.llm_id || "unknown";
          break;
        case "conversation-flow":
          response_engine_id =
            agent.response_engine.conversation_flow_id || "unknown";
          break;
        case "custom-llm":
          response_engine_id =
            agent.response_engine.llm_websocket_url || "unknown";
          break;
        default:
          response_engine_id = "unknown";
      }

      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        version: agent.version,
        is_published: agent.is_published,
        response_engine_type: agent.response_engine.type,
        response_engine_id,
      };
    });

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          formatted,
          options.fields.split(",").map((f) => f.trim()),
        )
      : formatted;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
