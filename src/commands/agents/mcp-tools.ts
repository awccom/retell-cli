/**
 * Agents MCP Tools Command
 *
 * Lists the MCP tools available to a specific agent from a given MCP server.
 * Usage: retell agents mcp-tools <agent_id> --mcp-id <id> [--component-id <id>] [--version <n>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
import type { McpToolGetMcpToolsParams } from "retell-sdk/resources/mcp-tool";

export interface AgentMcpToolsOptions {
  mcpId: string;
  componentId?: string;
  version?: string;
  fields?: string;
}

export async function agentMcpToolsCommand(
  agentId: string,
  options: AgentMcpToolsOptions,
): Promise<void> {
  try {
    const query: McpToolGetMcpToolsParams = {
      mcp_id: requireNonEmpty(options.mcpId, "--mcp-id"),
    };
    if (options.componentId) query.component_id = options.componentId;
    if (options.version !== undefined) {
      query.version = parseNumericFlag(options.version, "--version");
    }

    const client = getRetellClient();
    const tools = await client.mcpTool.getMcpTools(agentId, query);

    const output = options.fields
      ? filterFields(
          tools,
          options.fields.split(",").map((f) => f.trim()),
        )
      : tools;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
