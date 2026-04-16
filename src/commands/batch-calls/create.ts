/**
 * Batch Calls Create Command
 *
 * Schedules a batch of outbound calls against a single from-number.
 * Usage: retell batch-calls create --from-number <n> --tasks <path> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { readJsonFile, readJsonObjectFile } from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
import type { BatchCallCreateBatchCallParams } from "retell-sdk/resources/batch-call";

export interface CreateBatchCallOptions {
  fromNumber: string;
  tasks: string;
  name?: string;
  reservedConcurrency?: string;
  triggerTimestamp?: string;
  callTimeWindow?: string;
  fields?: string;
}

export async function createBatchCallCommand(
  options: CreateBatchCallOptions,
): Promise<void> {
  try {
    const tasks = readJsonFile(options.tasks, "--tasks");
    if (!Array.isArray(tasks)) {
      throwValidation("--tasks file must contain a JSON array of task objects");
    }

    const params: BatchCallCreateBatchCallParams = {
      from_number: requireNonEmpty(options.fromNumber, "--from-number"),
      tasks: tasks as BatchCallCreateBatchCallParams["tasks"],
    };

    if (options.name) params.name = options.name;

    if (options.reservedConcurrency !== undefined) {
      params.reserved_concurrency = parseNumericFlag(
        options.reservedConcurrency,
        "--reserved-concurrency",
      );
    }

    if (options.triggerTimestamp !== undefined) {
      params.trigger_timestamp = parseNumericFlag(
        options.triggerTimestamp,
        "--trigger-timestamp",
      );
    }

    if (options.callTimeWindow) {
      const window = readJsonObjectFile(
        options.callTimeWindow,
        "--call-time-window",
      );
      params.call_time_window =
        window as unknown as BatchCallCreateBatchCallParams.CallTimeWindow;
    }

    const client = getRetellClient();
    const result = await client.batchCall.createBatchCall(params);

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
