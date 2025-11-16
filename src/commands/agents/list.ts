/**
 * List Agents Command
 *
 * Lists all agents with formatted output showing key configuration fields.
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

export interface ListAgentsOptions {
  limit?: number;
}

/**
 * List all agents with optional pagination
 *
 * @param options Command options (limit)
 */
export async function listAgentsCommand(options: ListAgentsOptions = {}) {
  try {
    const client = getRetellClient();

    const agents = await client.agent.list({
      limit: options.limit || 100,
    });

    // Format for cleaner output
    const formatted = agents.map(agent => ({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      version: agent.version,
      is_published: agent.is_published,
      response_engine_type: agent.response_engine.type,
      response_engine_id:
        agent.response_engine.llm_id ||
        agent.response_engine.conversation_flow_id ||
        agent.response_engine.llm_websocket_url,
    }));

    outputJson(formatted);
  } catch (error) {
    handleSdkError(error);
  }
}
