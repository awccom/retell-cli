/**
 * Flow Components Update Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonFile } from "../../services/json-arg";
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
    const body = readJsonFile(
      options.file,
      "--file",
    ) as ConversationFlowComponentUpdateParams;

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
