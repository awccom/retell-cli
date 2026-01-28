/**
 * Agent Get Command
 *
 * Retrieves agent configuration from Retell API.
 * Useful for getting current agent settings and creating a baseline
 * for update operations.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { GetAgentOptions } from "../../types/agent";

/**
 * Get agent configuration from the Retell API
 *
 * Retrieves the full agent configuration including all agent-level settings
 * like voice, language, webhooks, and post-call analysis settings.
 *
 * @param agentId The unique agent ID to retrieve
 * @param options Command options
 */
export async function getAgentCommand(
  agentId: string,
  options: GetAgentOptions,
): Promise<void> {
  const client = getRetellClient();

  try {
    // Retrieve agent configuration
    // Note: The SDK's retrieve method accepts an optional version parameter
    const agent = await client.agent.retrieve(agentId, {
      version: options.version,
    });

    // Apply field filtering if specified
    if (options.fields) {
      const fields = options.fields.split(",").map((f) => f.trim());
      const filtered = filterFields(agent, fields);
      outputJson(filtered);
    } else {
      outputJson(agent);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
