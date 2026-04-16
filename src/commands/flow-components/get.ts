/**
 * Flow Components Get Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetFlowComponentOptions {
  fields?: string;
}

export async function getFlowComponentCommand(
  componentId: string,
  options: GetFlowComponentOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const component =
      await client.conversationFlowComponent.retrieve(componentId);

    const output = options.fields
      ? filterFields(
          component,
          options.fields.split(",").map((f) => f.trim()),
        )
      : component;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
