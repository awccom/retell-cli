/**
 * Tools List Command
 *
 * Lists all tools configured for an agent.
 * Supports both Retell LLM and Conversation Flow agents.
 */

import {
  resolveToolsSource,
  summarizeTool,
} from "../../services/tool-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { ToolsListOutput } from "../../types/tools";

/**
 * Options for the list tools command
 */
export interface ListToolsOptions {
  /** Filter by state name (Retell LLM only) */
  state?: string;
  /** Filter by component ID (Conversation Flow only) */
  component?: string;
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * List all tools for an agent
 *
 * @param agentId The unique agent ID
 * @param options Command options
 */
export async function listToolsCommand(
  agentId: string,
  options: ListToolsOptions,
): Promise<void> {
  try {
    const source = await resolveToolsSource(agentId);

    // Handle custom LLM (not supported)
    if (source.type === "custom-llm") {
      outputError(source.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    let output: ToolsListOutput;

    if (source.type === "retell-llm") {
      // Filter by state if specified
      if (options.state) {
        const stateTools = source.stateTools[options.state];
        if (!stateTools) {
          outputError(
            `State '${options.state}' not found. Available states: ${Object.keys(source.stateTools).join(", ") || "none"}`,
            "STATE_NOT_FOUND",
          );
          return;
        }

        output = {
          agent_id: source.agentId,
          agent_name: source.agentName,
          engine_type: "retell-llm",
          llm_id: source.llmId,
          general_tools: [],
          state_tools: {
            [options.state]: stateTools.map(summarizeTool),
          },
          total_count: stateTools.length,
        };
      } else {
        // Return all tools
        const stateToolsSummary: Record<
          string,
          Array<{ name: string; type: string; description?: string }>
        > = {};
        for (const [stateName, tools] of Object.entries(source.stateTools)) {
          stateToolsSummary[stateName] = tools.map(summarizeTool);
        }

        output = {
          agent_id: source.agentId,
          agent_name: source.agentName,
          engine_type: "retell-llm",
          llm_id: source.llmId,
          general_tools: source.generalTools.map(summarizeTool),
          state_tools: stateToolsSummary,
          total_count: source.totalCount,
        };
      }
    } else {
      // Conversation Flow
      // Filter by component if specified
      if (options.component) {
        const componentTools = source.componentTools[options.component];
        if (!componentTools) {
          outputError(
            `Component '${options.component}' not found. Available components: ${Object.keys(source.componentTools).join(", ") || "none"}`,
            "COMPONENT_NOT_FOUND",
          );
          return;
        }

        output = {
          agent_id: source.agentId,
          agent_name: source.agentName,
          engine_type: "conversation-flow",
          flow_id: source.flowId,
          flow_tools: [],
          component_tools: {
            [options.component]: componentTools.map(summarizeTool),
          },
          total_count: componentTools.length,
        };
      } else {
        // Return all tools
        const componentToolsSummary: Record<
          string,
          Array<{ name: string; type: string; description?: string }>
        > = {};
        for (const [compId, tools] of Object.entries(source.componentTools)) {
          componentToolsSummary[compId] = tools.map(summarizeTool);
        }

        output = {
          agent_id: source.agentId,
          agent_name: source.agentName,
          engine_type: "conversation-flow",
          flow_id: source.flowId,
          flow_tools: source.flowTools.map(summarizeTool),
          component_tools: componentToolsSummary,
          total_count: source.totalCount,
        };
      }
    }

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
