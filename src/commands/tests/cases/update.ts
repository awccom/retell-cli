/**
 * Test Cases Update Command
 *
 * Updates an existing test case definition from a JSON file.
 */

import { readFileSync, existsSync } from "fs";
import { updateTestCaseDefinition } from "../../../services/test-api";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../../services/output-formatter";
import type {
  TestCaseDefinitionUpdateInput,
  TestCaseDefinitionMutationOutput,
} from "../../../types/tests";

/**
 * Options for the update test case command
 */
export interface UpdateTestCaseOptions {
  /** Path to JSON file containing test case updates */
  file: string;
}

/**
 * Update an existing test case definition
 *
 * @param testCaseDefinitionId The test case definition ID
 * @param options Command options
 */
export async function updateTestCaseCommand(
  testCaseDefinitionId: string,
  options: UpdateTestCaseOptions,
): Promise<void> {
  try {
    // Validate file exists
    if (!existsSync(options.file)) {
      outputError(
        `Test case file not found: ${options.file}`,
        "FILE_NOT_FOUND",
      );
      return;
    }

    // Parse test case updates
    let input: TestCaseDefinitionUpdateInput;
    try {
      const content = readFileSync(options.file, "utf-8");
      input = JSON.parse(content);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        outputError(
          `Invalid JSON in test case file: ${error.message}`,
          "INVALID_JSON",
        );
      } else {
        outputError(
          `Error reading test case file: ${error.message}`,
          "FILE_READ_ERROR",
        );
      }
      return;
    }

    const testCase = await updateTestCaseDefinition(testCaseDefinitionId, {
      name: input.name,
      user_prompt: input.user_prompt,
      scenario: input.scenario,
      metrics: input.metrics,
      dynamic_variables: input.dynamic_variables,
      tool_mocks: input.tool_mocks,
      llm_model: input.llm_model,
    });

    const output: TestCaseDefinitionMutationOutput = {
      message: "Test case definition updated successfully",
      test_case_definition_id: testCase.test_case_definition_id,
      name: testCase.name,
      operation: "update",
      response_engine: testCase.response_engine,
    };

    outputJson(output);
  } catch (error) {
    if (error instanceof SyntaxError) {
      outputError(`Invalid JSON: ${error.message}`, "INVALID_JSON");
      return;
    }
    handleSdkError(error);
  }
}
