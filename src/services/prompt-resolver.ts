/**
 * Prompt Type Resolution Service
 *
 * Determines the prompt source for an agent based on its response engine type.
 * Handles three engine types:
 * - retell-llm: Uses Retell's built-in LLM (has llm_id)
 * - conversation-flow: Uses conversation flow (has conversation_flow_id)
 * - custom-llm: Uses custom WebSocket (NOT SUPPORTED for prompt management)
 */

import { getRetellClient } from "./retell-client";

// ===== TYPE DEFINITIONS =====

/**
 * Prompt structure for Retell LLM agents
 */
export type RetellLlmPrompts = {
  llm_id: string;
  version: number;
  /** Remote last_modification_timestamp (ms since epoch); changes on draft edits */
  last_modification_timestamp?: number;
  general_prompt: string;
  begin_message?: string;
  states?: Array<{
    name: string;
    state_prompt: string;
    edges?: unknown[];
  }>;
};

/**
 * Individual node in a Conversation Flow
 */
export interface ConversationFlowNode {
  id: string;
  [key: string]: unknown; // Allow additional properties from API
}

/**
 * Prompt structure for Conversation Flow agents
 */
export type FlowPrompts = {
  conversation_flow_id: string;
  version: number;
  /** Remote last_modification_timestamp (ms since epoch); changes on draft edits */
  last_modification_timestamp?: number;
  global_prompt: string;
  nodes: ConversationFlowNode[];
};

/**
 * Version state of the agent's latest version, used to decide whether a new
 * draft must be created before prompts can be edited.
 */
export interface AgentVersionState {
  /** Latest agent version number */
  version?: number;
  /** Whether the latest agent version is published (published = read-only) */
  isPublished: boolean;
  /** LLM / conversation flow version the latest agent version points at */
  engineVersion?: number;
}

/**
 * Union type representing all possible prompt sources
 */
export type PromptSource =
  | {
      type: "retell-llm";
      llmId: string;
      agentName: string;
      agent?: AgentVersionState;
      prompts: RetellLlmPrompts;
    }
  | {
      type: "conversation-flow";
      flowId: string;
      agentName: string;
      agent?: AgentVersionState;
      prompts: FlowPrompts;
    }
  | { type: "custom-llm"; error: string };

// ===== PUBLIC API =====

/**
 * Resolve the prompt source for an agent
 *
 * Fetches the agent details, determines the response engine type,
 * and retrieves the appropriate prompt configuration.
 *
 * @param agentId The unique agent ID to resolve prompts for
 * @returns PromptSource object with type and prompts
 * @throws {NotFoundError} If agent or LLM/flow not found
 * @throws {AuthenticationError} If API key is invalid
 * @throws {APIError} For other API errors
 *
 * @example
 * // For retell-llm agent
 * const result = await resolvePromptSource('agent-123');
 * if (result.type === 'retell-llm') {
 *   console.log(result.prompts.general_prompt);
 * }
 */
export async function resolvePromptSource(
  agentId: string,
): Promise<PromptSource> {
  const client = getRetellClient();

  // Step 1: Get agent to determine response_engine type
  const agent = await client.agent.retrieve(agentId);

  const agentState: AgentVersionState = {
    version: agent.version,
    isPublished: agent.is_published === true,
    engineVersion:
      "version" in agent.response_engine &&
      typeof agent.response_engine.version === "number"
        ? agent.response_engine.version
        : undefined,
  };

  // Step 2: Branch based on response engine type
  if (agent.response_engine.type === "retell-llm") {
    // Fetch the LLM version this agent version actually uses, so reads and
    // writes (which target agentState.engineVersion) see the same version.
    const llm = await client.llm.retrieve(
      agent.response_engine.llm_id,
      agentState.engineVersion !== undefined
        ? { version: agentState.engineVersion }
        : undefined,
    );

    return {
      type: "retell-llm",
      llmId: llm.llm_id!,
      agentName: agent.agent_name!,
      agent: agentState,
      prompts: {
        llm_id: llm.llm_id!,
        version: llm.version!,
        last_modification_timestamp: llm.last_modification_timestamp,
        general_prompt: llm.general_prompt!,
        begin_message: llm.begin_message ?? undefined,
        states: (llm.states ?? undefined) as any,
      },
    };
  }

  if (agent.response_engine.type === "conversation-flow") {
    // Fetch Conversation Flow configuration
    const flow = await client.conversationFlow.retrieve(
      agent.response_engine.conversation_flow_id,
      agentState.engineVersion !== undefined
        ? { version: agentState.engineVersion }
        : undefined,
    );

    return {
      type: "conversation-flow",
      flowId: flow.conversation_flow_id!,
      agentName: agent.agent_name!,
      agent: agentState,
      prompts: {
        conversation_flow_id: flow.conversation_flow_id!,
        version: flow.version!,
        last_modification_timestamp: flow.last_modification_timestamp,
        global_prompt: flow.global_prompt!,
        nodes: (flow.nodes ?? []) as any,
      },
    };
  }

  // Custom LLM cannot be managed via API
  return {
    type: "custom-llm",
    error:
      "Custom LLM agents cannot be managed via API. Use the Retell dashboard to update prompts for custom LLM agents.",
  };
}
