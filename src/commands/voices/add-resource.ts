/**
 * Voices Add Resource Command
 *
 * Adds a community voice (from a provider) to the account's voice library.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { VoiceAddResourceParams } from "retell-sdk/resources/voice";

export interface AddVoiceResourceOptions {
  providerVoiceId: string;
  voiceName: string;
  voiceProvider?: string;
  publicUserId?: string;
  fields?: string;
}

const VALID_PROVIDERS = [
  "elevenlabs",
  "cartesia",
  "minimax",
  "fish_audio",
] as const;

export async function addVoiceResourceCommand(
  options: AddVoiceResourceOptions,
): Promise<void> {
  try {
    if (
      options.voiceProvider &&
      !VALID_PROVIDERS.includes(options.voiceProvider as never)
    ) {
      throwValidation(
        `--voice-provider must be one of: ${VALID_PROVIDERS.join(", ")}`,
      );
    }

    const params: VoiceAddResourceParams = {
      provider_voice_id: options.providerVoiceId,
      voice_name: options.voiceName,
    };
    if (options.voiceProvider)
      params.voice_provider =
        options.voiceProvider as VoiceAddResourceParams["voice_provider"];
    if (options.publicUserId) params.public_user_id = options.publicUserId;

    const client = getRetellClient();
    const voice = await client.voice.addResource(params);

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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
