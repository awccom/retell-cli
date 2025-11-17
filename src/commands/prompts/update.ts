/**
 * Prompts Update Command
 *
 * Uploads local prompt changes to Retell.
 * Reads prompts from .retell-prompts/<agent_id>/ directory and updates
 * the agent's LLM config or conversation flow.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { resolvePromptSource } from '../../services/prompt-resolver';
import { getRetellClient } from '../../services/retell-client';
import { outputJson, outputError, handleSdkError } from '../../services/output-formatter';
import { loadLocalPrompts } from '../../services/prompt-loader';
import { generateDiff } from '../../services/prompt-diff';

/**
 * Options for the update command
 */
interface UpdateOptions {
  source?: string; // Source directory (default: .retell-prompts)
  dryRun?: boolean; // Preview changes without applying them
}

/**
 * Metadata structure from local files
 */
interface LocalMetadata {
  type: 'retell-llm' | 'conversation-flow';
  agent_name: string;
  llm_id?: string;
  conversation_flow_id?: string;
  version: number;
  pulled_at: string;
}

/**
 * Validate agentId to prevent path traversal attacks
 *
 * @param agentId The agent ID to validate
 * @throws Error if agentId contains invalid characters
 */
function validateAgentId(agentId: string): void {
  if (agentId.includes('..') || agentId.includes('/') || agentId.includes('\\')) {
    throw new Error('Invalid agent ID: cannot contain path separators or traversal sequences');
  }
}

/**
 * Update prompts for an agent from local files
 *
 * @param agentId The unique agent ID to update prompts for
 * @param options Command options
 */
export async function updatePromptsCommand(agentId: string, options: UpdateOptions): Promise<void> {
  try {
    // Validate agent ID to prevent path traversal
    validateAgentId(agentId);

    // Determine source directory
    const baseDir = options.source || '.retell-prompts';
    const agentDir = join(baseDir, agentId);

    // Check if directory exists
    if (!existsSync(agentDir)) {
      outputError(
        `Prompts directory not found: ${agentDir}. Run 'retell prompts pull ${agentId}' first.`,
        'DIRECTORY_NOT_FOUND'
      );
      return;
    }

    // Load and validate metadata
    const metadataPath = join(agentDir, 'metadata.json');
    if (!existsSync(metadataPath)) {
      outputError(
        `metadata.json not found in ${agentDir}. Directory may be corrupted.`,
        'METADATA_NOT_FOUND'
      );
      return;
    }

    const metadata: LocalMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

    // Resolve current agent type to verify it matches local files
    const promptSource = await resolvePromptSource(agentId);

    // Handle custom LLM (not supported)
    if (promptSource.type === 'custom-llm') {
      outputError(promptSource.error, 'CUSTOM_LLM_NOT_SUPPORTED');
      return;
    }

    // Validate type matches
    if (metadata.type !== promptSource.type) {
      outputError(
        `Type mismatch: local files are ${metadata.type}, but agent uses ${promptSource.type}. Pull prompts again to sync.`,
        'TYPE_MISMATCH'
      );
      return;
    }

    // Handle dry-run mode
    if (options.dryRun) {
      // Load local prompts
      let localPrompts;
      try {
        localPrompts = loadLocalPrompts(agentId, agentDir);
      } catch (error: any) {
        outputError(error.message, 'LOCAL_PROMPTS_ERROR');
        return;
      }

      // Generate diff
      let diff;
      try {
        diff = generateDiff(agentId, localPrompts, promptSource);
      } catch (error: any) {
        outputError(error.message, 'DIFF_GENERATION_ERROR');
        return;
      }

      // Output diff with dry-run message
      outputJson({
        message: 'Dry run - no changes applied',
        ...diff,
      });
      return;
    }

    // Update based on type
    const client = getRetellClient();

    if (promptSource.type === 'retell-llm') {
      const prompts = loadRetellLlmPrompts(agentDir);
      await client.llm.update(promptSource.llmId, prompts);

      outputJson({
        message: 'Prompts updated successfully (draft version)',
        agent_id: agentId,
        agent_name: promptSource.agentName,
        type: 'retell-llm',
        llm_id: promptSource.llmId,
        note: `Run 'retell agent-publish ${agentId}' to publish changes to production`,
      });
    } else if (promptSource.type === 'conversation-flow') {
      const prompts = loadConversationFlowPrompts(agentDir);
      await client.conversationFlow.update(promptSource.flowId, prompts);

      outputJson({
        message: 'Prompts updated successfully (draft version)',
        agent_id: agentId,
        agent_name: promptSource.agentName,
        type: 'conversation-flow',
        conversation_flow_id: promptSource.flowId,
        note: `Run 'retell agent-publish ${agentId}' to publish changes to production`,
      });
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      outputError(`Invalid JSON in file: ${error.message}`, 'INVALID_JSON');
      return;
    }

    // Handle SDK errors
    handleSdkError(error);
  }
}

/**
 * Load Retell LLM prompts from local files
 */
function loadRetellLlmPrompts(agentDir: string): any {
  const prompts: any = {};

  // Load general_prompt (required)
  const generalPromptPath = join(agentDir, 'general_prompt.md');
  if (!existsSync(generalPromptPath)) {
    throw new Error('general_prompt.md not found');
  }

  try {
    prompts.general_prompt = readFileSync(generalPromptPath, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read general_prompt.md: ${error.message}`);
  }

  // Load begin_message (optional) - only add if file exists
  const beginMessagePath = join(agentDir, 'begin_message.txt');
  if (existsSync(beginMessagePath)) {
    try {
      const beginMessage = readFileSync(beginMessagePath, 'utf-8');
      if (beginMessage) {
        prompts.begin_message = beginMessage;
      }
    } catch (error: any) {
      throw new Error(`Failed to read begin_message.txt: ${error.message}`);
    }
  }

  // Load states (optional)
  const statesDir = join(agentDir, 'states');
  if (existsSync(statesDir)) {
    try {
      const stateFiles = readdirSync(statesDir).filter((f) => f.endsWith('.md'));
      if (stateFiles.length > 0) {
        prompts.states = stateFiles.map((file) => {
          const stateName = file.replace('.md', '');
          let content: string;

          try {
            content = readFileSync(join(statesDir, file), 'utf-8');
          } catch (error: any) {
            throw new Error(`Failed to read state file ${file}: ${error.message}`);
          }

          // Extract state_prompt from markdown content using regex
          // Format: "# State: name\n\nprompt content"
          const STATE_HEADER_REGEX = /^#\s+State:\s+(.+)$/m;
          const match = content.match(STATE_HEADER_REGEX);
          if (!match) {
            throw new Error(`Invalid state file format in ${file}: missing "# State:" header`);
          }
          const statePrompt = content.replace(STATE_HEADER_REGEX, '').trim();

          return {
            name: stateName,
            state_prompt: statePrompt,
          };
        });
      }
    } catch (error: any) {
      if (error.message.includes('Invalid state file format') || error.message.includes('Failed to read state file')) {
        throw error; // Re-throw our custom errors
      }
      throw new Error(`Failed to read states directory: ${error.message}`);
    }
  }

  return prompts;
}

/**
 * Load Conversation Flow prompts from local files
 */
function loadConversationFlowPrompts(agentDir: string): any {
  const prompts: any = {};

  // Load global_prompt (required)
  const globalPromptPath = join(agentDir, 'global_prompt.md');
  if (!existsSync(globalPromptPath)) {
    throw new Error('global_prompt.md not found');
  }

  try {
    prompts.global_prompt = readFileSync(globalPromptPath, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read global_prompt.md: ${error.message}`);
  }

  // Load nodes (required)
  const nodesPath = join(agentDir, 'nodes.json');
  if (!existsSync(nodesPath)) {
    throw new Error('nodes.json not found');
  }

  try {
    const nodesContent = JSON.parse(readFileSync(nodesPath, 'utf-8'));

    // Validate that nodes is an array
    if (!Array.isArray(nodesContent)) {
      throw new Error('nodes.json must contain an array');
    }

    prompts.nodes = nodesContent;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in nodes.json: ${error.message}`);
    }
    throw error; // Re-throw if it's our custom error or other errors
  }

  return prompts;
}
