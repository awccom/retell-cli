/**
 * Prompt Diffing Service
 *
 * Compares local prompt files with remote API versions to detect changes.
 * Supports both retell-llm and conversation-flow agent types.
 */

import { diff } from 'deep-diff';
import type { PromptSource } from './prompt-resolver';
import type { DiffResult, ChangeDetail } from '../types';

// ===== HELPER FUNCTIONS =====

/**
 * Determine the change type based on old and new values
 */
function getChangeType(oldValue: any, newValue: any): 'added' | 'removed' | 'modified' {
  if (oldValue === null || oldValue === undefined) {
    return 'added';
  }
  if (newValue === null || newValue === undefined) {
    return 'removed';
  }
  return 'modified';
}

/**
 * Convert a value to a serializable format for diff output
 */
function serializeValue(value: any): string | object | null {
  if (value === null || value === undefined) {
    return null;
  }

  // For objects and arrays, return as-is (they're already serializable)
  if (typeof value === 'object') {
    return value;
  }

  // For primitives, convert to string
  return String(value);
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

  // Use deep-diff library to detect all differences
  const differences = diff(oldPrompts, newPrompts);

  if (!differences) {
    // No changes detected
    return changes;
  }

  for (const difference of differences) {
    let path: string;
    let oldValue: any;
    let newValue: any;

    // Build the path string from the difference path array
    if (difference.path) {
      path = difference.path.join('.');
    } else {
      path = 'root';
    }

    // Determine old and new values based on difference kind
    switch (difference.kind) {
      case 'N': // New property added
        oldValue = null;
        newValue = (difference as any).rhs;
        break;

      case 'D': // Property deleted
        oldValue = (difference as any).lhs;
        newValue = null;
        break;

      case 'E': // Property edited
        oldValue = (difference as any).lhs;
        newValue = (difference as any).rhs;
        break;

      case 'A': // Array change
        const arrayDiff = difference as any;
        path = `${path}.${arrayDiff.index}`;
        if (arrayDiff.item.kind === 'N') {
          oldValue = null;
          newValue = arrayDiff.item.rhs;
        } else if (arrayDiff.item.kind === 'D') {
          oldValue = arrayDiff.item.lhs;
          newValue = null;
        } else {
          oldValue = arrayDiff.item.lhs;
          newValue = arrayDiff.item.rhs;
        }
        break;

      default:
        continue;
    }

    changes[path] = {
      old: serializeValue(oldValue),
      new: serializeValue(newValue),
      change_type: getChangeType(oldValue, newValue),
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
