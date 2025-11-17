/**
 * Prompts Diff Command
 *
 * Shows differences between local and remote prompts.
 * Useful for reviewing changes before applying updates.
 */

import { join } from 'path';
import { resolvePromptSource } from '../../services/prompt-resolver';
import { loadLocalPrompts } from '../../services/prompt-loader';
import { generateDiff } from '../../services/prompt-diff';
import { outputJson, outputError, handleSdkError } from '../../services/output-formatter';
import { filterFields } from '../../services/output-formatter';

/**
 * Options for the diff command
 */
interface DiffOptions {
  source?: string; // Custom path to local prompts directory
  fields?: string; // Comma-separated list of fields to return
}

/**
 * Validate agentId to prevent path traversal attacks
 *
 * @param agentId The agent ID to validate
 * @throws Error if agentId contains invalid characters
 */
function validateAgentId(agentId: string): void {
  if (agentId.includes('..') || agentId.includes('/') || agentId.includes('\\')) {
    throw new Error('Invalid agent ID: cannot contain path separators or traversal sequences');
  }
}

/**
 * Show differences between local and remote prompts
 *
 * @param agentId The unique agent ID to compare prompts for
 * @param options Command options
 */
export async function diffPromptsCommand(agentId: string, options: DiffOptions): Promise<void> {
  try {
    // Validate agent ID to prevent path traversal
    validateAgentId(agentId);

    // 1. Fetch remote prompts
    const remotePrompts = await resolvePromptSource(agentId);

    // Handle custom LLM (error case)
    if (remotePrompts.type === 'custom-llm') {
      outputError(remotePrompts.error, 'CUSTOM_LLM_NOT_SUPPORTED');
      return;
    }

    // 2. Load local prompts
    const baseDir = options.source || '.retell-prompts';
    const agentDir = join(baseDir, agentId);

    let localPrompts;
    try {
      localPrompts = loadLocalPrompts(agentId, agentDir);
    } catch (error: any) {
      // Provide helpful error messages
      outputError(error.message, 'LOCAL_PROMPTS_ERROR');
      return;
    }

    // 3. Validate types match
    if (localPrompts.type !== remotePrompts.type) {
      outputError(
        `Type mismatch: local files are ${localPrompts.type}, but agent uses ${remotePrompts.type}. Pull prompts again to sync.`,
        'TYPE_MISMATCH'
      );
      return;
    }

    // 4. Generate diff
    let diff;
    try {
      diff = generateDiff(agentId, localPrompts, remotePrompts);
    } catch (error: any) {
      outputError(error.message, 'DIFF_GENERATION_ERROR');
      return;
    }

    // 5. Apply field filtering if requested
    const output = options.fields
      ? filterFields(diff, options.fields.split(',').map(f => f.trim()))
      : diff;

    // 6. Output result
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
