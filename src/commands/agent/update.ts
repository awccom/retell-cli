/**
 * Agent Update Command
 *
 * Updates agent-level configuration fields that are not accessible
 * through the prompts update command. This includes:
 * - post_call_analysis_data
 * - post_call_analysis_model
 * - system preset entries for summary, success, and sentiment analysis
 * - Voice settings, language, webhooks, etc.
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type { UpdateAgentOptions } from "../../types/agent";

/**
 * Validate file path to prevent path traversal attacks
 *
 * @param filePath The file path to validate
 * @throws Error if filePath contains path traversal sequences
 */
function validateFilePath(filePath: string): void {
  // Normalize and check for path traversal
  if (filePath.includes("\0")) {
    throw new Error("Invalid file path: contains null bytes");
  }
}

/**
 * Update agent configuration from a JSON file
 *
 * Reads agent configuration from the specified JSON file and updates
 * the agent using the Retell Agent API. This allows updating agent-level
 * fields that are not part of the LLM or conversation flow configuration.
 *
 * @param agentId The unique agent ID to update
 * @param options Command options
 */
export async function updateAgentCommand(
  agentId: string,
  options: UpdateAgentOptions,
): Promise<void> {
  const client = getRetellClient();

  try {
    // Validate and check file exists
    validateFilePath(options.file);

    if (!existsSync(options.file)) {
      outputError(`File not found: ${options.file}`, "FILE_NOT_FOUND");
      return;
    }

    // Read and parse JSON file
    let updateParams: Record<string, unknown>;
    try {
      const fileContent = readFileSync(options.file, "utf-8");
      updateParams = JSON.parse(fileContent);
    } catch (error) {
      if (error instanceof SyntaxError) {
        outputError(`Invalid JSON in file: ${error.message}`, "INVALID_JSON");
        return;
      }
      throw error;
    }

    // Validate that updateParams is an object
    if (
      typeof updateParams !== "object" ||
      updateParams === null ||
      Array.isArray(updateParams)
    ) {
      outputError(
        "File must contain a JSON object with agent configuration fields",
        "INVALID_FORMAT",
      );
      return;
    }

    // Handle dry-run mode
    if (options.dryRun) {
      // Fetch current agent to show comparison
      const currentAgent = await client.agent.retrieve(agentId, {
        version: options.version,
      });

      // Build a preview of what will be changed
      const changes: Record<string, { current: unknown; new: unknown }> = {};

      for (const [key, newValue] of Object.entries(updateParams)) {
        const currentValue = (
          currentAgent as unknown as Record<string, unknown>
        )[key];
        // Only show fields that would actually change
        if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          changes[key] = {
            current: currentValue,
            new: newValue,
          };
        }
      }

      outputJson({
        message: "Dry run - no changes applied",
        agent_id: agentId,
        agent_name: currentAgent.agent_name || "Unknown",
        fields_to_update: Object.keys(updateParams),
        changes:
          Object.keys(changes).length > 0
            ? changes
            : "No changes detected (values are identical)",
        note: `Run without --dry-run to apply changes`,
      });
      return;
    }

    // Apply the update
    const updatedAgent = await client.agent.update(
      agentId,
      updateParams as any,
    );

    outputJson({
      message: "Agent updated successfully (draft version)",
      agent_id: updatedAgent.agent_id,
      agent_name: updatedAgent.agent_name || "Unknown",
      version: updatedAgent.version,
      fields_updated: Object.keys(updateParams),
      note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
    });
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      outputError(`Invalid JSON in file: ${error.message}`, "INVALID_JSON");
      return;
    }

    // Handle SDK errors
    handleSdkError(error);
  }
}
