/**
 * Test Runs Get Command
 *
 * Gets a specific test run by ID.
 */

import { getTestRun } from "../../../services/test-api";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../../services/output-formatter";

/**
 * Options for the get test run command
 */
export interface GetTestRunOptions {
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Get a specific test run
 *
 * @param testRunId The test run ID
 * @param options Command options
 */
export async function getTestRunCommand(
  testRunId: string,
  options: GetTestRunOptions,
): Promise<void> {
  try {
    const testRun = await getTestRun(testRunId);

    if (options.fields) {
      const filtered = filterFields(
        testRun,
        options.fields.split(",").map((f) => f.trim()),
      );
      outputJson(filtered);
    } else {
      outputJson(testRun);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
