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
  limit?: number;
  paginationKey?: string;
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
    const query: { limit?: number; pagination_key?: string } = {};
    if (options.limit !== undefined) {
      if (!Number.isInteger(options.limit) || options.limit <= 0) {
        throwValidation("--limit must be a positive integer");
      }
      query.limit = options.limit;
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    const testRunsPage = await listTestRuns(batchJobId, query);
    const testRuns = testRunsPage.items;

    const output: TestRunListOutput = {
      batch_job_id: batchJobId,
      test_runs: testRuns,
      total_count: testRuns.length,
      ...(testRunsPage.has_more !== undefined && {
        has_more: testRunsPage.has_more,
      }),
      ...(testRunsPage.pagination_key !== undefined && {
        pagination_key: testRunsPage.pagination_key,
      }),
      ...(testRunsPage.total !== undefined && { total: testRunsPage.total }),
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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
