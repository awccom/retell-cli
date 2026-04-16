/**
 * Flow Components Update Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonObjectFile } from "../../services/json-arg";
import type { ConversationFlowComponentUpdateParams } from "retell-sdk/resources/conversation-flow-component";

export interface UpdateFlowComponentOptions {
  file: string;
  fields?: string;
}

export async function updateFlowComponentCommand(
  componentId: string,
  options: UpdateFlowComponentOptions,
): Promise<void> {
  try {
    const rawBody = readJsonObjectFile(options.file, "--file");
    if (Object.keys(rawBody).length === 0) {
      const err = new Error(
        "--file body is empty. Pass at least one mutation field.",
      );
      err.name = "ValidationError";
      throw err;
    }
    const body = rawBody as unknown as ConversationFlowComponentUpdateParams;

    const client = getRetellClient();
    const component = await client.conversationFlowComponent.update(
      componentId,
      body,
    );

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
