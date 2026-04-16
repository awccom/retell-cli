/**
 * LLMs List Command
 *
 * Lists all Retell LLM response engines.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { LlmListParams } from "retell-sdk/resources/llm";

export interface ListLlmsOptions {
  limit?: string;
  paginationKey?: string;
  paginationKeyVersion?: string;
  fields?: string;
}

export async function listLlmsCommand(
  options: ListLlmsOptions = {},
): Promise<void> {
  try {
    const query: LlmListParams = {};
    if (options.limit !== undefined) {
      const v = Number(options.limit);
      if (isNaN(v)) throwValidation("--limit must be a number");
      query.limit = v;
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.paginationKeyVersion !== undefined) {
      const v = Number(options.paginationKeyVersion);
      if (isNaN(v))
        throwValidation("--pagination-key-version must be a number");
      query.pagination_key_version = v;
    }

    const client = getRetellClient();
    const llms = await client.llm.list(query);

    const output = options.fields
      ? filterFields(
          llms,
          options.fields.split(",").map((f) => f.trim()),
        )
      : llms;

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
