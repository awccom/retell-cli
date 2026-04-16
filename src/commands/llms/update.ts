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
    const body = readJsonObjectFile(
      options.file,
      "--file",
    ) as unknown as LlmUpdateParams;

    if (options.version !== undefined) {
      body.query_version = parseNumericFlag(options.version, "--version");
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
