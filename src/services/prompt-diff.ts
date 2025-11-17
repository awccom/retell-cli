/**
 * Prompt Diff Service
 *
 * Generates structured diffs between local and remote prompts.
 * Supports both retell-llm and conversation-flow agent types.
 */

import { PromptSource, RetellLlmPrompts, FlowPrompts } from './prompt-resolver';

// ===== TYPE DEFINITIONS =====

/**
 * Structure for individual field changes
 */
export interface ChangeDetail {
  old: string | object | null;
  new: string | object | null;
  change_type: 'added' | 'removed' | 'modified';
}

/**
 * Complete diff result structure
 */
export interface DiffResult {
  agent_id: string;
  agent_type: 'retell-llm' | 'conversation-flow';
  has_changes: boolean;
  changes: {
    [key: string]: ChangeDetail;
  };
}

// ===== PUBLIC API =====

/**
 * Generate diff between local and remote prompts
 *
 * @param agentId The agent ID being compared
 * @param local Local prompt structure (from files)
 * @param remote Remote prompt structure (from API)
 * @returns DiffResult with structured changes
 *
 * @example
 * const diff = generateDiff('agent_123', localPrompts, remotePrompts);
 * if (diff.has_changes) {
 *   console.log('Changes detected:', diff.changes);
 * }
 */
export function generateDiff(
  agentId: string,
  local: PromptSource,
  remote: PromptSource
): DiffResult {
  // Handle custom-llm error case
  if (local.type === 'custom-llm' || remote.type === 'custom-llm') {
    throw new Error('Cannot generate diff for custom-llm agents');
  }

  // Type mismatch check
  if (local.type !== remote.type) {
    throw new Error(
      `Type mismatch: local is ${local.type}, remote is ${remote.type}`
    );
  }

  // Generate diff based on type
  if (local.type === 'retell-llm' && remote.type === 'retell-llm') {
    return generateRetellLlmDiff(agentId, local.prompts, remote.prompts);
  } else {
    // conversation-flow
    return generateConversationFlowDiff(agentId, local.prompts, remote.prompts);
  }
}

// ===== PRIVATE HELPERS =====

/**
 * Generate diff for retell-llm agents
 */
function generateRetellLlmDiff(
  agentId: string,
  local: RetellLlmPrompts,
  remote: RetellLlmPrompts
): DiffResult {
  const changes: { [key: string]: ChangeDetail } = {};

  // Compare general_prompt
  if (local.general_prompt !== remote.general_prompt) {
    changes.general_prompt = {
      old: remote.general_prompt,
      new: local.general_prompt,
      change_type: 'modified',
    };
  }

  // Compare begin_message
  const localBeginMessage = local.begin_message || null;
  const remoteBeginMessage = remote.begin_message || null;

  if (localBeginMessage !== remoteBeginMessage) {
    if (localBeginMessage && !remoteBeginMessage) {
      changes.begin_message = {
        old: null,
        new: localBeginMessage,
        change_type: 'added',
      };
    } else if (!localBeginMessage && remoteBeginMessage) {
      changes.begin_message = {
        old: remoteBeginMessage,
        new: null,
        change_type: 'removed',
      };
    } else {
      changes.begin_message = {
        old: remoteBeginMessage,
        new: localBeginMessage,
        change_type: 'modified',
      };
    }
  }

  // Compare states
  const localStates = local.states || [];
  const remoteStates = remote.states || [];

  // Build maps for efficient lookup
  const localStateMap = new Map(
    localStates.map((s) => [s.name, s.state_prompt])
  );
  const remoteStateMap = new Map(
    remoteStates.map((s) => [s.name, s.state_prompt])
  );

  // Find added and modified states
  localStateMap.forEach((localPrompt, stateName) => {
    const remotePrompt = remoteStateMap.get(stateName);

    if (!remotePrompt) {
      // State added locally
      changes[`states.${stateName}`] = {
        old: null,
        new: localPrompt,
        change_type: 'added',
      };
    } else if (localPrompt !== remotePrompt) {
      // State modified
      changes[`states.${stateName}`] = {
        old: remotePrompt,
        new: localPrompt,
        change_type: 'modified',
      };
    }
  });

  // Find removed states
  remoteStateMap.forEach((remotePrompt, stateName) => {
    if (!localStateMap.has(stateName)) {
      changes[`states.${stateName}`] = {
        old: remotePrompt,
        new: null,
        change_type: 'removed',
      };
    }
  });

  return {
    agent_id: agentId,
    agent_type: 'retell-llm',
    has_changes: Object.keys(changes).length > 0,
    changes,
  };
}

/**
 * Generate diff for conversation-flow agents
 */
function generateConversationFlowDiff(
  agentId: string,
  local: FlowPrompts,
  remote: FlowPrompts
): DiffResult {
  const changes: { [key: string]: ChangeDetail } = {};

  // Compare global_prompt
  if (local.global_prompt !== remote.global_prompt) {
    changes.global_prompt = {
      old: remote.global_prompt,
      new: local.global_prompt,
      change_type: 'modified',
    };
  }

  // Compare nodes (deep comparison using JSON)
  const localNodesJson = JSON.stringify(local.nodes);
  const remoteNodesJson = JSON.stringify(remote.nodes);

  if (localNodesJson !== remoteNodesJson) {
    changes.nodes = {
      old: remote.nodes,
      new: local.nodes,
      change_type: 'modified',
    };
  }

  return {
    agent_id: agentId,
    agent_type: 'conversation-flow',
    has_changes: Object.keys(changes).length > 0,
    changes,
  };
}
