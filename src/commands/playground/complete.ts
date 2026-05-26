/**
 * Playground Complete Command
 *
 * Runs a stateless playground completion for an agent.
 * Usage: retell playground complete <agent_id> --messages <json|@path>
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg } from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
import type { PlaygroundCompletionParams } from "retell-sdk/resources/playground";

export interface PlaygroundCompleteOptions {
  messages: string;
  dynamicVariables?: string;
  toolMocks?: string;
  currentState?: string;
  currentNodeId?: string;
  componentId?: string;
  version?: string;
  fields?: string;
}

export async function playgroundCompleteCommand(
  agentId: string,
  options: PlaygroundCompleteOptions,
): Promise<void> {
  try {
    const params: PlaygroundCompletionParams = {
      messages: parseJsonArray(options.messages, "--messages"),
    };

    const dynamicVariables = loadJsonArg(
      options.dynamicVariables,
      "--dynamic-variables",
    );
    if (dynamicVariables !== undefined) {
      params.dynamic_variables = parseJsonObject(
        dynamicVariables,
        "--dynamic-variables",
      ) as Record<string, string>;
    }

    const toolMocks = loadJsonArg(options.toolMocks, "--tool-mocks");
    if (toolMocks !== undefined) {
      params.tool_mocks = parseJsonArray(toolMocks, "--tool-mocks");
    }

    if (options.currentState !== undefined) {
      params.current_state = requireNonEmpty(
        options.currentState,
        "--current-state",
      );
    }
    if (options.currentNodeId !== undefined) {
      params.current_node_id = requireNonEmpty(
        options.currentNodeId,
        "--current-node-id",
      );
    }
    if (options.componentId !== undefined) {
      params.component_id = requireNonEmpty(
        options.componentId,
        "--component-id",
      );
    }
    if (options.version !== undefined) {
      params.version = parseNumericFlag(options.version, "--version");
    }

    const client = getRetellClient();
    const result = await client.playground.completion(
      requireNonEmpty(agentId, "<agent_id>"),
      params,
    );

    const selectedFields = options.fields
      ? options.fields
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f.length > 0)
      : [];

    const output =
      selectedFields.length > 0 ? filterFields(result, selectedFields) : result;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}

function parseJsonArray(value: string | unknown, flagName: string): any[] {
  const parsed =
    typeof value === "string" ? loadJsonArg(value, flagName) : value;
  if (!Array.isArray(parsed)) {
    throwValidation(`${flagName} must be a JSON array`);
  }
  return parsed;
}

function parseJsonObject(
  value: unknown,
  flagName: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throwValidation(`${flagName} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
