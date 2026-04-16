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
import { parseNumericFlag } from "../../services/numeric-flag";

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
      query.version = parseNumericFlag(options.version, "--version");
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
