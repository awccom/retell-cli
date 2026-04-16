/**
 * Calls Create Web Command
 *
 * Creates a new web call for browser-based agents.
 * Usage: retell calls create-web --agent-id <id> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg, readJsonFile } from "../../services/json-arg";
import type { CallCreateWebCallParams } from "retell-sdk/resources/call";

export interface CreateWebCallOptions {
  agentId: string;
  agentVersion?: string;
  metadata?: string;
  dynamicVariables?: string;
  agentOverride?: string;
  currentNodeId?: string;
  currentState?: string;
  fields?: string;
}

export async function createWebCallCommand(
  options: CreateWebCallOptions,
): Promise<void> {
  try {
    const params: CallCreateWebCallParams = {
      agent_id: options.agentId,
    };

    if (options.agentVersion !== undefined) {
      const v = Number(options.agentVersion);
      if (isNaN(v)) throwValidation("--agent-version must be a number");
      params.agent_version = v;
    }
    if (options.currentNodeId !== undefined)
      params.current_node_id = options.currentNodeId;
    if (options.currentState !== undefined)
      params.current_state = options.currentState;

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadJsonArg(options.dynamicVariables, "--dynamic-variables");
    if (dv !== undefined)
      params.retell_llm_dynamic_variables = dv as Record<string, unknown>;

    if (options.agentOverride) {
      const override = readJsonFile(options.agentOverride, "--agent-override");
      params.agent_override = override as CallCreateWebCallParams.AgentOverride;
    }

    const client = getRetellClient();
    const result = await client.call.createWebCall(params);

    const output = options.fields
      ? filterFields(
          result,
          options.fields.split(",").map((f) => f.trim()),
        )
      : result;

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
