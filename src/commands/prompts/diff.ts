/**
 * Prompts Diff Command
 *
 * Shows differences between local and remote prompts.
 * Useful for previewing changes before applying updates.
 */

import { join } from "path";
import { resolvePromptSource } from "../../services/prompt-resolver";
import { loadLocalPrompts } from "../../services/prompt-loader";
import { generateDiff } from "../../services/prompt-diff";
import {
  outputJson,
  outputError,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

/**
 * Options for the diff command
 */
interface DiffOptions {
  source?: string; // Source directory (default: .retell-prompts)
  fields?: string; // Comma-separated list of fields to return
}

/**
 * Validate agentId to prevent path traversal attacks
 *
 * @param agentId The agent ID to validate
 * @throws Error if agentId contains invalid characters
 */
function validateAgentId(agentId: string): void {
  if (
    agentId.includes("..") ||
    agentId.includes("/") ||
    agentId.includes("\\")
  ) {
    throw new Error(
      "Invalid agent ID: cannot contain path separators or traversal sequences",
    );
  }
}

/**
 * Show differences between local and remote prompts
 *
 * @param agentId The unique agent ID to diff prompts for
 * @param options Command options
 */
export async function diffPromptsCommand(
  agentId: string,
  options: DiffOptions,
): Promise<void> {
  try {
    // Validate agent ID to prevent path traversal
    validateAgentId(agentId);

    // Determine source directory
    const baseDir = options.source || ".retell-prompts";
    const agentDir = join(baseDir, agentId);

    // Load local prompts (will throw with descriptive error if fails)
    const localPrompts = loadLocalPrompts(agentId, agentDir);

    // Fetch remote prompts
    const remotePrompts = await resolvePromptSource(agentId);

    // Handle custom LLM (not supported)
    if (remotePrompts.type === "custom-llm") {
      outputError(remotePrompts.error, "CUSTOM_LLM_NOT_SUPPORTED");
    }

    // Validate type match
    if (localPrompts.type !== remotePrompts.type) {
      outputError(
        `Type mismatch: local files are ${localPrompts.type}, but agent uses ${remotePrompts.type}. Pull prompts again to sync.`,
        "TYPE_MISMATCH",
      );
    }

    // Generate diff
    const diff = generateDiff(agentId, localPrompts, remotePrompts);

    // Apply field filtering if requested
    let output: Record<string, any> = diff;
    if (options.fields) {
      const fieldList = options.fields.split(",").map((f) => f.trim());
      output = filterFields(diff, fieldList);
    }

    // Output the diff
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
