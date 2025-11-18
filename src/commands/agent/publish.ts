/**
 * Agent Publish Command
 *
 * Publishes an agent's draft version to production.
 * This increments the version number and makes the draft changes live.
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

/**
 * Publish an agent's draft version to production
 *
 * Publishes the current draft version of an agent, making all pending changes
 * (prompts, configuration, etc.) live in production. The version number is
 * incremented and a new draft version is created for future edits.
 *
 * @param agentId The unique agent ID to publish
 *
 * @throws {AuthenticationError} If the API key is invalid or missing
 * @throws {NotFoundError} If the agent with the specified ID doesn't exist
 * @throws {BadRequestError} If the agent ID format is invalid
 * @throws {APIConnectionError} If there's a network error connecting to the API
 * @throws {RateLimitError} If the API rate limit is exceeded
 * @throws {APIError} For other API-related errors
 *
 * @example
 * // Publish an agent
 * await publishAgentCommand('agent-123abc');
 */
export async function publishAgentCommand(agentId: string): Promise<void> {
  try {
    const client = getRetellClient();

    // Publish the agent
    const result = await client.agent.publish(agentId) as any;

    // Output success message with version info
    outputJson({
      message: 'Agent published successfully',
      agent_id: result?.agent_id || agentId,
      agent_name: result?.agent_name || 'Unknown',
      version: result?.version || 'Unknown',
      is_published: result?.is_published ?? true,
      note: 'Draft version incremented and ready for new changes',
    });
  } catch (error) {
    handleSdkError(error);
  }
}
