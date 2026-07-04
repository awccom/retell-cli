/**
 * Test API Service
 *
 * SDK-backed wrappers for test-related endpoints. The SDK currently marks
 * list helpers as deprecated upstream; these wrappers preserve the CLI's
 * existing output shapes while keeping authentication and errors centralized.
 */

import { getRetellClient } from "./retell-client";
import { getPaginatedResult, type PaginatedResult } from "./paginated-response";
import type {
  TestListBatchTestsParams,
  TestListTestCaseDefinitionsParams,
  TestListTestRunsParams,
} from "retell-sdk/resources/tests";
import type {
  ResponseEngine,
  TestCaseDefinition,
  BatchTest,
  TestRun,
  ToolMock,
  LlmModel,
} from "../types/tests";

// ===== TEST CASE DEFINITIONS =====

/**
 * List test case definitions
 */
export async function listTestCaseDefinitions(
  responseEngine: ResponseEngine,
  query?: Pick<TestListTestCaseDefinitionsParams, "limit" | "pagination_key">,
): Promise<PaginatedResult<TestCaseDefinition>> {
  const client = getRetellClient();
  const response = await client.tests.listTestCaseDefinitions({
    ...(responseEngine as TestListTestCaseDefinitionsParams),
    ...query,
  });
  return getPaginatedResult<TestCaseDefinition>(response as any);
}

/**
 * Get a test case definition
 */
export async function getTestCaseDefinition(
  testCaseDefinitionId: string,
): Promise<TestCaseDefinition> {
  const client = getRetellClient();
  return (await client.tests.getTestCaseDefinition(
    testCaseDefinitionId,
  )) as unknown as TestCaseDefinition;
}

/**
 * Create a test case definition
 */
export async function createTestCaseDefinition(params: {
  name: string;
  response_engine: ResponseEngine;
  user_prompt?: string;
  scenario?: string;
  metrics?: string[];
  dynamic_variables?: Record<string, string>;
  tool_mocks?: ToolMock[];
  llm_model?: LlmModel;
}): Promise<TestCaseDefinition> {
  const client = getRetellClient();
  return (await client.tests.createTestCaseDefinition(
    params as any,
  )) as unknown as TestCaseDefinition;
}

/**
 * Update a test case definition
 */
export async function updateTestCaseDefinition(
  testCaseDefinitionId: string,
  params: {
    name?: string;
    user_prompt?: string;
    scenario?: string;
    metrics?: string[];
    dynamic_variables?: Record<string, string>;
    tool_mocks?: ToolMock[];
    llm_model?: LlmModel;
  },
): Promise<TestCaseDefinition> {
  const client = getRetellClient();
  return (await client.tests.updateTestCaseDefinition(
    testCaseDefinitionId,
    params as any,
  )) as unknown as TestCaseDefinition;
}

/**
 * Delete a test case definition
 */
export async function deleteTestCaseDefinition(
  testCaseDefinitionId: string,
): Promise<void> {
  const client = getRetellClient();
  await client.tests.deleteTestCaseDefinition(testCaseDefinitionId);
}

// ===== BATCH TESTS =====

/**
 * List batch tests
 */
export async function listBatchTests(
  responseEngine: ResponseEngine,
  query?: Pick<TestListBatchTestsParams, "limit" | "pagination_key">,
): Promise<PaginatedResult<BatchTest>> {
  const client = getRetellClient();
  const response = await client.tests.listBatchTests({
    ...(responseEngine as TestListBatchTestsParams),
    ...query,
  });
  return getPaginatedResult<BatchTest>(response as any);
}

/**
 * Get a batch test
 */
export async function getBatchTest(batchJobId: string): Promise<BatchTest> {
  const client = getRetellClient();
  return (await client.tests.getBatchTest(batchJobId)) as unknown as BatchTest;
}

/**
 * Create a batch test
 */
export async function createBatchTest(params: {
  response_engine: ResponseEngine;
  test_case_definition_ids: string[];
}): Promise<BatchTest> {
  const client = getRetellClient();
  return (await client.tests.createBatchTest(
    params as any,
  )) as unknown as BatchTest;
}

// ===== TEST RUNS =====

/**
 * List test runs for a batch test
 */
export async function listTestRuns(
  batchJobId: string,
  query?: Pick<TestListTestRunsParams, "limit" | "pagination_key">,
): Promise<PaginatedResult<TestRun>> {
  const client = getRetellClient();
  const response = await client.tests.listTestRuns(batchJobId, query);
  return getPaginatedResult<TestRun>(response as any);
}

/**
 * Get a test run
 */
export async function getTestRun(testRunId: string): Promise<TestRun> {
  const client = getRetellClient();
  return (await client.tests.getTestRun(testRunId)) as unknown as TestRun;
}
