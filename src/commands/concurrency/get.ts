/**
 * Concurrency Get Command
 *
 * Retrieves the org's current call concurrency and limits.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetConcurrencyOptions {
  fields?: string;
}

export async function getConcurrencyCommand(
  options: GetConcurrencyOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const result = await client.concurrency.retrieve();

    const output = options.fields
      ? filterFields(
          result,
          options.fields.split(",").map((f) => f.trim()),
        )
      : result;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
