/**
 * TypeScript Type Definitions for Agent Commands
 *
 * Types for agent update and get operations.
 */

/**
 * Options for the agent update command
 */
export interface UpdateAgentOptions {
  /** Path to JSON file containing agent configuration updates */
  file: string;
  /** Preview changes without applying them */
  dryRun?: boolean;
  /** Specific version to update (defaults to latest draft) */
  version?: number;
}

/**
 * Options for the agent get command
 */
export interface GetAgentOptions {
  /** Specific version to retrieve (defaults to latest) */
  version?: number;
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Output structure for agent mutation operations
 */
export interface AgentMutationOutput {
  /** Human-readable message about the operation */
  message: string;
  /** The agent ID that was operated on */
  agent_id: string;
  /** The agent's name */
  agent_name?: string;
  /** The current version after the operation */
  version?: number;
  /** Type of operation performed */
  operation: "update" | "publish";
  /** Additional information or next steps */
  note?: string;
}
