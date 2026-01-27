/**
 * Prompt Loading Service
 *
 * Shared utilities for loading prompts from local files.
 * Used by both diff and update commands to ensure consistency.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { RetellLlmPrompts, FlowPrompts } from "./prompt-resolver";

/**
 * Local metadata structure
 */
interface LocalMetadata {
  type: "retell-llm" | "conversation-flow";
  agent_name: string;
  llm_id?: string;
  conversation_flow_id?: string;
  version: number;
  pulled_at: string;
}

/**
 * Result of loading local prompts
 */
export type LocalPrompts =
  | {
      type: "retell-llm";
      metadata: LocalMetadata;
      prompts: Omit<RetellLlmPrompts, "llm_id" | "version">;
    }
  | {
      type: "conversation-flow";
      metadata: LocalMetadata;
      prompts: Omit<FlowPrompts, "conversation_flow_id" | "version">;
    };

/**
 * Load local prompts from a directory
 *
 * @param agentId The agent ID (for error messages)
 * @param agentDir The directory containing the prompts
 * @returns LocalPrompts object with type, metadata, and prompts
 * @throws Error if directory structure is invalid
 */
export function loadLocalPrompts(
  agentId: string,
  agentDir: string,
): LocalPrompts {
  // Check if directory exists
  if (!existsSync(agentDir)) {
    throw new Error(
      `Prompts directory not found: ${agentDir}. Run 'retell prompts pull ${agentId}' first.`,
    );
  }

  // Load and validate metadata
  const metadataPath = join(agentDir, "metadata.json");
  if (!existsSync(metadataPath)) {
    throw new Error(
      `metadata.json not found in ${agentDir}. Directory may be corrupted.`,
    );
  }

  let metadata: LocalMetadata;
  try {
    metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in metadata.json: ${error.message}`);
    }
    throw new Error(`Failed to read metadata.json: ${error.message}`);
  }

  // Load prompts based on type
  if (metadata.type === "retell-llm") {
    const prompts = loadRetellLlmPrompts(agentDir);
    return {
      type: "retell-llm",
      metadata,
      prompts,
    };
  } else if (metadata.type === "conversation-flow") {
    const prompts = loadConversationFlowPrompts(agentDir);
    return {
      type: "conversation-flow",
      metadata,
      prompts,
    };
  } else {
    throw new Error(
      `Unknown agent type in metadata: ${(metadata as any).type}`,
    );
  }
}

/**
 * Load Retell LLM prompts from local files
 */
function loadRetellLlmPrompts(
  agentDir: string,
): Omit<RetellLlmPrompts, "llm_id" | "version"> {
  const prompts: Partial<Omit<RetellLlmPrompts, "llm_id" | "version">> = {};

  // Load general_prompt (required)
  const generalPromptPath = join(agentDir, "general_prompt.md");
  if (!existsSync(generalPromptPath)) {
    throw new Error("general_prompt.md not found");
  }

  try {
    prompts.general_prompt = readFileSync(generalPromptPath, "utf-8");
  } catch (error: any) {
    throw new Error(`Failed to read general_prompt.md: ${error.message}`);
  }

  // Load begin_message (optional) - only add if file exists
  const beginMessagePath = join(agentDir, "begin_message.txt");
  if (existsSync(beginMessagePath)) {
    try {
      const beginMessage = readFileSync(beginMessagePath, "utf-8");
      if (beginMessage) {
        prompts.begin_message = beginMessage;
      }
    } catch (error: any) {
      throw new Error(`Failed to read begin_message.txt: ${error.message}`);
    }
  }

  // Load states (optional)
  const statesDir = join(agentDir, "states");
  if (existsSync(statesDir)) {
    try {
      const stateFiles = readdirSync(statesDir).filter((f) =>
        f.endsWith(".md"),
      );
      if (stateFiles.length > 0) {
        prompts.states = stateFiles.map((file) => {
          const stateName = file.replace(".md", "");
          let content: string;

          try {
            content = readFileSync(join(statesDir, file), "utf-8");
          } catch (error: any) {
            throw new Error(
              `Failed to read state file ${file}: ${error.message}`,
            );
          }

          // Extract state_prompt from markdown content using regex
          // Format: "# State: name\n\nprompt content"
          const STATE_HEADER_REGEX = /^#\s+State:\s+(.+)$/m;
          const match = content.match(STATE_HEADER_REGEX);
          if (!match) {
            throw new Error(
              `Invalid state file format in ${file}: missing "# State:" header`,
            );
          }
          const statePrompt = content.replace(STATE_HEADER_REGEX, "").trim();

          return {
            name: stateName,
            state_prompt: statePrompt,
          };
        });
      }
    } catch (error: any) {
      if (
        error.message.includes("Invalid state file format") ||
        error.message.includes("Failed to read state file")
      ) {
        throw error; // Re-throw our custom errors
      }
      throw new Error(`Failed to read states directory: ${error.message}`);
    }
  }

  return prompts as Omit<RetellLlmPrompts, "llm_id" | "version">;
}

/**
 * Load Conversation Flow prompts from local files
 */
function loadConversationFlowPrompts(
  agentDir: string,
): Omit<FlowPrompts, "conversation_flow_id" | "version"> {
  const prompts: Partial<
    Omit<FlowPrompts, "conversation_flow_id" | "version">
  > = {};

  // Load global_prompt (required)
  const globalPromptPath = join(agentDir, "global_prompt.md");
  if (!existsSync(globalPromptPath)) {
    throw new Error("global_prompt.md not found");
  }

  try {
    prompts.global_prompt = readFileSync(globalPromptPath, "utf-8");
  } catch (error: any) {
    throw new Error(`Failed to read global_prompt.md: ${error.message}`);
  }

  // Load nodes (required)
  const nodesPath = join(agentDir, "nodes.json");
  if (!existsSync(nodesPath)) {
    throw new Error("nodes.json not found");
  }

  try {
    const nodesContent = JSON.parse(readFileSync(nodesPath, "utf-8"));

    // Validate that nodes is an array
    if (!Array.isArray(nodesContent)) {
      throw new Error("nodes.json must contain an array");
    }

    prompts.nodes = nodesContent;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in nodes.json: ${error.message}`);
    }
    throw error; // Re-throw if it's our custom error or other errors
  }

  return prompts as Omit<FlowPrompts, "conversation_flow_id" | "version">;
}
