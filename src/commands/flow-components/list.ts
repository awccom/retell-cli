/**
 * Flow Components List Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ListFlowComponentsOptions {
  fields?: string;
}

export async function listFlowComponentsCommand(
  options: ListFlowComponentsOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const items = await client.conversationFlowComponent.list();

    const output = options.fields
      ? filterFields(
          items,
          options.fields.split(",").map((f) => f.trim()),
        )
      : items;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
