/**
 * Batch Tests Get Command
 *
 * Gets a specific batch test by ID.
 */

import { getBatchTest } from "../../../services/test-api";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../../services/output-formatter";

/**
 * Options for the get batch test command
 */
export interface GetBatchTestOptions {
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Get a specific batch test
 *
 * @param batchJobId The batch job ID
 * @param options Command options
 */
export async function getBatchTestCommand(
  batchJobId: string,
  options: GetBatchTestOptions,
): Promise<void> {
  try {
    const batchTest = await getBatchTest(batchJobId);

    if (options.fields) {
      const filtered = filterFields(
        batchTest,
        options.fields.split(",").map((f) => f.trim()),
      );
      outputJson(filtered);
    } else {
      outputJson(batchTest);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
