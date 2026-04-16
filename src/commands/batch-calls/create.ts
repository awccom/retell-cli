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
import { readJsonFile } from "../../services/json-arg";
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
      from_number: options.fromNumber,
      tasks: tasks as BatchCallCreateBatchCallParams["tasks"],
    };

    if (options.name) params.name = options.name;

    if (options.reservedConcurrency !== undefined) {
      const v = Number(options.reservedConcurrency);
      if (isNaN(v)) throwValidation("--reserved-concurrency must be a number");
      params.reserved_concurrency = v;
    }

    if (options.triggerTimestamp !== undefined) {
      const v = Number(options.triggerTimestamp);
      if (isNaN(v))
        throwValidation(
          "--trigger-timestamp must be a number (ms since epoch)",
        );
      params.trigger_timestamp = v;
    }

    if (options.callTimeWindow) {
      const window = readJsonFile(options.callTimeWindow, "--call-time-window");
      params.call_time_window =
        window as BatchCallCreateBatchCallParams.CallTimeWindow;
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
