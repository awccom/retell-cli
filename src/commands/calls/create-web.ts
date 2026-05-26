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
import {
  loadJsonArg,
  loadStringRecordArg,
  readJsonObjectFile,
} from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
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
      agent_id: requireNonEmpty(options.agentId, "--agent-id"),
    };

    if (options.agentVersion !== undefined) {
      params.agent_version = parseNumericFlag(
        options.agentVersion,
        "--agent-version",
      );
    }
    if (options.currentNodeId !== undefined)
      params.current_node_id = options.currentNodeId;
    if (options.currentState !== undefined)
      params.current_state = options.currentState;

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadStringRecordArg(
      options.dynamicVariables,
      "--dynamic-variables",
    );
    if (dv !== undefined) params.retell_llm_dynamic_variables = dv;

    if (options.agentOverride) {
      const override = readJsonObjectFile(
        options.agentOverride,
        "--agent-override",
      );
      params.agent_override =
        override as unknown as CallCreateWebCallParams.AgentOverride;
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
