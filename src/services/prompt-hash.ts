/**
 * Prompt Content Fingerprint
 *
 * A stable hash of the prompt fields the CLI manages. Stored in metadata.json
 * so `prompts update` can tell a real remote edit from a change that only
 * bumped last_modification_timestamp or version (publishing, or creating a
 * draft copy, does that without changing any prompt text).
 */

import { createHash } from "crypto";

/** Prompt fields managed for retell-llm agents */
export interface LlmPromptFields {
  general_prompt?: string | null;
  begin_message?: string | null;
  states?: Array<{ name: string; state_prompt?: string | null }> | null;
}

/** Prompt fields managed for conversation-flow agents */
export interface FlowPromptFields {
  global_prompt?: string | null;
  nodes?: unknown[] | null;
}

/** JSON.stringify with object keys sorted, so equal content hashes equally. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Fingerprint the prompt content of a Retell LLM. */
export function hashLlmPrompts(fields: LlmPromptFields): string {
  return sha256(
    stableStringify({
      general_prompt: fields.general_prompt || "",
      begin_message: fields.begin_message || "",
      states: (fields.states ?? []).map((s) => ({
        name: s.name,
        state_prompt: s.state_prompt || "",
      })),
    }),
  );
}

/** Fingerprint the prompt content of a conversation flow. */
export function hashFlowPrompts(fields: FlowPromptFields): string {
  return sha256(
    stableStringify({
      global_prompt: fields.global_prompt || "",
      nodes: fields.nodes ?? [],
    }),
  );
}
