/**
 * Voices Clone Command
 *
 * Clones a voice from one or more audio files.
 * Usage: retell voices clone --voice-name <n> --voice-provider <p> --file <path> [--file <path>...]
 */

import { createReadStream, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { requireNonEmpty } from "../../services/flag-guards";
import type { VoiceCloneParams } from "retell-sdk/resources/voice";

const VALID_PROVIDERS = [
  "elevenlabs",
  "cartesia",
  "minimax",
  "fish_audio",
  "platform",
] as const;

export interface CloneVoiceOptions {
  voiceName: string;
  voiceProvider: string;
  file?: string[];
  fields?: string;
}

export async function cloneVoiceCommand(
  options: CloneVoiceOptions,
): Promise<void> {
  try {
    if (!VALID_PROVIDERS.includes(options.voiceProvider as never)) {
      throwValidation(
        `--voice-provider must be one of: ${VALID_PROVIDERS.join(", ")}`,
      );
    }

    const files = options.file ?? [];
    if (files.length === 0) {
      throwValidation("at least one --file is required");
    }

    for (const path of files) {
      if (!existsSync(path)) {
        throwValidation(`--file: not found: ${path}`);
      }
    }

    const params: VoiceCloneParams = {
      voice_name: requireNonEmpty(options.voiceName, "--voice-name"),
      voice_provider:
        options.voiceProvider as VoiceCloneParams["voice_provider"],
      files: files.map((p) => createReadStream(p)),
    };

    const client = getRetellClient();
    const voice = await client.voice.clone(params);

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
