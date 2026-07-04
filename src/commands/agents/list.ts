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

const VOICE_AGENT_FILTER = {
  filter_criteria: {
    channel: {
      op: "eq" as const,
      type: "string" as const,
      value: "voice" as const,
    },
  },
};

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalize SDK/API list responses across raw arrays and paginated/list wrappers.
 */
export function normalizeAgentsResponse(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isRecord(response)) {
    throw new Error(
      "Unexpected agents list response shape: expected an array or object response",
    );
  }

  const candidateKeys = ["agents", "data", "items", "results"];
  for (const key of candidateKeys) {
    const value = response[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  // Some SDKs nest the array one level deeper, e.g. { data: { items: [...] } }.
  for (const key of candidateKeys) {
    const value = response[key];
    if (!isRecord(value)) continue;

    for (const nestedKey of candidateKeys) {
      const nestedValue = value[nestedKey];
      if (Array.isArray(nestedValue)) {
        return nestedValue;
      }
    }
  }

  throw new Error(
    "Unexpected agents list response shape: expected array, agents[], data[], items[], or results[]",
  );
}

function getResponseEngineId(agent: any): string {
  const responseEngine = agent?.response_engine ?? {};

  switch (responseEngine.type) {
    case "retell-llm":
      return responseEngine.llm_id || "unknown";
    case "conversation-flow":
      return responseEngine.conversation_flow_id || "unknown";
    case "custom-llm":
      return responseEngine.llm_websocket_url || "unknown";
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

function formatAgentForList(agent: any): Record<string, unknown> {
  const responseEngine = agent?.response_engine ?? {};
  const formatted: Record<string, unknown> = {};

  setIfDefined(formatted, "agent_id", agent?.agent_id);
  setIfDefined(formatted, "agent_name", agent?.agent_name);
  setIfDefined(formatted, "channel", agent?.channel);
  setIfDefined(
    formatted,
    "user_modified_timestamp",
    agent?.user_modified_timestamp,
  );
  setIfDefined(formatted, "tags", agent?.tags);
  setIfDefined(formatted, "version", agent?.version);
  setIfDefined(formatted, "is_published", agent?.is_published);
  formatted.response_engine_type = responseEngine.type || "unknown";
  formatted.response_engine_id = getResponseEngineId(agent);

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
