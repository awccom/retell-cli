/**
 * Agent Info Command
 *
 * Retrieves detailed configuration for a specific agent.
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

/**
 * Get detailed information about a specific agent
 *
 * @param agentId The agent ID to retrieve
 */
export async function agentInfoCommand(agentId: string) {
  try {
    const client = getRetellClient();

    const agent = await client.agent.retrieve(agentId);

    // Output full agent object with all fields
    outputJson(agent);
  } catch (error) {
    handleSdkError(error);
  }
}
