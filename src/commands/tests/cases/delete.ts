/**
 * Test Cases Delete Command
 *
 * Deletes a test case definition by ID.
 */

import { deleteTestCaseDefinition } from "../../../services/test-api";
import { outputJson, handleSdkError } from "../../../services/output-formatter";

/**
 * Delete a test case definition
 *
 * @param testCaseDefinitionId The test case definition ID
 */
export async function deleteTestCaseCommand(
  testCaseDefinitionId: string,
): Promise<void> {
  try {
    await deleteTestCaseDefinition(testCaseDefinitionId);

    outputJson({
      message: "Test case definition deleted successfully",
      test_case_definition_id: testCaseDefinitionId,
      operation: "delete",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
