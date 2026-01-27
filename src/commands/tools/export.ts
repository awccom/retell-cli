/**
 * Tools Export Command
 *
 * Exports all tools from an agent to a JSON file.
 * Supports both Retell LLM and Conversation Flow agents.
 */

import { writeFileSync } from "fs";
import { resolveToolsSource } from "../../services/tool-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type { ToolsExportOutput } from "../../types/tools";

/**
 * Options for the export tools command
 */
export interface ExportToolsOptions {
  /** Output file path */
  output?: string;
}

/**
 * Export all tools from an agent to a JSON file
 *
 * @param agentId The unique agent ID
 * @param options Command options
 */
export async function exportToolsCommand(
  agentId: string,
  options: ExportToolsOptions,
): Promise<void> {
  try {
    const source = await resolveToolsSource(agentId);

    if (source.type === "custom-llm") {
      outputError(source.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    let exportData: ToolsExportOutput;

    if (source.type === "retell-llm") {
      // Build state tools object
      const stateToolsExport: Record<string, any[]> = {};
      for (const [stateName, tools] of Object.entries(source.stateTools)) {
        if (tools.length > 0) {
          stateToolsExport[stateName] = tools;
        }
      }

      exportData = {
        agent_id: source.agentId,
        agent_name: source.agentName,
        engine_type: "retell-llm",
        exported_at: new Date().toISOString(),
        tools: {
          general:
            source.generalTools.length > 0 ? source.generalTools : undefined,
          states:
            Object.keys(stateToolsExport).length > 0
              ? stateToolsExport
              : undefined,
        },
        total_count: source.totalCount,
      };
    } else {
      // Conversation Flow
      // Build component tools object
      const componentToolsExport: Record<string, any[]> = {};
      for (const [compId, tools] of Object.entries(source.componentTools)) {
        if (tools.length > 0) {
          componentToolsExport[compId] = tools;
        }
      }

      exportData = {
        agent_id: source.agentId,
        agent_name: source.agentName,
        engine_type: "conversation-flow",
        exported_at: new Date().toISOString(),
        tools: {
          flow: source.flowTools.length > 0 ? source.flowTools : undefined,
          components:
            Object.keys(componentToolsExport).length > 0
              ? componentToolsExport
              : undefined,
        },
        total_count: source.totalCount,
      };
    }

    // Write to file or output to stdout
    if (options.output) {
      try {
        writeFileSync(
          options.output,
          JSON.stringify(exportData, null, 2),
          "utf-8",
        );
        outputJson({
          message: "Tools exported successfully",
          agent_id: agentId,
          agent_name: exportData.agent_name,
          engine_type: exportData.engine_type,
          output_file: options.output,
          total_count: exportData.total_count,
        });
      } catch (error: any) {
        if (error.code === "EACCES") {
          outputError(
            `Permission denied writing to: ${options.output}`,
            "PERMISSION_DENIED",
          );
        } else if (error.code === "ENOSPC") {
          outputError("No space left on device", "NO_SPACE");
        } else {
          outputError(`Error writing file: ${error.message}`, "WRITE_ERROR");
        }
      }
    } else {
      // Output to stdout
      outputJson(exportData);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
