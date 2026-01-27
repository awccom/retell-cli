/**
 * Test Cases Get Command
 *
 * Gets a specific test case definition by ID.
 */

import { getTestCaseDefinition } from "../../../services/test-api";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../../services/output-formatter";

/**
 * Options for the get test case command
 */
export interface GetTestCaseOptions {
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Get a specific test case definition
 *
 * @param testCaseDefinitionId The test case definition ID
 * @param options Command options
 */
export async function getTestCaseCommand(
  testCaseDefinitionId: string,
  options: GetTestCaseOptions,
): Promise<void> {
  try {
    const testCase = await getTestCaseDefinition(testCaseDefinitionId);

    if (options.fields) {
      const filtered = filterFields(
        testCase,
        options.fields.split(",").map((f) => f.trim()),
      );
      outputJson(filtered);
    } else {
      outputJson(testCase);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
