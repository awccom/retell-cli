/**
 * Prompt Diffing Service
 *
 * Compares local prompt files with remote API versions to detect changes.
 * Supports both retell-llm and conversation-flow agent types.
 */

import diff from 'microdiff';
import type { PromptSource } from './prompt-resolver';
import type { DiffResult, ChangeDetail } from '../types';

// ===== HELPER FUNCTIONS =====

/**
 * Determine the change type based on the diff type
 */
function getChangeType(type: 'CREATE' | 'REMOVE' | 'CHANGE'): 'added' | 'removed' | 'modified' {
  switch (type) {
    case 'CREATE':
      return 'added';
    case 'REMOVE':
      return 'removed';
    case 'CHANGE':
      return 'modified';
  }
}

/**
 * Convert a value to a serializable format for diff output
 */
function serializeValue(value: any): string | number | boolean | object | null {
  if (value === null || value === undefined) {
    return null;
  }

  // For objects and arrays, return as-is (they're already serializable)
  if (typeof value === 'object') {
    return value;
  }

  // For primitives, keep their original type for better accuracy
  return value;
}

/**
 * Compare two prompt objects and generate a structured diff
 *
 * @param oldPrompts The original prompts (from API)
 * @param newPrompts The updated prompts (from local file)
 * @returns Record of changed fields with their old/new values
 */
function comparePromptObjects(oldPrompts: any, newPrompts: any): Record<string, ChangeDetail> {
  const changes: Record<string, ChangeDetail> = {};

  // Use microdiff library to detect all differences
  const differences = diff(oldPrompts, newPrompts);

  if (!differences || differences.length === 0) {
    // No changes detected
    return changes;
  }

  for (const difference of differences) {
    // Build the path string from the difference path array
    const path = difference.path.join('.');

    let oldValue: any;
    let newValue: any;

    // Determine old and new values based on difference type
    switch (difference.type) {
      case 'CREATE':
        oldValue = null;
        newValue = difference.value;
        break;

      case 'REMOVE':
        oldValue = difference.oldValue;
        newValue = null;
        break;

      case 'CHANGE':
        oldValue = difference.oldValue;
        newValue = difference.value;
        break;
    }

    changes[path] = {
      old: serializeValue(oldValue),
      new: serializeValue(newValue),
      change_type: getChangeType(difference.type),
    };
  }

  return changes;
}

// ===== PUBLIC API =====

/**
 * Generate a diff between local and remote prompts
 *
 * Compares prompt configurations and returns a structured diff showing
 * all changes between the local version and the remote API version.
 *
 * @param local Local prompt source (from file or user input)
 * @param remote Remote prompt source (from Retell API)
 * @returns DiffResult with agent info and detailed changes
 *
 * @example
 * // Compare retell-llm prompts
 * const diff = generateDiff(localPrompts, remotePrompts);
 * if (diff.has_changes) {
 *   console.log(`Found ${Object.keys(diff.changes).length} changes`);
 *   console.log(diff.changes);
 * }
 *
 * @throws {Error} If local and remote types don't match
 */
export function generateDiff(local: PromptSource, remote: PromptSource): DiffResult {
  // Validate that both sources are the same type
  if (local.type !== remote.type) {
    throw new Error(
      `Cannot diff different agent types: local is '${local.type}', remote is '${remote.type}'`
    );
  }

  // Handle custom-llm type (not supported)
  if (local.type === 'custom-llm' || remote.type === 'custom-llm') {
    throw new Error('Cannot diff custom-llm agents (not supported for prompt management)');
  }

  // Extract agent ID and type
  let agentId: string;
  const agentType = local.type;

  if (local.type === 'retell-llm') {
    agentId = local.llmId;
  } else {
    // conversation-flow
    agentId = local.flowId;
  }

  // Compare the prompt objects
  const changes = comparePromptObjects(remote.prompts, local.prompts);

  // Build the result
  const result: DiffResult = {
    agent_id: agentId,
    agent_type: agentType,
    has_changes: Object.keys(changes).length > 0,
    changes,
  };

  return result;
}

/**
 * Format a diff result as a human-readable summary
 *
 * Converts a DiffResult into a formatted string showing what changed.
 * Useful for CLI output and dry-run previews.
 *
 * @param diffResult The diff result to format
 * @returns Formatted string describing the changes
 *
 * @example
 * const summary = formatDiffSummary(diff);
 * console.log(summary);
 * // Output:
 * // Changes detected for agent_123abc (retell-llm):
 * // - general_prompt: modified
 * // - states.0.state_prompt: modified
 * // - begin_message: added
 */
export function formatDiffSummary(diffResult: DiffResult): string {
  if (!diffResult.has_changes) {
    return `No changes detected for ${diffResult.agent_id} (${diffResult.agent_type})`;
  }

  const lines: string[] = [
    `Changes detected for ${diffResult.agent_id} (${diffResult.agent_type}):`,
  ];

  for (const [path, change] of Object.entries(diffResult.changes)) {
    lines.push(`  - ${path}: ${change.change_type}`);
  }

  lines.push(`\nTotal changes: ${Object.keys(diffResult.changes).length}`);

  return lines.join('\n');
}
