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

/**
 * Options for the update command
 */
interface UpdateOptions {
  source?: string; // Source directory (default: .retell-prompts)
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
 * Update prompts for an agent from local files
 *
 * @param agentId The unique agent ID to update prompts for
 * @param options Command options
 */
export async function updatePromptsCommand(agentId: string, options: UpdateOptions): Promise<void> {
  try {
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
        note: 'Run `retell agent-publish ' + agentId + '` to publish changes to production',
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
        note: 'Run `retell agent-publish ' + agentId + '` to publish changes to production',
      });
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      outputError('Invalid JSON in file: ' + error.message, 'INVALID_JSON');
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
  prompts.general_prompt = readFileSync(generalPromptPath, 'utf-8');

  // Load begin_message (optional) - only add if file exists
  const beginMessagePath = join(agentDir, 'begin_message.txt');
  if (existsSync(beginMessagePath)) {
    const beginMessage = readFileSync(beginMessagePath, 'utf-8');
    if (beginMessage) {
      prompts.begin_message = beginMessage;
    }
  }

  // Load states (optional)
  const statesDir = join(agentDir, 'states');
  if (existsSync(statesDir)) {
    const stateFiles = readdirSync(statesDir).filter((f) => f.endsWith('.md'));
    if (stateFiles.length > 0) {
      prompts.states = stateFiles.map((file) => {
        const stateName = file.replace('.md', '');
        const content = readFileSync(join(statesDir, file), 'utf-8');

        // Extract state_prompt from markdown content
        // Format: "# State: name\n\nprompt content"
        const lines = content.split('\n');
        const promptStartIndex = lines.findIndex((line) => line.trim() === '') + 1;
        const statePrompt = lines.slice(promptStartIndex).join('\n').trim();

        return {
          name: stateName,
          state_prompt: statePrompt,
        };
      });
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
  prompts.global_prompt = readFileSync(globalPromptPath, 'utf-8');

  // Load nodes (required)
  const nodesPath = join(agentDir, 'nodes.json');
  if (!existsSync(nodesPath)) {
    throw new Error('nodes.json not found');
  }
  prompts.nodes = JSON.parse(readFileSync(nodesPath, 'utf-8'));

  return prompts;
}
