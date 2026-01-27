/**
 * Tool Resolution Service
 *
 * Resolves tools from an agent based on its response engine type.
 * Handles tool extraction from:
 * - Retell LLM: general_tools[] and states[].tools[]
 * - Conversation Flow: tools[] and components[].tools[]
 */

import { getRetellClient } from "./retell-client";
import type {
  ToolsSource,
  RetellLlmTool,
  ConversationFlowTool,
  AnyTool,
  ToolWithLocation,
} from "../types/tools";

// ===== PUBLIC API =====

/**
 * Resolve all tools for an agent
 *
 * Fetches the agent details, determines the response engine type,
 * and retrieves all tool configurations.
 *
 * @param agentId The unique agent ID to resolve tools for
 * @returns ToolsSource object with type and tools
 * @throws {NotFoundError} If agent or LLM/flow not found
 * @throws {AuthenticationError} If API key is invalid
 */
export async function resolveToolsSource(
  agentId: string,
): Promise<ToolsSource> {
  const client = getRetellClient();

  // Step 1: Get agent to determine response_engine type
  const agent = await client.agent.retrieve(agentId);

  // Step 2: Branch based on response engine type
  if (agent.response_engine.type === "retell-llm") {
    // Fetch Retell LLM configuration
    const llm = await client.llm.retrieve(agent.response_engine.llm_id);

    // Extract general tools
    const generalTools = (llm.general_tools ?? []) as RetellLlmTool[];

    // Extract state-specific tools
    const stateTools: Record<string, RetellLlmTool[]> = {};
    if (llm.states) {
      for (const state of llm.states) {
        const tools = (state.tools ?? []) as RetellLlmTool[];
        if (tools.length > 0) {
          stateTools[state.name] = tools;
        }
      }
    }

    // Calculate total count
    const stateToolCount = Object.values(stateTools).reduce(
      (sum, t) => sum + t.length,
      0,
    );
    const totalCount = generalTools.length + stateToolCount;

    return {
      type: "retell-llm",
      agentId,
      agentName: agent.agent_name ?? "Unknown",
      llmId: llm.llm_id!,
      generalTools,
      stateTools,
      totalCount,
    };
  }

  if (agent.response_engine.type === "conversation-flow") {
    // Fetch Conversation Flow configuration
    const flow = await client.conversationFlow.retrieve(
      agent.response_engine.conversation_flow_id,
    );

    // Extract flow-level tools
    const flowTools = (flow.tools ?? []) as ConversationFlowTool[];

    // Extract component-specific tools
    const componentTools: Record<string, ConversationFlowTool[]> = {};
    if (flow.components) {
      for (const component of flow.components) {
        const tools = (component.tools ?? []) as ConversationFlowTool[];
        if (tools.length > 0) {
          componentTools[component.name] = tools;
        }
      }
    }

    // Calculate total count
    const componentToolCount = Object.values(componentTools).reduce(
      (sum, t) => sum + t.length,
      0,
    );
    const totalCount = flowTools.length + componentToolCount;

    return {
      type: "conversation-flow",
      agentId,
      agentName: agent.agent_name ?? "Unknown",
      flowId: flow.conversation_flow_id!,
      flowTools,
      componentTools,
      totalCount,
    };
  }

  // Custom LLM cannot be managed via API
  return {
    type: "custom-llm",
    error:
      "Custom LLM agents cannot be managed via API. Use the Retell dashboard to manage tools for custom LLM agents.",
  };
}

/**
 * Find a specific tool by name in a Retell LLM agent
 *
 * @param agentId The agent ID
 * @param toolName The tool name to find
 * @param stateName Optional state name to search within
 * @returns Tool with location info, or null if not found
 */
export async function findToolInLlm(
  agentId: string,
  toolName: string,
  stateName?: string,
): Promise<ToolWithLocation | null> {
  const source = await resolveToolsSource(agentId);

  if (source.type !== "retell-llm") {
    return null;
  }

  // If state specified, only search that state
  if (stateName) {
    const stateTools = source.stateTools[stateName];
    if (stateTools) {
      const tool = stateTools.find((t) => t.name === toolName);
      if (tool) {
        return {
          tool,
          location: { location: "state", stateName },
        };
      }
    }
    return null;
  }

  // Search general tools first
  const generalTool = source.generalTools.find((t) => t.name === toolName);
  if (generalTool) {
    return {
      tool: generalTool,
      location: { location: "general" },
    };
  }

  // Search all state tools
  for (const [state, tools] of Object.entries(source.stateTools)) {
    const tool = tools.find((t) => t.name === toolName);
    if (tool) {
      return {
        tool,
        location: { location: "state", stateName: state },
      };
    }
  }

  return null;
}

/**
 * Find a specific tool by name in a Conversation Flow agent
 *
 * @param agentId The agent ID
 * @param toolName The tool name to find
 * @param componentId Optional component ID to search within
 * @returns Tool with location info, or null if not found
 */
export async function findToolInFlow(
  agentId: string,
  toolName: string,
  componentId?: string,
): Promise<ToolWithLocation | null> {
  const source = await resolveToolsSource(agentId);

  if (source.type !== "conversation-flow") {
    return null;
  }

  // If component specified, only search that component
  if (componentId) {
    const componentTools = source.componentTools[componentId];
    if (componentTools) {
      const tool = componentTools.find((t) => t.name === toolName);
      if (tool) {
        return {
          tool,
          location: { location: "component", componentId },
        };
      }
    }
    return null;
  }

  // Search flow tools first
  const flowTool = source.flowTools.find((t) => t.name === toolName);
  if (flowTool) {
    return {
      tool: flowTool,
      location: { location: "flow" },
    };
  }

  // Search all component tools
  for (const [compId, tools] of Object.entries(source.componentTools)) {
    const tool = tools.find((t) => t.name === toolName);
    if (tool) {
      return {
        tool,
        location: { location: "component", componentId: compId },
      };
    }
  }

  return null;
}

/**
 * Find a tool by name in any agent type
 *
 * @param agentId The agent ID
 * @param toolName The tool name to find
 * @param locationHint Optional state name or component ID
 * @returns Tool with location and agent info, or null if not found
 */
export async function findTool(
  agentId: string,
  toolName: string,
  locationHint?: string,
): Promise<{
  tool: ToolWithLocation;
  agentName: string;
  engineType: string;
} | null> {
  const source = await resolveToolsSource(agentId);

  if (source.type === "custom-llm") {
    return null;
  }

  if (source.type === "retell-llm") {
    const result = await findToolInLlm(agentId, toolName, locationHint);
    if (result) {
      return {
        tool: result,
        agentName: source.agentName,
        engineType: "retell-llm",
      };
    }
  }

  if (source.type === "conversation-flow") {
    const result = await findToolInFlow(agentId, toolName, locationHint);
    if (result) {
      return {
        tool: result,
        agentName: source.agentName,
        engineType: "conversation-flow",
      };
    }
  }

  return null;
}

/**
 * Summarize a tool for display (name, type, description)
 *
 * @param tool The tool to summarize
 * @returns Summary object
 */
export function summarizeTool(tool: AnyTool): {
  name: string;
  type: string;
  description?: string;
} {
  return {
    name: tool.name,
    type: tool.type,
    description: tool.description,
  };
}

/**
 * Get all tool names from a tools source
 *
 * @param source The tools source
 * @returns Array of all tool names
 */
export function getAllToolNames(source: ToolsSource): string[] {
  if (source.type === "custom-llm") {
    return [];
  }

  if (source.type === "retell-llm") {
    const names = source.generalTools.map((t) => t.name);
    for (const tools of Object.values(source.stateTools)) {
      names.push(...tools.map((t) => t.name));
    }
    return names;
  }

  if (source.type === "conversation-flow") {
    const names = source.flowTools.map((t) => t.name);
    for (const tools of Object.values(source.componentTools)) {
      names.push(...tools.map((t) => t.name));
    }
    return names;
  }

  return [];
}
