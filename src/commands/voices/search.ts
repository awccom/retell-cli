/**
 * Voices Search Command
 *
 * Searches community voices from a provider.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { requireNonEmpty } from "../../services/flag-guards";
import type { VoiceSearchParams } from "retell-sdk/resources/voice";

const VALID_PROVIDERS = [
  "elevenlabs",
  "cartesia",
  "minimax",
  "fish_audio",
] as const;

export interface SearchVoicesOptions {
  searchQuery: string;
  voiceProvider?: string;
  fields?: string;
}

export async function searchVoicesCommand(
  options: SearchVoicesOptions,
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

    const params: VoiceSearchParams = {
      search_query: requireNonEmpty(options.searchQuery, "--search-query"),
    };
    if (options.voiceProvider) {
      params.voice_provider =
        options.voiceProvider as VoiceSearchParams["voice_provider"];
    }

    const client = getRetellClient();
    const result = await client.voice.search(params);

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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
