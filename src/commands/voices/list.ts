/**
 * Voices List Command
 *
 * Lists all voices available to this account.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ListVoicesOptions {
  fields?: string;
}

export async function listVoicesCommand(
  options: ListVoicesOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const voices = await client.voice.list();

    const output = options.fields
      ? filterFields(
          voices,
          options.fields.split(",").map((f) => f.trim()),
        )
      : voices;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
