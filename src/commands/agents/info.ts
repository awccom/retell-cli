/**
 * Agent Info Command
 *
 * Retrieves detailed configuration for a specific agent.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface AgentInfoOptions {
  fields?: string;
}

/**
 * Get detailed information about a specific agent
 *
 * Retrieves the complete configuration for a specific agent from the Retell API
 * and outputs it as JSON. This includes all agent settings such as voice configuration,
 * response engine details, behavior parameters, and webhook settings.
 *
 * @param agentId The unique agent ID to retrieve (must be a valid agent identifier)
 * @param options Command options (fields)
 *
 * @throws {AuthenticationError} If the API key is invalid or missing
 * @throws {NotFoundError} If the agent with the specified ID doesn't exist
 * @throws {BadRequestError} If the agent ID format is invalid
 * @throws {APIConnectionError} If there's a network error connecting to the API
 * @throws {RateLimitError} If the API rate limit is exceeded
 * @throws {APIError} For other API-related errors
 *
 * @example
 * // Get information for a specific agent
 * await agentInfoCommand('agent-123abc');
 */
export async function agentInfoCommand(
  agentId: string,
  options: AgentInfoOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();

    const agent = await client.agent.retrieve(agentId);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          agent,
          options.fields.split(",").map((f) => f.trim()),
        )
      : agent;

    // Output agent object
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
