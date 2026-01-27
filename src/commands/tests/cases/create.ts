/**
 * Test Cases Create Command
 *
 * Creates a new test case definition from a JSON file.
 */

import { readFileSync, existsSync } from "fs";
import { createTestCaseDefinition } from "../../../services/test-api";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../../services/output-formatter";
import type {
  ResponseEngine,
  TestCaseDefinitionCreateInput,
  TestCaseDefinitionMutationOutput,
} from "../../../types/tests";

/**
 * Options for the create test case command
 */
export interface CreateTestCaseOptions {
  /** Path to JSON file containing test case definition */
  file: string;
  /** LLM ID (mutually exclusive with flowId) */
  llmId?: string;
  /** Flow ID (mutually exclusive with llmId) */
  flowId?: string;
  /** Version of the LLM or flow (optional) */
  version?: number;
}

/**
 * Build the response engine object from options
 */
function buildResponseEngine(
  options: CreateTestCaseOptions,
): ResponseEngine | null {
  if (options.llmId && options.flowId) {
    outputError(
      "Cannot specify both --llm-id and --flow-id",
      "INVALID_PARAMETERS",
    );
    return null;
  }

  if (!options.llmId && !options.flowId) {
    outputError(
      "Either --llm-id or --flow-id is required",
      "MISSING_PARAMETER",
    );
    return null;
  }

  if (options.llmId) {
    const engine: ResponseEngine = {
      type: "retell-llm",
      llm_id: options.llmId,
    };
    if (options.version !== undefined) {
      engine.version = options.version;
    }
    return engine;
  } else {
    const engine: ResponseEngine = {
      type: "conversation-flow",
      conversation_flow_id: options.flowId!,
    };
    if (options.version !== undefined) {
      engine.version = options.version;
    }
    return engine;
  }
}

/**
 * Create a new test case definition
 *
 * @param options Command options
 */
export async function createTestCaseCommand(
  options: CreateTestCaseOptions,
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

    // Parse test case definition
    let input: TestCaseDefinitionCreateInput;
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

    // Validate required fields
    if (!input.name) {
      outputError('Test case must have a "name" field', "INVALID_INPUT");
      return;
    }

    const responseEngine = buildResponseEngine(options);
    if (!responseEngine) return;

    const testCase = await createTestCaseDefinition({
      name: input.name,
      user_prompt: input.user_prompt,
      scenario: input.scenario,
      metrics: input.metrics,
      response_engine: responseEngine,
      dynamic_variables: input.dynamic_variables,
      tool_mocks: input.tool_mocks,
      llm_model: input.llm_model,
    });

    const output: TestCaseDefinitionMutationOutput = {
      message: "Test case definition created successfully",
      test_case_definition_id: testCase.test_case_definition_id,
      name: testCase.name,
      operation: "create",
      response_engine: responseEngine,
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
