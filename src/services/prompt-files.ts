/**
 * Prompt File Layout
 *
 * Single source of truth for the on-disk layout used by
 * `prompts pull`, `prompts diff`, and `prompts update`:
 *
 *   <base dir>/<agent_id>/
 *     metadata.json          sync baseline (type, resource id, version, timestamp)
 *     general_prompt.md      retell-llm
 *     begin_message.txt      retell-llm (optional)
 *     states/<name>.md       retell-llm (optional)
 *     global_prompt.md       conversation-flow
 *     nodes.json             conversation-flow
 */

/** Default base directory for pulled prompts */
export const DEFAULT_PROMPTS_DIR = ".retell-prompts";

/** File and directory names inside <base dir>/<agent_id>/ */
export const PROMPT_FILES = {
  METADATA: "metadata.json",
  GENERAL_PROMPT: "general_prompt.md",
  BEGIN_MESSAGE: "begin_message.txt",
  STATES_DIR: "states",
  GLOBAL_PROMPT: "global_prompt.md",
  NODES: "nodes.json",
} as const;
