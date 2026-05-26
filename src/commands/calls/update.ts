/**
 * Calls Update Command
 *
 * Updates metadata and data-storage settings on an existing call.
 * Usage: retell calls update <call_id> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg, loadStringRecordArg } from "../../services/json-arg";
import type { CallUpdateParams } from "retell-sdk/resources/call";

const DATA_STORAGE_SETTINGS = [
  "everything",
  "everything_except_pii",
  "basic_attributes_only",
] as const;

export interface UpdateCallOptions {
  metadata?: string;
  customAttributes?: string;
  dynamicVariables?: string;
  dataStorageSetting?: string;
  fields?: string;
}

export async function updateCallCommand(
  callId: string,
  options: UpdateCallOptions,
): Promise<void> {
  try {
    const params: CallUpdateParams = {};

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
        options.dataStorageSetting as CallUpdateParams["data_storage_setting"];
    }

    if (Object.keys(params).length === 0) {
      throwValidation(
        "No mutation flags provided. Pass at least one of --metadata, --custom-attributes, --dynamic-variables, --data-storage-setting.",
      );
    }

    const client = getRetellClient();
    const result = await client.call.update(callId, params);

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
