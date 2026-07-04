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
import {
  isRecord,
  normalizeListResponse,
  type RecordLike,
} from "../../services/paginated-response";
import type { AgentListParams } from "retell-sdk/resources/agent";

export interface ListAgentsOptions {
  limit?: number;
  fields?: string;
}

const VOICE_AGENT_FILTER: Pick<AgentListParams, "filter_criteria"> = {
  filter_criteria: {
    channel: {
      op: "eq" as const,
      type: "string" as const,
      value: "voice" as const,
    },
  },
};

/**
 * Normalize SDK/API list responses across raw arrays and paginated/list wrappers.
 */
export function normalizeAgentsResponse(response: unknown): unknown[] {
  return normalizeListResponse(
    response,
    "Unexpected agents list response shape: expected array, agents[], data[], items[], or results[]",
    ["agents", "data", "items", "results"],
  );
}

function getResponseEngineId(agent: RecordLike): string {
  const responseEngine = isRecord(agent.response_engine)
    ? agent.response_engine
    : {};

  switch (responseEngine.type) {
    case "retell-llm":
      return typeof responseEngine.llm_id === "string"
        ? responseEngine.llm_id
        : "unknown";
    case "conversation-flow":
      return typeof responseEngine.conversation_flow_id === "string"
        ? responseEngine.conversation_flow_id
        : "unknown";
    case "custom-llm":
      return typeof responseEngine.llm_websocket_url === "string"
        ? responseEngine.llm_websocket_url
        : "unknown";
    default:
      return "unknown";
  }
}

function setIfDefined(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function formatAgentForList(agent: unknown): Record<string, unknown> {
  const agentRecord = isRecord(agent) ? agent : {};
  const responseEngine = isRecord(agentRecord.response_engine)
    ? agentRecord.response_engine
    : {};
  const formatted: Record<string, unknown> = {};

  setIfDefined(formatted, "agent_id", agentRecord.agent_id);
  setIfDefined(formatted, "agent_name", agentRecord.agent_name);
  setIfDefined(formatted, "channel", agentRecord.channel);
  setIfDefined(
    formatted,
    "user_modified_timestamp",
    agentRecord.user_modified_timestamp,
  );
  setIfDefined(formatted, "tags", agentRecord.tags);
  setIfDefined(formatted, "version", agentRecord.version);
  setIfDefined(formatted, "is_published", agentRecord.is_published);
  formatted.response_engine_type = responseEngine.type || "unknown";
  formatted.response_engine_id = getResponseEngineId(agentRecord);

  return formatted;
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

    const response = await client.agent.list({
      limit: options.limit || 100,
      ...VOICE_AGENT_FILTER,
    });
    const agents = normalizeAgentsResponse(response);

    // Format for cleaner output
    const formatted = agents.map(formatAgentForList);

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
