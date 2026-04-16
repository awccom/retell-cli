/**
 * Flow Components Create Command
 *
 * Requires a JSON body via --file.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonObjectFile } from "../../services/json-arg";
import type { ConversationFlowComponentCreateParams } from "retell-sdk/resources/conversation-flow-component";

export interface CreateFlowComponentOptions {
  file: string;
  fields?: string;
}

export async function createFlowComponentCommand(
  options: CreateFlowComponentOptions,
): Promise<void> {
  try {
    const body = readJsonObjectFile(
      options.file,
      "--file",
    ) as unknown as ConversationFlowComponentCreateParams;

    const client = getRetellClient();
    const component = await client.conversationFlowComponent.create(body);

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
