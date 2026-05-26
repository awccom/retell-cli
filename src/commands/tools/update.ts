/**
 * Tools Update Command
 *
 * Updates an existing tool in an agent configuration.
 * Supports both Retell LLM and Conversation Flow agents.
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import { resolveToolsSource, findTool } from "../../services/tool-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type { AnyTool, ToolMutationOutput } from "../../types/tools";

/**
 * Options for the update tool command
 */
export interface UpdateToolOptions {
  /** Path to JSON file containing updated tool definition */
  file: string;
  /** State name where tool exists (Retell LLM only) */
  state?: string;
  /** Component ID where tool exists (Conversation Flow only) */
  component?: string;
  /** Preview changes without applying */
  dryRun?: boolean;
}

/**
 * Update an existing tool in an agent
 *
 * @param agentId The unique agent ID
 * @param toolName The name of the tool to update
 * @param options Command options
 */
export async function updateToolCommand(
  agentId: string,
  toolName: string,
  options: UpdateToolOptions,
): Promise<void> {
  try {
    // Validate file exists
    if (!existsSync(options.file)) {
      outputError(`Tool file not found: ${options.file}`, "FILE_NOT_FOUND");
      return;
    }

    // Parse tool definition
    let newTool: AnyTool;
    try {
      const content = readFileSync(options.file, "utf-8");
      newTool = JSON.parse(content);
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
    if (!newTool.name) {
      outputError('Tool must have a "name" field', "INVALID_TOOL");
      return;
    }
    if (!newTool.type) {
      outputError('Tool must have a "type" field', "INVALID_TOOL");
      return;
    }

    // Resolve current tools
    const source = await resolveToolsSource(agentId);

    if (source.type === "custom-llm") {
      outputError(source.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    // Determine location hint
    const locationHint =
      source.type === "retell-llm" ? options.state : options.component;

    // Find existing tool
    const existingTool = await findTool(agentId, toolName, locationHint);
    if (!existingTool) {
      let errorMsg = `Tool '${toolName}' not found`;
      if (locationHint) {
        errorMsg += ` in ${source.type === "retell-llm" ? "state" : "component"} '${locationHint}'`;
      }
      outputError(errorMsg, "TOOL_NOT_FOUND");
      return;
    }

    const client = getRetellClient();

    if (source.type === "retell-llm") {
      // Handle dry-run
      if (options.dryRun) {
        outputJson({
          message: "Dry run - no changes applied",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: toolName,
          operation: "update",
          location: existingTool.tool.location,
          old_tool: existingTool.tool.tool,
          new_tool: newTool,
        });
        return;
      }

      // Get current LLM config
      const llm = await client.llm.retrieve(source.llmId);

      if (existingTool.tool.location.location === "state") {
        const stateName = existingTool.tool.location.stateName!;
        const states = llm.states ?? [];
        const stateIndex = states.findIndex((s) => s.name === stateName);

        if (stateIndex === -1) {
          outputError(`State '${stateName}' not found`, "STATE_NOT_FOUND");
          return;
        }

        // Update tool in state
        const updatedStates = [...states];
        const stateTools = [...(updatedStates[stateIndex].tools ?? [])];
        const toolIndex = stateTools.findIndex((t: any) => t.name === toolName);

        if (toolIndex === -1) {
          outputError(
            `Tool '${toolName}' not found in state '${stateName}'`,
            "TOOL_NOT_FOUND",
          );
          return;
        }

        stateTools[toolIndex] = newTool as any;
        updatedStates[stateIndex] = {
          ...updatedStates[stateIndex],
          tools: stateTools as any,
        };

        await client.llm.update(source.llmId, { states: updatedStates as any });

        const output: ToolMutationOutput = {
          message: "Tool updated successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: newTool.name,
          operation: "update",
          location: { location: "state", stateName },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      } else {
        // Update in general tools
        const generalTools = [...(llm.general_tools ?? [])];
        const toolIndex = generalTools.findIndex(
          (t: any) => t.name === toolName,
        );

        if (toolIndex === -1) {
          outputError(
            `Tool '${toolName}' not found in general tools`,
            "TOOL_NOT_FOUND",
          );
          return;
        }

        generalTools[toolIndex] = newTool as any;

        await client.llm.update(source.llmId, {
          general_tools: generalTools as any,
        });

        const output: ToolMutationOutput = {
          message: "Tool updated successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: newTool.name,
          operation: "update",
          location: { location: "general" },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      }
    } else {
      // Conversation Flow
      // Handle dry-run
      if (options.dryRun) {
        outputJson({
          message: "Dry run - no changes applied",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: toolName,
          operation: "update",
          location: existingTool.tool.location,
          old_tool: existingTool.tool.tool,
          new_tool: newTool,
        });
        return;
      }

      // Get current flow config
      const flow = await client.conversationFlow.retrieve(source.flowId);

      if (existingTool.tool.location.location === "component") {
        const componentId = existingTool.tool.location.componentId!;
        const components = flow.components ?? [];
        const compIndex = components.findIndex((c) => c.name === componentId);

        if (compIndex === -1) {
          outputError(
            `Component '${componentId}' not found`,
            "COMPONENT_NOT_FOUND",
          );
          return;
        }

        // Update tool in component
        const updatedComponents = [...components];
        const compTools = [...(updatedComponents[compIndex].tools ?? [])];
        const toolIndex = compTools.findIndex((t: any) => t.name === toolName);

        if (toolIndex === -1) {
          outputError(
            `Tool '${toolName}' not found in component '${componentId}'`,
            "TOOL_NOT_FOUND",
          );
          return;
        }

        compTools[toolIndex] = newTool as any;
        updatedComponents[compIndex] = {
          ...updatedComponents[compIndex],
          tools: compTools as any,
        };

        await client.conversationFlow.update(source.flowId, {
          components: updatedComponents as any,
        });

        const output: ToolMutationOutput = {
          message: "Tool updated successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: newTool.name,
          operation: "update",
          location: { location: "component", componentId },
          note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
        };
        outputJson(output);
      } else {
        // Update in flow-level tools
        const flowTools = [...(flow.tools ?? [])];
        const toolIndex = flowTools.findIndex((t: any) => t.name === toolName);

        if (toolIndex === -1) {
          outputError(
            `Tool '${toolName}' not found in flow tools`,
            "TOOL_NOT_FOUND",
          );
          return;
        }

        flowTools[toolIndex] = newTool as any;

        await client.conversationFlow.update(source.flowId, {
          tools: flowTools as any,
        });

        const output: ToolMutationOutput = {
          message: "Tool updated successfully (draft version)",
          agent_id: agentId,
          agent_name: source.agentName,
          tool_name: newTool.name,
          operation: "update",
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
