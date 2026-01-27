/**
 * Batch Tests Create Command
 *
 * Creates a new batch test with specified test case definitions.
 */

import { createBatchTest } from "../../../services/test-api";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../../services/output-formatter";
import type {
  ResponseEngine,
  BatchTestCreateOutput,
} from "../../../types/tests";

/**
 * Options for the create batch test command
 */
export interface CreateBatchTestOptions {
  /** LLM ID (mutually exclusive with flowId) */
  llmId?: string;
  /** Flow ID (mutually exclusive with llmId) */
  flowId?: string;
  /** Comma-separated list of test case definition IDs */
  cases: string;
  /** Version of the LLM or flow (optional) */
  version?: number;
}

/**
 * Build the response engine object from options
 */
function buildResponseEngine(
  options: CreateBatchTestOptions,
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
 * Create a new batch test
 *
 * @param options Command options
 */
export async function createBatchTestCommand(
  options: CreateBatchTestOptions,
): Promise<void> {
  try {
    const responseEngine = buildResponseEngine(options);
    if (!responseEngine) return;

    // Parse test case definition IDs
    const testCaseDefinitionIds = options.cases
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (testCaseDefinitionIds.length === 0) {
      outputError(
        "At least one test case definition ID is required",
        "MISSING_PARAMETER",
      );
      return;
    }

    const batchTest = await createBatchTest({
      response_engine: responseEngine,
      test_case_definition_ids: testCaseDefinitionIds,
    });

    const output: BatchTestCreateOutput = {
      message: "Batch test created successfully",
      test_case_batch_job_id: batchTest.test_case_batch_job_id,
      status: batchTest.status,
      response_engine: responseEngine,
      test_case_definition_ids: testCaseDefinitionIds,
    };

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
