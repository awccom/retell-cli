/**
 * Prompts Pull Command
 *
 * Downloads agent prompts to local files for editing.
 * Creates different file structures based on agent type:
 * - retell-llm: general_prompt.md, begin_message.txt, states/
 * - conversation-flow: global_prompt.md, nodes.json
 */

import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { resolvePromptSource } from "../../services/prompt-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import { DEFAULT_PROMPTS_DIR, PROMPT_FILES } from "../../services/prompt-files";
import { outputFsError } from "../../services/fs-errors";

/**
 * Options for the pull command
 */
interface PullOptions {
  output?: string; // Output directory (default: .retell-prompts)
}

/**
 * Validate agentId to prevent path traversal attacks
 *
 * @param agentId The agent ID to validate
 * @throws Error if agentId contains invalid characters
 */
function validateAgentId(agentId: string): void {
  if (
    agentId.includes("..") ||
    agentId.includes("/") ||
    agentId.includes("\\")
  ) {
    throw new Error(
      "Invalid agent ID: cannot contain path separators or traversal sequences",
    );
  }
}

/**
 * Pull prompts for an agent and save to local files
 *
 * @param agentId The unique agent ID to pull prompts for
 * @param options Command options
 */
export async function pullPromptsCommand(
  agentId: string,
  options: PullOptions,
): Promise<void> {
  try {
    // Validate agent ID to prevent path traversal
    validateAgentId(agentId);

    // Resolve the prompt source
    const promptSource = await resolvePromptSource(agentId);

    // Handle custom LLM (error case)
    if (promptSource.type === "custom-llm") {
      outputError(promptSource.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    // Determine output directory
    const baseDir = options.output || DEFAULT_PROMPTS_DIR;
    const agentDir = join(baseDir, agentId);

    // Create agent directory with error handling
    try {
      mkdirSync(agentDir, { recursive: true });
    } catch (error) {
      return outputFsError(error, {
        permissionDenied: `Permission denied creating directory: ${agentDir}`,
        noSpace: `No space left on device: ${agentDir}`,
        fallback: "Failed to create directory",
        fallbackCode: "FS_ERROR",
      });
    }

    // Save prompts based on type
    try {
      // Drop the old sync baseline first. If any write below fails, the
      // directory has no metadata.json, so `prompts update` refuses to upload
      // a partially refreshed copy instead of treating it as in sync.
      rmSync(join(agentDir, PROMPT_FILES.METADATA), { force: true });

      if (promptSource.type === "retell-llm") {
        saveRetellLlmPrompts(agentDir, promptSource);
      } else if (promptSource.type === "conversation-flow") {
        saveConversationFlowPrompts(agentDir, promptSource);
      }
    } catch (error) {
      return outputFsError(error, {
        permissionDenied: `Permission denied writing files to: ${agentDir}`,
        noSpace: `No space left on device: ${agentDir}`,
        fallback: "Failed to write prompt files",
        fallbackCode: "FS_ERROR",
      });
    }

    // Output success message
    outputJson({
      message: "Prompts pulled successfully",
      agent_id: agentId,
      agent_name: promptSource.agentName,
      type: promptSource.type,
      directory: agentDir,
      files_created: getFilesCreated(promptSource.type, promptSource),
    });
  } catch (error) {
    handleSdkError(error);
  }
}

/**
 * Save Retell LLM prompts to files
 */
function saveRetellLlmPrompts(
  agentDir: string,
  promptSource: Extract<
    Awaited<ReturnType<typeof resolvePromptSource>>,
    { type: "retell-llm" }
  >,
): void {
  const { prompts, llmId, agentName } = promptSource;

  // Save general prompt as markdown
  writeFileSync(
    join(agentDir, PROMPT_FILES.GENERAL_PROMPT),
    prompts.general_prompt || "",
  );

  // Save begin message if present; remove a stale copy from an earlier pull
  // so it isn't later re-uploaded as a local addition.
  const beginMessagePath = join(agentDir, PROMPT_FILES.BEGIN_MESSAGE);
  if (prompts.begin_message) {
    writeFileSync(beginMessagePath, prompts.begin_message);
  } else {
    rmSync(beginMessagePath, { force: true });
  }

  // Replace states/ wholesale so states removed remotely don't linger locally
  const statesDir = join(agentDir, PROMPT_FILES.STATES_DIR);
  rmSync(statesDir, { recursive: true, force: true });
  if (prompts.states && prompts.states.length > 0) {
    mkdirSync(statesDir, { recursive: true });

    prompts.states.forEach((state) => {
      const filename = `${state.name}.md`;
      const content = `# State: ${state.name}\n\n${state.state_prompt}`;
      writeFileSync(join(statesDir, filename), content);
    });
  }

  // Write metadata last: it is the sync baseline for `prompts update`, so it
  // must only advance once every prompt file has been written.
  writeMetadata(agentDir, {
    type: "retell-llm",
    agent_name: agentName,
    llm_id: llmId,
    version: prompts.version,
    remote_modified_at: prompts.last_modification_timestamp,
    pulled_at: new Date().toISOString(),
  });
}

/**
 * Write metadata.json. Called after all prompt files are written so a failed
 * pull never records a baseline for files that weren't refreshed.
 */
function writeMetadata(agentDir: string, metadata: Record<string, unknown>) {
  writeFileSync(
    join(agentDir, PROMPT_FILES.METADATA),
    JSON.stringify(metadata, null, 2),
  );
}

/**
 * Save Conversation Flow prompts to files
 */
function saveConversationFlowPrompts(
  agentDir: string,
  promptSource: Extract<
    Awaited<ReturnType<typeof resolvePromptSource>>,
    { type: "conversation-flow" }
  >,
): void {
  const { prompts, flowId, agentName } = promptSource;

  // Save global prompt as markdown
  writeFileSync(
    join(agentDir, PROMPT_FILES.GLOBAL_PROMPT),
    prompts.global_prompt || "",
  );

  // Save nodes as JSON
  writeFileSync(
    join(agentDir, PROMPT_FILES.NODES),
    JSON.stringify(prompts.nodes, null, 2),
  );

  // Write metadata last (see saveRetellLlmPrompts)
  writeMetadata(agentDir, {
    type: "conversation-flow",
    agent_name: agentName,
    conversation_flow_id: flowId,
    version: prompts.version,
    remote_modified_at: prompts.last_modification_timestamp,
    pulled_at: new Date().toISOString(),
  });
}

/**
 * Get list of files created for success message
 */
function getFilesCreated(
  type: string,
  promptSource: Awaited<ReturnType<typeof resolvePromptSource>>,
): string[] {
  const files: string[] = [PROMPT_FILES.METADATA];

  if (type === "retell-llm" && promptSource.type === "retell-llm") {
    files.push(PROMPT_FILES.GENERAL_PROMPT);
    if (promptSource.prompts.begin_message) {
      files.push(PROMPT_FILES.BEGIN_MESSAGE);
    }
    if (promptSource.prompts.states && promptSource.prompts.states.length > 0) {
      files.push(`states/ (${promptSource.prompts.states.length} state files)`);
    }
  } else if (type === "conversation-flow") {
    files.push(PROMPT_FILES.GLOBAL_PROMPT);
    files.push(PROMPT_FILES.NODES);
  }

  return files;
}
