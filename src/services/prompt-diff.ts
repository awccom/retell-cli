/**
 * Prompt Diff Service
 *
 * Generates structured diffs between local and remote prompts.
 * Supports both retell-llm and conversation-flow agent types.
 */

import type { PromptSource } from "./prompt-resolver";
import type { LocalPrompts } from "./prompt-loader";

/**
 * Change type enumeration
 */
export type ChangeType = "added" | "modified" | "removed";

/**
 * Details about a specific field change
 */
export interface ChangeDetail {
  old: any;
  new: any;
  change_type: ChangeType;
}

/**
 * Diff result structure
 */
export interface DiffResult {
  agent_id: string;
  agent_type: "retell-llm" | "conversation-flow";
  has_changes: boolean;
  changes: Record<string, ChangeDetail>;
}

/**
 * Deep equality check for objects with deterministic JSON comparison
 * Sorts keys before stringifying to ensure consistent comparison
 *
 * @param obj1 First object to compare
 * @param obj2 Second object to compare
 * @param maxDepth Maximum depth to traverse (default: 100)
 * @returns true if objects are deeply equal
 * @throws Error if maximum depth is exceeded
 */
function deepEqual(
  obj1: unknown,
  obj2: unknown,
  maxDepth: number = 100,
): boolean {
  // Handle primitive types and null
  if (obj1 === obj2) return true;
  if (obj1 === null || obj2 === null) return false;
  if (typeof obj1 !== "object" || typeof obj2 !== "object") return false;

  // Track depth to prevent stack overflow on very large/deep objects
  let currentDepth = 0;

  // Use sorted JSON for deterministic comparison
  const sortedStringify = (obj: any): string => {
    // Check depth limit
    if (++currentDepth > maxDepth) {
      throw new Error(
        `Maximum depth (${maxDepth}) exceeded during comparison. ` +
          "This may indicate a circular reference or extremely deep nesting.",
      );
    }

    if (obj === null) return "null";
    if (typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) {
      return "[" + obj.map(sortedStringify).join(",") + "]";
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (k) => JSON.stringify(k) + ":" + sortedStringify(obj[k]),
    );
    return "{" + pairs.join(",") + "}";
  };

  try {
    return sortedStringify(obj1) === sortedStringify(obj2);
  } catch (error) {
    // If we hit depth limit, log warning and fall back to reference equality
    if (error instanceof Error && error.message.includes("Maximum depth")) {
      console.warn(
        "Warning:",
        error.message,
        "Falling back to reference equality.",
      );
      return obj1 === obj2;
    }
    throw error;
  }
}

/**
 * Generate a diff between local and remote prompts
 *
 * @param agentId The agent ID
 * @param localPrompts The local prompts loaded from files
 * @param remotePrompts The remote prompts from the API
 * @returns DiffResult object with structured changes
 */
export function generateDiff(
  agentId: string,
  localPrompts: LocalPrompts,
  remotePrompts: PromptSource,
): DiffResult {
  // Handle custom LLM case
  if (remotePrompts.type === "custom-llm") {
    throw new Error("Cannot diff custom LLM agents");
  }

  // Validate type match
  if (localPrompts.type !== remotePrompts.type) {
    throw new Error(
      `Type mismatch: local files are ${localPrompts.type}, but agent uses ${remotePrompts.type}`,
    );
  }

  // Generate diff based on type
  if (
    localPrompts.type === "retell-llm" &&
    remotePrompts.type === "retell-llm"
  ) {
    return generateRetellLlmDiff(agentId, localPrompts, remotePrompts);
  } else if (
    localPrompts.type === "conversation-flow" &&
    remotePrompts.type === "conversation-flow"
  ) {
    return generateConversationFlowDiff(agentId, localPrompts, remotePrompts);
  }

  throw new Error(`Unsupported agent type: ${localPrompts.type}`);
}

/**
 * Generate diff for Retell LLM prompts
 */
function generateRetellLlmDiff(
  agentId: string,
  localPrompts: Extract<LocalPrompts, { type: "retell-llm" }>,
  remotePrompts: Extract<PromptSource, { type: "retell-llm" }>,
): DiffResult {
  const changes: Record<string, ChangeDetail> = {};

  // Compare general_prompt
  if (
    localPrompts.prompts.general_prompt !== remotePrompts.prompts.general_prompt
  ) {
    changes.general_prompt = {
      old: remotePrompts.prompts.general_prompt,
      new: localPrompts.prompts.general_prompt,
      change_type: "modified",
    };
  }

  // Compare begin_message
  const localBeginMessage = localPrompts.prompts.begin_message || null;
  const remoteBeginMessage = remotePrompts.prompts.begin_message || null;

  if (localBeginMessage !== remoteBeginMessage) {
    if (localBeginMessage && !remoteBeginMessage) {
      changes.begin_message = {
        old: null,
        new: localBeginMessage,
        change_type: "added",
      };
    } else if (!localBeginMessage && remoteBeginMessage) {
      changes.begin_message = {
        old: remoteBeginMessage,
        new: null,
        change_type: "removed",
      };
    } else {
      changes.begin_message = {
        old: remoteBeginMessage,
        new: localBeginMessage,
        change_type: "modified",
      };
    }
  }

  // Compare states
  const localStates = localPrompts.prompts.states || [];
  const remoteStates = remotePrompts.prompts.states || [];

  // Create maps for easier comparison
  const localStatesMap = new Map(
    localStates.map((s) => [s.name, s.state_prompt]),
  );
  const remoteStatesMap = new Map(
    remoteStates.map((s) => [s.name, s.state_prompt]),
  );

  // Find added and modified states
  for (const [stateName, localPrompt] of localStatesMap) {
    const remotePrompt = remoteStatesMap.get(stateName);
    const fieldKey = `states.${stateName}`;

    if (remotePrompt === undefined) {
      // State added locally
      changes[fieldKey] = {
        old: null,
        new: localPrompt,
        change_type: "added",
      };
    } else if (localPrompt !== remotePrompt) {
      // State modified locally
      changes[fieldKey] = {
        old: remotePrompt,
        new: localPrompt,
        change_type: "modified",
      };
    }
  }

  // Find removed states
  for (const [stateName, remotePrompt] of remoteStatesMap) {
    if (!localStatesMap.has(stateName)) {
      const fieldKey = `states.${stateName}`;
      changes[fieldKey] = {
        old: remotePrompt,
        new: null,
        change_type: "removed",
      };
    }
  }

  return {
    agent_id: agentId,
    agent_type: "retell-llm",
    has_changes: Object.keys(changes).length > 0,
    changes,
  };
}

/**
 * Generate diff for Conversation Flow prompts
 */
function generateConversationFlowDiff(
  agentId: string,
  localPrompts: Extract<LocalPrompts, { type: "conversation-flow" }>,
  remotePrompts: Extract<PromptSource, { type: "conversation-flow" }>,
): DiffResult {
  const changes: Record<string, ChangeDetail> = {};

  // Compare global_prompt
  if (
    localPrompts.prompts.global_prompt !== remotePrompts.prompts.global_prompt
  ) {
    changes.global_prompt = {
      old: remotePrompts.prompts.global_prompt,
      new: localPrompts.prompts.global_prompt,
      change_type: "modified",
    };
  }

  // Compare nodes individually for better granularity
  const localNodes = localPrompts.prompts.nodes || [];
  const remoteNodes = remotePrompts.prompts.nodes || [];

  // Create maps for easier comparison (using node id as key)
  const localNodesMap = new Map(localNodes.map((n) => [n.id, n]));
  const remoteNodesMap = new Map(remoteNodes.map((n) => [n.id, n]));

  // Find added and modified nodes
  for (const [nodeId, localNode] of localNodesMap) {
    const remoteNode = remoteNodesMap.get(nodeId);
    const fieldKey = `nodes.${nodeId}`;

    if (remoteNode === undefined) {
      // Node added locally
      changes[fieldKey] = {
        old: null,
        new: localNode,
        change_type: "added",
      };
    } else {
      // Compare nodes using deterministic deep equality
      if (!deepEqual(localNode, remoteNode)) {
        // Node modified locally
        changes[fieldKey] = {
          old: remoteNode,
          new: localNode,
          change_type: "modified",
        };
      }
    }
  }

  // Find removed nodes
  for (const [nodeId, remoteNode] of remoteNodesMap) {
    if (!localNodesMap.has(nodeId)) {
      const fieldKey = `nodes.${nodeId}`;
      changes[fieldKey] = {
        old: remoteNode,
        new: null,
        change_type: "removed",
      };
    }
  }

  return {
    agent_id: agentId,
    agent_type: "conversation-flow",
    has_changes: Object.keys(changes).length > 0,
    changes,
  };
}
