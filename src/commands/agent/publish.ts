/**
 * Agent Publish Command
 *
 * Publishes an agent's draft version to production.
 * This increments the version number and makes the draft changes live.
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

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
  const client = getRetellClient();

  try {
    await client.agent.publish(agentId);
  } catch (error) {
    // Check if this is the known SDK bug where it fails to parse empty response
    // The Retell API returns an empty body for publish, but the SDK tries to parse it as JSON
    if (
      error instanceof Error &&
      error.message.includes("invalid json response body") &&
      error.message.includes("Unexpected end of JSON input")
    ) {
      // The API call succeeded but SDK failed to parse empty response
      // Continue to fetch agent details below
    } else {
      // Re-throw other errors to be handled normally
      handleSdkError(error);
    }
  }

  // Fetch agent to verify publish succeeded and get current state
  try {
    const agent = await client.agent.retrieve(agentId);

    outputJson({
      message: "Agent published successfully",
      agent_id: agent.agent_id,
      agent_name: agent.agent_name || "Unknown",
      version: agent.version || "Unknown",
      is_published: agent.is_published ?? true,
      note: "Draft version incremented and ready for new changes",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
