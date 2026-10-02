/**
 * Prompts Update Command
 *
 * Uploads local prompt changes to Retell.
 * Reads prompts from .retell-prompts/<agent_id>/ directory and updates
 * the agent's LLM config or conversation flow.
 */

import {
  readFileSync,
  existsSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "fs";
import { join } from "path";
import { resolvePromptSource } from "../../services/prompt-resolver";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import { loadLocalPrompts } from "../../services/prompt-loader";
import { generateDiff } from "../../services/prompt-diff";

/**
 * Options for the update command
 */
interface UpdateOptions {
  source?: string; // Source directory (default: .retell-prompts)
  dryRun?: boolean; // Preview changes without applying them
  force?: boolean; // Overwrite even if remote changed since last pull
}

/**
 * Metadata structure from local files
 */
interface LocalMetadata {
  type: "retell-llm" | "conversation-flow";
  agent_name: string;
  llm_id?: string;
  conversation_flow_id?: string;
  version: number;
  remote_modified_at?: number; // last_modification_timestamp at pull time
  pulled_at: string;
}

/**
 * Remote state relevant to conflict detection
 */
interface RemoteState {
  resource_id: string;
  version: number;
  last_modification_timestamp?: number;
}

/**
 * Describes why the remote is considered newer than the local copy
 */
export interface RemoteConflict {
  local_version: number;
  remote_version: number;
  local_modified_at?: number;
  remote_modified_at?: number;
  local_resource_id?: string;
  remote_resource_id: string;
  reason: "resource_changed" | "remote_modified" | "remote_version_newer";
}

/**
 * Detect whether the remote prompts changed since they were pulled.
 *
 * - A different LLM / conversation flow than the one pulled is always a
 *   conflict (the agent was repointed; local files belong to another resource).
 * - A newer last_modification_timestamp catches draft edits that don't bump
 *   the version.
 * - A newer version is a conflict regardless; it is also the only signal for
 *   metadata written by older CLI releases that didn't record the timestamp.
 */
export function detectRemoteConflict(
  metadata: Pick<
    LocalMetadata,
    "version" | "remote_modified_at" | "llm_id" | "conversation_flow_id"
  >,
  remote: RemoteState,
): RemoteConflict | null {
  const localResourceId = metadata.llm_id ?? metadata.conversation_flow_id;
  const base = {
    local_version: metadata.version,
    remote_version: remote.version,
    local_modified_at: metadata.remote_modified_at,
    remote_modified_at: remote.last_modification_timestamp,
    local_resource_id: localResourceId,
    remote_resource_id: remote.resource_id,
  };

  if (localResourceId && localResourceId !== remote.resource_id) {
    return { ...base, reason: "resource_changed" };
  }

  if (
    typeof metadata.remote_modified_at === "number" &&
    typeof remote.last_modification_timestamp === "number" &&
    remote.last_modification_timestamp > metadata.remote_modified_at
  ) {
    return { ...base, reason: "remote_modified" };
  }

  if (
    typeof metadata.version === "number" &&
    typeof remote.version === "number" &&
    remote.version > metadata.version
  ) {
    return { ...base, reason: "remote_version_newer" };
  }

  return null;
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
 * After a successful update, record the new remote state so the next update
 * from this same local copy isn't flagged as a conflict.
 *
 * Writes atomically (temp file + rename) so a failed write never truncates
 * metadata.json. Returns a warning string if the refresh failed; the remote
 * update already succeeded, so this is reported rather than fatal.
 */
function recordRemoteState(
  metadataPath: string,
  metadata: LocalMetadata,
  resource: { llm_id: string } | { conversation_flow_id: string },
  updated: { version?: number; last_modification_timestamp?: number } | null,
): string | undefined {
  if (
    typeof updated?.version !== "number" ||
    typeof updated?.last_modification_timestamp !== "number"
  ) {
    // Don't persist values known to predate this write.
    return `Remote update succeeded, but the response did not include the new version/timestamp, so ${metadataPath} was not refreshed. The next update may report REMOTE_CHANGED; run 'retell prompts pull' to resync.`;
  }
  const next: LocalMetadata = {
    ...metadata,
    // After a forced update to a repointed agent, the local copy now tracks
    // the new resource; keep it from being flagged as resource_changed again.
    ...resource,
    version: updated.version,
    remote_modified_at: updated.last_modification_timestamp,
  };
  const tmpPath = `${metadataPath}.tmp`;
  try {
    writeFileSync(tmpPath, JSON.stringify(next, null, 2));
    renameSync(tmpPath, metadataPath);
    return undefined;
  } catch (error: any) {
    try {
      rmSync(tmpPath, { force: true });
    } catch {
      // Best-effort cleanup only.
    }
    return `Remote update succeeded, but ${metadataPath} could not be refreshed (${error?.message ?? error}). The next update may report REMOTE_CHANGED; run 'retell prompts pull' to resync.`;
  }
}

/**
 * Update prompts for an agent from local files
 *
 * @param agentId The unique agent ID to update prompts for
 * @param options Command options
 */
export async function updatePromptsCommand(
  agentId: string,
  options: UpdateOptions,
): Promise<void> {
  try {
    // Validate agent ID to prevent path traversal
    validateAgentId(agentId);

    // Determine source directory
    const baseDir = options.source || ".retell-prompts";
    const agentDir = join(baseDir, agentId);

    // Check if directory exists
    if (!existsSync(agentDir)) {
      outputError(
        `Prompts directory not found: ${agentDir}. Run 'retell prompts pull ${agentId}' first.`,
        "DIRECTORY_NOT_FOUND",
      );
      return;
    }

    // Load and validate metadata
    const metadataPath = join(agentDir, "metadata.json");
    if (!existsSync(metadataPath)) {
      outputError(
        `metadata.json not found in ${agentDir}. Directory may be corrupted.`,
        "METADATA_NOT_FOUND",
      );
      return;
    }

    const metadata: LocalMetadata = JSON.parse(
      readFileSync(metadataPath, "utf-8"),
    );

    // Resolve current agent type to verify it matches local files
    const promptSource = await resolvePromptSource(agentId);

    // Handle custom LLM (not supported)
    if (promptSource.type === "custom-llm") {
      outputError(promptSource.error, "CUSTOM_LLM_NOT_SUPPORTED");
      return;
    }

    // Validate type matches
    if (metadata.type !== promptSource.type) {
      outputError(
        `Type mismatch: local files are ${metadata.type}, but agent uses ${promptSource.type}. Pull prompts again to sync.`,
        "TYPE_MISMATCH",
      );
      return;
    }

    // Detect remote changes made since the local copy was pulled
    const conflict = detectRemoteConflict(metadata, {
      resource_id:
        promptSource.type === "retell-llm"
          ? promptSource.llmId
          : promptSource.flowId,
      version: promptSource.prompts.version,
      last_modification_timestamp:
        promptSource.prompts.last_modification_timestamp,
    });

    // Handle dry-run mode
    if (options.dryRun) {
      // Load local prompts
      let localPrompts;
      try {
        localPrompts = loadLocalPrompts(agentId, agentDir);
      } catch (error: any) {
        outputError(error.message, "LOCAL_PROMPTS_ERROR");
        return;
      }

      // Generate diff
      let diff;
      try {
        diff = generateDiff(agentId, localPrompts, promptSource);
      } catch (error: any) {
        outputError(error.message, "DIFF_GENERATION_ERROR");
        return;
      }

      // Output diff with dry-run message
      outputJson({
        message: "Dry run - no changes applied",
        ...diff,
        ...(conflict && {
          remote_conflict: conflict,
          warning: `Remote prompts changed since last pull; a real update would be refused without --force. Run 'retell prompts pull ${agentId}' to sync.`,
        }),
      });
      return;
    }

    if (conflict && !options.force) {
      outputError(
        conflict.reason === "resource_changed"
          ? `Agent now uses ${conflict.remote_resource_id}, but local files were pulled from ${conflict.local_resource_id}. Updating would overwrite a different resource. Run 'retell prompts pull ${agentId}' to sync (this overwrites local files), or re-run with --force to overwrite the remote.`
          : `Remote prompts changed since they were pulled (local version ${conflict.local_version}, remote version ${conflict.remote_version}). Updating would overwrite those changes. Run 'retell prompts pull ${agentId}' to sync (this overwrites local files), 'retell prompts diff ${agentId}' to compare, or re-run with --force to overwrite the remote.`,
        "REMOTE_CHANGED",
        { ...conflict },
      );
      return;
    }

    // Load local prompts using shared utility
    let localPrompts;
    try {
      localPrompts = loadLocalPrompts(agentId, agentDir);
    } catch (error: any) {
      outputError(error.message, "LOCAL_PROMPTS_ERROR");
      return;
    }

    // Update based on type
    const client = getRetellClient();

    if (
      promptSource.type === "retell-llm" &&
      localPrompts.type === "retell-llm"
    ) {
      const updated = await client.llm.update(
        promptSource.llmId,
        localPrompts.prompts as any,
      );
      const warning = recordRemoteState(
        metadataPath,
        metadata,
        { llm_id: promptSource.llmId },
        updated,
      );

      outputJson({
        message: "Prompts updated successfully (draft version)",
        agent_id: agentId,
        agent_name: promptSource.agentName,
        type: "retell-llm",
        llm_id: promptSource.llmId,
        ...(warning && { warning }),
        note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
      });
    } else if (
      promptSource.type === "conversation-flow" &&
      localPrompts.type === "conversation-flow"
    ) {
      const updated = await client.conversationFlow.update(
        promptSource.flowId,
        localPrompts.prompts as any,
      );
      const warning = recordRemoteState(
        metadataPath,
        metadata,
        { conversation_flow_id: promptSource.flowId },
        updated,
      );

      outputJson({
        message: "Prompts updated successfully (draft version)",
        agent_id: agentId,
        agent_name: promptSource.agentName,
        type: "conversation-flow",
        conversation_flow_id: promptSource.flowId,
        ...(warning && { warning }),
        note: `Run 'retell agents publish ${agentId}' to publish changes to production`,
      });
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      outputError(`Invalid JSON in file: ${error.message}`, "INVALID_JSON");
      return;
    }

    // Handle SDK errors
    handleSdkError(error);
  }
}
