/**
 * Test Runs List Command
 *
 * Lists all test runs for a specific batch test.
 */

import { listTestRuns } from "../../../services/test-api";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../../services/output-formatter";
import type { TestRunListOutput } from "../../../types/tests";

/**
 * Options for the list test runs command
 */
export interface ListTestRunsOptions {
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * List all test runs for a batch test
 *
 * @param batchJobId The batch job ID
 * @param options Command options
 */
export async function listTestRunsCommand(
  batchJobId: string,
  options: ListTestRunsOptions,
): Promise<void> {
  try {
    const testRuns = await listTestRuns(batchJobId);

    const output: TestRunListOutput = {
      batch_job_id: batchJobId,
      test_runs: testRuns || [],
      total_count: (testRuns || []).length,
    };

    if (options.fields) {
      const filtered = filterFields(
        output,
        options.fields.split(",").map((f) => f.trim()),
      );
      outputJson(filtered);
    } else {
      outputJson(output);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
