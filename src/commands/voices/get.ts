/**
 * Voices Get Command
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetVoiceOptions {
  fields?: string;
}

export async function getVoiceCommand(
  voiceId: string,
  options: GetVoiceOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const voice = await client.voice.retrieve(voiceId);

    const output = options.fields
      ? filterFields(
          voice,
          options.fields.split(",").map((f) => f.trim()),
        )
      : voice;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
