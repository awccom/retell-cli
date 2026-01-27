/**
 * Test API Service
 *
 * Direct API calls for test-related endpoints that aren't fully
 * supported in the SDK yet.
 */

import { getConfig } from "./config";
import type {
  ResponseEngine,
  TestCaseDefinition,
  BatchTest,
  TestRun,
  ToolMock,
  LlmModel,
} from "../types/tests";

const BASE_URL = "https://api.retellai.com";

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const config = getConfig();

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      if (errorBody) {
        errorMessage = errorBody;
      }
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like DELETE)
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// ===== TEST CASE DEFINITIONS =====

/**
 * List test case definitions
 */
export async function listTestCaseDefinitions(
  responseEngine: ResponseEngine,
): Promise<TestCaseDefinition[]> {
  const params = new URLSearchParams();

  if (responseEngine.type === "retell-llm") {
    params.set("type", "retell-llm");
    params.set("llm_id", responseEngine.llm_id);
  } else {
    params.set("type", "conversation-flow");
    params.set("conversation_flow_id", responseEngine.conversation_flow_id);
  }

  return apiRequest<TestCaseDefinition[]>(
    "GET",
    `/list-test-case-definitions?${params.toString()}`,
  );
}

/**
 * Get a test case definition
 */
export async function getTestCaseDefinition(
  testCaseDefinitionId: string,
): Promise<TestCaseDefinition> {
  return apiRequest<TestCaseDefinition>(
    "GET",
    `/get-test-case-definition/${testCaseDefinitionId}`,
  );
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
  return apiRequest<TestCaseDefinition>(
    "POST",
    "/create-test-case-definition",
    params,
  );
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
  return apiRequest<TestCaseDefinition>(
    "PUT",
    `/update-test-case-definition/${testCaseDefinitionId}`,
    params,
  );
}

/**
 * Delete a test case definition
 */
export async function deleteTestCaseDefinition(
  testCaseDefinitionId: string,
): Promise<void> {
  await apiRequest<void>(
    "DELETE",
    `/delete-test-case-definition/${testCaseDefinitionId}`,
  );
}

// ===== BATCH TESTS =====

/**
 * List batch tests
 */
export async function listBatchTests(
  responseEngine: ResponseEngine,
): Promise<BatchTest[]> {
  const params = new URLSearchParams();

  if (responseEngine.type === "retell-llm") {
    params.set("type", "retell-llm");
    params.set("llm_id", responseEngine.llm_id);
  } else {
    params.set("type", "conversation-flow");
    params.set("conversation_flow_id", responseEngine.conversation_flow_id);
  }

  return apiRequest<BatchTest[]>(
    "GET",
    `/list-batch-tests?${params.toString()}`,
  );
}

/**
 * Get a batch test
 */
export async function getBatchTest(batchJobId: string): Promise<BatchTest> {
  return apiRequest<BatchTest>("GET", `/get-batch-test/${batchJobId}`);
}

/**
 * Create a batch test
 */
export async function createBatchTest(params: {
  response_engine: ResponseEngine;
  test_case_definition_ids: string[];
}): Promise<BatchTest> {
  return apiRequest<BatchTest>("POST", "/create-batch-test", params);
}

// ===== TEST RUNS =====

/**
 * List test runs for a batch test
 */
export async function listTestRuns(batchJobId: string): Promise<TestRun[]> {
  return apiRequest<TestRun[]>("GET", `/list-test-runs/${batchJobId}`);
}

/**
 * Get a test run
 */
export async function getTestRun(testRunId: string): Promise<TestRun> {
  return apiRequest<TestRun>("GET", `/get-test-run/${testRunId}`);
}
