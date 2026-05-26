/**
 * LLMs Update Command
 *
 * Updates a Retell LLM. Body must come from a JSON file.
 * Usage: retell llms update <llm_id> --file <path> [--version <n>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonObjectFile } from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import type { LlmUpdateParams } from "retell-sdk/resources/llm";

export interface UpdateLlmOptions {
  file: string;
  version?: string;
  fields?: string;
}

export async function updateLlmCommand(
  llmId: string,
  options: UpdateLlmOptions,
): Promise<void> {
  try {
    const rawBody = readJsonObjectFile(options.file, "--file");
    if (Object.keys(rawBody).length === 0) {
      const err = new Error(
        "--file body is empty. Pass at least one mutation field (e.g. general_prompt, model).",
      );
      err.name = "ValidationError";
      throw err;
    }
    const body = rawBody as unknown as LlmUpdateParams;

    if (options.version !== undefined) {
      body.version = parseNumericFlag(options.version, "--version");
    }

    const client = getRetellClient();
    const llm = await client.llm.update(llmId, body);

    const output = options.fields
      ? filterFields(
          llm,
          options.fields.split(",").map((f) => f.trim()),
        )
      : llm;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
