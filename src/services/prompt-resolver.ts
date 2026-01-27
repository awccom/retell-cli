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
  global_prompt: string;
  nodes: ConversationFlowNode[];
};

/**
 * Union type representing all possible prompt sources
 */
export type PromptSource =
  | {
      type: "retell-llm";
      llmId: string;
      agentName: string;
      prompts: RetellLlmPrompts;
    }
  | {
      type: "conversation-flow";
      flowId: string;
      agentName: string;
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

  // Step 2: Branch based on response engine type
  if (agent.response_engine.type === "retell-llm") {
    // Fetch Retell LLM configuration
    const llm = await client.llm.retrieve(agent.response_engine.llm_id);

    return {
      type: "retell-llm",
      llmId: llm.llm_id!,
      agentName: agent.agent_name!,
      prompts: {
        llm_id: llm.llm_id!,
        version: llm.version!,
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
    );

    return {
      type: "conversation-flow",
      flowId: flow.conversation_flow_id!,
      agentName: agent.agent_name!,
      prompts: {
        conversation_flow_id: flow.conversation_flow_id!,
        version: flow.version!,
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
