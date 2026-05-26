/**
 * Tools Add Command
 *
 * Adds a new tool to an agent configuration.
 * Supports both Retell LLM and Conversation Flow agents.
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  resolveToolsSource,
  getAllToolNames,
} from "../../services/tool-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type { AnyTool, ToolMutationOutput } from "../../types/tools";

/**
 * Options for the add tool command
 */
export interface AddToolOptions {
  /** Path to JSON file containing tool definition */
  file: string;
  /** State name to add tool to (Retell LLM only) */
  state?: string;
  /** Component ID to add tool to (Conversation Flow only) */
  component?: string;
  /** Preview changes without applying */
  dryRun?: boolean;
}

/**
 * Add a new tool to an agent
 *
 * @param agentId The unique agent ID
 * @param options Command options
 */
export async function addToolCommand(
  agentId: string,
  options: AddToolOptions,
): Promise<void> {
  try {
    // Validate file exists
    if (!existsSync(options.file)) {
      outputError(`Tool file not found: ${options.file}`, "FILE_NOT_FOUND");
      return;
    }

    // Parse tool definition
    let tool: AnyTool;
    try {
      const content = readFileSync(options.file, "utf-8");
      tool = JSON.parse(content);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        outputError(
          `Invalid JSON in tool file: ${error.message}`,
          "INVALID_JSON",
        );
      } else {
        outputError(
          `Error reading tool file: ${error.message}`,
          "FILE_READ_ERROR",
        );
      }
      return;
    }

    // Validate tool has required fields
    if (!tool.name) {
      outputError('Tool must have a "name" field', "INVALID_TOOL");
      return;
    }
    if (!tool.type) {
      outputError('Tool must have a "type" field', "INVALID_TOOL");
      return;
    }

    // Resolve current tools
    const source = await resolveToolsSource(agentId);

    if (source.type === "custom-llm") {
      outputError(source.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    // Check for duplicate tool name
    const existingNames = getAllToolNames(source);
    if (existingNames.includes(tool.name)) {
      outputError(
        `Tool with name '${tool.name}' already exists. Use 'retell tools update' to modify it.`,
        "DUPLICATE_TOOL",
      );
      return;
    }

    const client = getRetellClient();

    if (source.type === "retell-llm") {
      // Handle dry-run
      if (options.dryRun) {
        const location = options.state
          ? `state '${options.state}'`
          : "general tools";
        outputJson({
          message: "Dry run - no changes applied",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: tool.name,
          operation: "add",
          location: options.state
            ? { location: "state", stateName: options.state }
            : { location: "general" },
          tool_preview: tool,
          would_add_to: location,
        });
        return;
      }

      // Get current LLM config
      const llm = await client.llm.retrieve(source.llmId);

      if (options.state) {
        // Add to specific state
        const states = llm.states ?? [];
        const stateIndex = states.findIndex((s) => s.name === options.state);

        if (stateIndex === -1) {
          outputError(
            `State '${options.state}' not found. Available states: ${states.map((s) => s.name).join(", ") || "none"}`,
            "STATE_NOT_FOUND",
          );
          return;
        }

        // Add tool to state
        const updatedStates = [...states];
        const stateTools = [...(updatedStates[stateIndex].tools ?? [])];
        stateTools.push(tool as any);
        updatedStates[stateIndex] = {
          ...updatedStates[stateIndex],
          tools: stateTools as any,
        };

        await client.llm.update(source.llmId, { states: updatedStates as any });

        const output: ToolMutationOutput = {
          message: "Tool added successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: tool.name,
          operation: "add",
          location: { location: "state", stateName: options.state },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      } else {
        // Add to general tools
        const generalTools = [...(llm.general_tools ?? [])];
        generalTools.push(tool as any);

        await client.llm.update(source.llmId, {
          general_tools: generalTools as any,
        });

        const output: ToolMutationOutput = {
          message: "Tool added successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: tool.name,
          operation: "add",
          location: { location: "general" },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      }
    } else {
      // Conversation Flow
      // Handle dry-run
      if (options.dryRun) {
        const location = options.component
          ? `component '${options.component}'`
          : "flow tools";
        outputJson({
          message: "Dry run - no changes applied",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: tool.name,
          operation: "add",
          location: options.component
            ? { location: "component", componentId: options.component }
            : { location: "flow" },
          tool_preview: tool,
          would_add_to: location,
        });
        return;
      }

      // Get current flow config
      const flow = await client.conversationFlow.retrieve(source.flowId);

      if (options.component) {
        // Add to specific component
        const components = flow.components ?? [];
        const compIndex = components.findIndex(
          (c) => c.name === options.component,
        );

        if (compIndex === -1) {
          outputError(
            `Component '${options.component}' not found. Available components: ${components.map((c) => c.name).join(", ") || "none"}`,
            "COMPONENT_NOT_FOUND",
          );
          return;
        }

        // Add tool to component
        const updatedComponents = [...components];
        const compTools = [...(updatedComponents[compIndex].tools ?? [])];
        compTools.push(tool as any);
        updatedComponents[compIndex] = {
          ...updatedComponents[compIndex],
          tools: compTools as any,
        };

        await client.conversationFlow.update(source.flowId, {
          components: updatedComponents as any,
        });

        const output: ToolMutationOutput = {
          message: "Tool added successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: tool.name,
          operation: "add",
          location: { location: "component", componentId: options.component },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      } else {
        // Add to flow-level tools
        const flowTools = [...(flow.tools ?? [])];
        flowTools.push(tool as any);

        await client.conversationFlow.update(source.flowId, {
          tools: flowTools as any,
        });

        const output: ToolMutationOutput = {
          message: "Tool added successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: tool.name,
          operation: "add",
          location: { location: "flow" },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      outputError(`Invalid JSON: ${error.message}`, "INVALID_JSON");
      return;
    }
    handleSdkError(error);
  }
}
