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
import { readJsonFile } from "../../services/json-arg";
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
    const body = readJsonFile(options.file, "--file") as LlmUpdateParams;

    if (options.version !== undefined) {
      const v = Number(options.version);
      if (isNaN(v)) throwValidation("--version must be a number");
      (body as unknown as Record<string, number>).version = v;
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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
