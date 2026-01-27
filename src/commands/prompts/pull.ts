/**
 * Prompts Pull Command
 *
 * Downloads agent prompts to local files for editing.
 * Creates different file structures based on agent type:
 * - retell-llm: general_prompt.md, begin_message.txt, states/
 * - conversation-flow: global_prompt.md, nodes.json
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { resolvePromptSource } from "../../services/prompt-resolver";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";

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
    const baseDir = options.output || ".retell-prompts";
    const agentDir = join(baseDir, agentId);

    // Create agent directory with error handling
    try {
      mkdirSync(agentDir, { recursive: true });
    } catch (error: any) {
      if (error.code === "EACCES") {
        outputError(
          `Permission denied creating directory: ${agentDir}`,
          "PERMISSION_DENIED",
        );
      } else if (error.code === "ENOSPC") {
        outputError(`No space left on device: ${agentDir}`, "NO_SPACE");
      } else {
        outputError(`Failed to create directory: ${error.message}`, "FS_ERROR");
      }
      return;
    }

    // Save prompts based on type
    try {
      if (promptSource.type === "retell-llm") {
        saveRetellLlmPrompts(agentDir, promptSource);
      } else if (promptSource.type === "conversation-flow") {
        saveConversationFlowPrompts(agentDir, promptSource);
      }
    } catch (error: any) {
      if (error.code === "EACCES") {
        outputError(
          `Permission denied writing files to: ${agentDir}`,
          "PERMISSION_DENIED",
        );
      } else if (error.code === "ENOSPC") {
        outputError(`No space left on device: ${agentDir}`, "NO_SPACE");
      } else {
        outputError(
          `Failed to write prompt files: ${error.message}`,
          "FS_ERROR",
        );
      }
      return;
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

  // Save metadata
  const metadata = {
    type: "retell-llm",
    agent_name: agentName,
    llm_id: llmId,
    version: prompts.version,
    pulled_at: new Date().toISOString(),
  };
  writeFileSync(
    join(agentDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
  );

  // Save general prompt as markdown
  writeFileSync(
    join(agentDir, "general_prompt.md"),
    prompts.general_prompt || "",
  );

  // Save begin message if present
  if (prompts.begin_message) {
    writeFileSync(join(agentDir, "begin_message.txt"), prompts.begin_message);
  }

  // Save states if present
  if (prompts.states && prompts.states.length > 0) {
    const statesDir = join(agentDir, "states");
    mkdirSync(statesDir, { recursive: true });

    prompts.states.forEach((state) => {
      const filename = `${state.name}.md`;
      const content = `# State: ${state.name}\n\n${state.state_prompt}`;
      writeFileSync(join(statesDir, filename), content);
    });
  }
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

  // Save metadata
  const metadata = {
    type: "conversation-flow",
    agent_name: agentName,
    conversation_flow_id: flowId,
    version: prompts.version,
    pulled_at: new Date().toISOString(),
  };
  writeFileSync(
    join(agentDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
  );

  // Save global prompt as markdown
  writeFileSync(
    join(agentDir, "global_prompt.md"),
    prompts.global_prompt || "",
  );

  // Save nodes as JSON
  writeFileSync(
    join(agentDir, "nodes.json"),
    JSON.stringify(prompts.nodes, null, 2),
  );
}

/**
 * Get list of files created for success message
 */
function getFilesCreated(
  type: string,
  promptSource: Awaited<ReturnType<typeof resolvePromptSource>>,
): string[] {
  const files = ["metadata.json"];

  if (type === "retell-llm" && promptSource.type === "retell-llm") {
    files.push("general_prompt.md");
    if (promptSource.prompts.begin_message) {
      files.push("begin_message.txt");
    }
    if (promptSource.prompts.states && promptSource.prompts.states.length > 0) {
      files.push(`states/ (${promptSource.prompts.states.length} state files)`);
    }
  } else if (type === "conversation-flow") {
    files.push("global_prompt.md");
    files.push("nodes.json");
  }

  return files;
}
