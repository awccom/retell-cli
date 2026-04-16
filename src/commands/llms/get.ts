/**
 * LLMs Get Command
 *
 * Retrieves a specific Retell LLM (optionally at a specific version).
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetLlmOptions {
  version?: string;
  fields?: string;
}

export async function getLlmCommand(
  llmId: string,
  options: GetLlmOptions = {},
): Promise<void> {
  try {
    const query: { version?: number } = {};
    if (options.version !== undefined) {
      const v = Number(options.version);
      if (isNaN(v)) throwValidation("--version must be a number");
      query.version = v;
    }

    const client = getRetellClient();
    const llm = await client.llm.retrieve(llmId, query as any);

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
