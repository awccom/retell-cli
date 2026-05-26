/**
 * Tools Import Command
 *
 * Imports tools from a JSON file to an agent.
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
import type {
  ToolsImportInput,
  ToolsImportOutput,
  AnyTool,
} from "../../types/tools";

/**
 * Options for the import tools command
 */
export interface ImportToolsOptions {
  /** Input file path */
  file: string;
  /** Preview changes without applying */
  dryRun?: boolean;
  /** Replace existing tools with same name instead of failing */
  replace?: boolean;
}

/**
 * Import tools from a JSON file to an agent
 *
 * @param agentId The unique agent ID
 * @param options Command options
 */
export async function importToolsCommand(
  agentId: string,
  options: ImportToolsOptions,
): Promise<void> {
  try {
    // Validate file exists
    if (!existsSync(options.file)) {
      outputError(`Import file not found: ${options.file}`, "FILE_NOT_FOUND");
      return;
    }

    // Parse import file
    let importData: ToolsImportInput;
    try {
      const content = readFileSync(options.file, "utf-8");
      importData = JSON.parse(content);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        outputError(
          `Invalid JSON in import file: ${error.message}`,
          "INVALID_JSON",
        );
      } else {
        outputError(
          `Error reading import file: ${error.message}`,
          "FILE_READ_ERROR",
        );
      }
      return;
    }

    // Validate import data has tools
    if (!importData.tools) {
      outputError(
        'Import file must contain a "tools" object',
        "INVALID_IMPORT",
      );
      return;
    }

    // Resolve current agent tools
    const source = await resolveToolsSource(agentId);

    if (source.type === "custom-llm") {
      outputError(source.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    const client = getRetellClient();

    // Get existing tool names for duplicate detection
    const existingNames = new Set(getAllToolNames(source));

    // Track imported tools
    const toolsAdded: string[] = [];
    const toolsSkipped: string[] = [];
    const toolsReplaced: string[] = [];

    if (source.type === "retell-llm") {
      // Validate import format matches agent type
      if (importData.tools.flow || importData.tools.components) {
        outputError(
          "Import file contains Conversation Flow tools, but agent is Retell LLM",
          "TYPE_MISMATCH",
        );
        return;
      }

      // Get current LLM config
      const llm = await client.llm.retrieve(source.llmId);

      // Prepare updated tools arrays
      let generalTools = [...(llm.general_tools ?? [])];
      const states = [...(llm.states ?? [])];

      // Process general tools
      if (importData.tools.general) {
        for (const tool of importData.tools.general) {
          if (existingNames.has(tool.name)) {
            if (options.replace) {
              const idx = generalTools.findIndex(
                (t: any) => t.name === tool.name,
              );
              if (idx !== -1) {
                generalTools[idx] = tool as any;
                toolsReplaced.push(tool.name);
              }
            } else {
              toolsSkipped.push(tool.name);
            }
          } else {
            generalTools.push(tool as any);
            toolsAdded.push(tool.name);
            existingNames.add(tool.name);
          }
        }
      }

      // Process state tools
      if (importData.tools.states) {
        for (const [stateName, tools] of Object.entries(
          importData.tools.states,
        )) {
          const stateIndex = states.findIndex((s) => s.name === stateName);
          if (stateIndex === -1) {
            outputError(
              `State '${stateName}' not found in agent. Available states: ${states.map((s) => s.name).join(", ") || "none"}`,
              "STATE_NOT_FOUND",
            );
            return;
          }

          const stateTools = [...(states[stateIndex].tools ?? [])];

          for (const tool of tools as AnyTool[]) {
            if (existingNames.has(tool.name)) {
              if (options.replace) {
                const idx = stateTools.findIndex(
                  (t: any) => t.name === tool.name,
                );
                if (idx !== -1) {
                  stateTools[idx] = tool as any;
                  toolsReplaced.push(`${stateName}/${tool.name}`);
                }
              } else {
                toolsSkipped.push(`${stateName}/${tool.name}`);
              }
            } else {
              stateTools.push(tool as any);
              toolsAdded.push(`${stateName}/${tool.name}`);
              existingNames.add(tool.name);
            }
          }

          states[stateIndex] = {
            ...states[stateIndex],
            tools: stateTools as any,
          };
        }
      }

      // Handle dry-run
      if (options.dryRun) {
        outputJson({
          message: "Dry run - no changes applied",
          agent_id: agentId,
          agent_name: source.agentName,
          engine_type: "retell-llm",
          tools_would_add: toolsAdded,
          tools_would_replace: toolsReplaced,
          tools_would_skip: toolsSkipped,
          total_changes: toolsAdded.length + toolsReplaced.length,
        });
        return;
      }

      // Apply changes
      await client.llm.update(source.llmId, {
        general_tools: generalTools as any,
        states: states as any,
      });

      const output: ToolsImportOutput = {
        message: "Tools imported successfully (draft version)",
        agent_id: agentId,
        agent_name: source.agentName,
        imported_count: toolsAdded.length + toolsReplaced.length,
        tools_added: [...toolsAdded, ...toolsReplaced],
        note:
          toolsSkipped.length > 0
            ? `Skipped ${toolsSkipped.length} existing tools. Use --replace to overwrite. Run 'retell agents publish ${agentId}' to publish changes.`
            : `Run 'retell agents publish ${agentId}' to publish changes to production`,
      };
      outputJson(output);
    } else {
      // Conversation Flow
      // Validate import format matches agent type
      if (importData.tools.general || importData.tools.states) {
        outputError(
          "Import file contains Retell LLM tools, but agent is Conversation Flow",
          "TYPE_MISMATCH",
        );
        return;
      }

      // Get current flow config
      const flow = await client.conversationFlow.retrieve(source.flowId);

      // Prepare updated tools arrays
      let flowTools = [...(flow.tools ?? [])];
      const components = [...(flow.components ?? [])];

      // Process flow tools
      if (importData.tools.flow) {
        for (const tool of importData.tools.flow) {
          if (existingNames.has(tool.name)) {
            if (options.replace) {
              const idx = flowTools.findIndex((t: any) => t.name === tool.name);
              if (idx !== -1) {
                flowTools[idx] = tool as any;
                toolsReplaced.push(tool.name);
              }
            } else {
              toolsSkipped.push(tool.name);
            }
          } else {
            flowTools.push(tool as any);
            toolsAdded.push(tool.name);
            existingNames.add(tool.name);
          }
        }
      }

      // Process component tools
      if (importData.tools.components) {
        for (const [compId, tools] of Object.entries(
          importData.tools.components,
        )) {
          const compIndex = components.findIndex((c) => c.name === compId);
          if (compIndex === -1) {
            outputError(
              `Component '${compId}' not found in agent. Available components: ${components.map((c) => c.name).join(", ") || "none"}`,
              "COMPONENT_NOT_FOUND",
            );
            return;
          }

          const compTools = [...(components[compIndex].tools ?? [])];

          for (const tool of tools as AnyTool[]) {
            if (existingNames.has(tool.name)) {
              if (options.replace) {
                const idx = compTools.findIndex(
                  (t: any) => t.name === tool.name,
                );
                if (idx !== -1) {
                  compTools[idx] = tool as any;
                  toolsReplaced.push(`${compId}/${tool.name}`);
                }
              } else {
                toolsSkipped.push(`${compId}/${tool.name}`);
              }
            } else {
              compTools.push(tool as any);
              toolsAdded.push(`${compId}/${tool.name}`);
              existingNames.add(tool.name);
            }
          }

          components[compIndex] = {
            ...components[compIndex],
            tools: compTools as any,
          };
        }
      }

      // Handle dry-run
      if (options.dryRun) {
        outputJson({
          message: "Dry run - no changes applied",
          agent_id: agentId,
          agent_name: source.agentName,
          engine_type: "conversation-flow",
          tools_would_add: toolsAdded,
          tools_would_replace: toolsReplaced,
          tools_would_skip: toolsSkipped,
          total_changes: toolsAdded.length + toolsReplaced.length,
        });
        return;
      }

      // Apply changes
      await client.conversationFlow.update(source.flowId, {
        tools: flowTools as any,
        components: components as any,
      });

      const output: ToolsImportOutput = {
        message: "Tools imported successfully (draft version)",
        agent_id: agentId,
        agent_name: source.agentName,
        imported_count: toolsAdded.length + toolsReplaced.length,
        tools_added: [...toolsAdded, ...toolsReplaced],
        note:
          toolsSkipped.length > 0
            ? `Skipped ${toolsSkipped.length} existing tools. Use --replace to overwrite. Run 'retell agents publish ${agentId}' to publish changes.`
            : `Run 'retell agents publish ${agentId}' to publish changes to production`,
      };
      outputJson(output);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      outputError(`Invalid JSON: ${error.message}`, "INVALID_JSON");
      return;
    }
    handleSdkError(error);
  }
}
