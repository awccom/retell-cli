/**
 * Chats Update Command
 *
 * Updates metadata and data-storage settings on an existing chat.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg, loadStringRecordArg } from "../../services/json-arg";
import type { ChatUpdateParams } from "retell-sdk/resources/chat";

const DATA_STORAGE_SETTINGS = ["everything", "basic_attributes_only"] as const;

export interface UpdateChatOptions {
  metadata?: string;
  customAttributes?: string;
  dynamicVariables?: string;
  dataStorageSetting?: string;
  fields?: string;
}

export async function updateChatCommand(
  chatId: string,
  options: UpdateChatOptions,
): Promise<void> {
  try {
    const params: ChatUpdateParams = {};

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const attrs = loadJsonArg(options.customAttributes, "--custom-attributes");
    if (attrs !== undefined)
      params.custom_attributes = attrs as Record<
        string,
        string | number | boolean
      >;

    const dv = loadStringRecordArg(
      options.dynamicVariables,
      "--dynamic-variables",
    );
    if (dv !== undefined) params.override_dynamic_variables = dv;

    if (options.dataStorageSetting) {
      if (
        !DATA_STORAGE_SETTINGS.includes(options.dataStorageSetting as never)
      ) {
        throwValidation(
          `--data-storage-setting must be one of: ${DATA_STORAGE_SETTINGS.join(", ")}`,
        );
      }
      params.data_storage_setting =
        options.dataStorageSetting as ChatUpdateParams["data_storage_setting"];
    }

    if (Object.keys(params).length === 0) {
      throwValidation(
        "No mutation flags provided. Pass at least one of --metadata, --custom-attributes, --dynamic-variables, --data-storage-setting.",
      );
    }

    const client = getRetellClient();
    const chat = await client.chat.update(chatId, params);

    const output = options.fields
      ? filterFields(
          chat,
          options.fields.split(",").map((f) => f.trim()),
        )
      : chat;

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
