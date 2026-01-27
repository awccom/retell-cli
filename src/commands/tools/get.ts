/**
 * Tools Get Command
 *
 * Retrieves detailed information about a specific tool.
 * Supports both Retell LLM and Conversation Flow agents.
 */

import { findTool, resolveToolsSource } from "../../services/tool-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { ToolGetOutput } from "../../types/tools";

/**
 * Options for the get tool command
 */
export interface GetToolOptions {
  /** State name to search within (Retell LLM only) */
  state?: string;
  /** Component ID to search within (Conversation Flow only) */
  component?: string;
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Get detailed information about a specific tool
 *
 * @param agentId The unique agent ID
 * @param toolName The name of the tool to retrieve
 * @param options Command options
 */
export async function getToolCommand(
  agentId: string,
  toolName: string,
  options: GetToolOptions,
): Promise<void> {
  try {
    // First check if the agent type is supported
    const source = await resolveToolsSource(agentId);
    if (source.type === "custom-llm") {
      outputError(source.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    // Determine location hint based on agent type
    const locationHint =
      source.type === "retell-llm" ? options.state : options.component;

    // Find the tool
    const result = await findTool(agentId, toolName, locationHint);

    if (!result) {
      let errorMsg = `Tool '${toolName}' not found`;
      if (locationHint) {
        errorMsg += ` in ${source.type === "retell-llm" ? "state" : "component"} '${locationHint}'`;
      }
      outputError(errorMsg, "TOOL_NOT_FOUND");
      return;
    }

    const output: ToolGetOutput = {
      agent_id: agentId,
      agent_name: result.agentName,
      tool_name: toolName,
      location: result.tool.location,
      tool: result.tool.tool,
    };

    // Apply field filtering if specified
    if (options.fields) {
      const filtered = filterFields(
        output,
        options.fields.split(",").map((f) => f.trim()),
      );
      outputJson(filtered);
    } else {
      outputJson(output);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
