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
import { parseNumericFlag } from "../../services/numeric-flag";
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
      query.limit = parseNumericFlag(options.limit, "--limit");
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.paginationKeyVersion !== undefined) {
      query.pagination_key_version = parseNumericFlag(
        options.paginationKeyVersion,
        "--pagination-key-version",
      );
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
