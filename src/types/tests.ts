/**
 * Test Type Definitions for Retell CLI
 *
 * Type definitions for managing test case definitions, batch tests, and test runs.
 */

// ===== RESPONSE ENGINE TYPES =====

/**
 * Response engine for Retell LLM
 */
export interface RetellLlmResponseEngine {
  type: "retell-llm";
  llm_id: string;
  version?: number;
}

/**
 * Response engine for Conversation Flow
 */
export interface ConversationFlowResponseEngine {
  type: "conversation-flow";
  conversation_flow_id: string;
  version?: number;
}

/**
 * Union type for response engines
 */
export type ResponseEngine =
  | RetellLlmResponseEngine
  | ConversationFlowResponseEngine;

// ===== TEST CASE DEFINITION TYPES =====

/**
 * Available test metrics
 */
export type TestMetric =
  | "response_quality"
  | "task_completion"
  | "latency"
  | "sentiment"
  | "custom";

/**
 * Tool mock input match rule - matches any input
 */
export interface ToolMockInputMatchRuleAny {
  type: "any";
}

/**
 * Tool mock input match rule - partial match on args
 */
export interface ToolMockInputMatchRulePartial {
  type: "partial_match";
  args: Record<string, unknown>;
}

/**
 * Union type for tool mock input match rules
 */
export type ToolMockInputMatchRule =
  | ToolMockInputMatchRuleAny
  | ToolMockInputMatchRulePartial;

/**
 * Tool mock definition
 */
export interface ToolMock {
  tool_name: string;
  input_match_rule: ToolMockInputMatchRule;
  output: string; // JSON string
  result?: boolean | null;
}

/**
 * Available LLM models for test cases
 */
export type LlmModel =
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-5"
  | "gpt-5.1"
  | "gpt-5.2"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "claude-4.5-sonnet"
  | "claude-4.5-haiku"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-3.0-flash";

/**
 * Test case definition from API
 */
export interface TestCaseDefinition {
  test_case_definition_id: string;
  name: string;
  user_prompt?: string;
  scenario?: string;
  metrics?: TestMetric[];
  response_engine: ResponseEngine;
  dynamic_variables?: Record<string, string>;
  tool_mocks?: ToolMock[];
  llm_model?: LlmModel;
  created_at?: string;
  updated_at?: string;
}

/**
 * Input for creating a test case definition
 */
export interface TestCaseDefinitionCreateInput {
  name: string;
  user_prompt?: string;
  scenario?: string;
  metrics?: TestMetric[];
  dynamic_variables?: Record<string, string>;
  tool_mocks?: ToolMock[];
  llm_model?: LlmModel;
}

/**
 * Input for updating a test case definition
 */
export interface TestCaseDefinitionUpdateInput {
  name?: string;
  user_prompt?: string;
  scenario?: string;
  metrics?: TestMetric[];
  dynamic_variables?: Record<string, string>;
  tool_mocks?: ToolMock[];
  llm_model?: LlmModel;
}

/**
 * Output format for test case definition list command
 */
export interface TestCaseDefinitionListOutput {
  response_engine: ResponseEngine;
  test_case_definitions: TestCaseDefinition[];
  total_count: number;
  has_more?: boolean;
  pagination_key?: string;
  total?: number;
}

/**
 * Output format for test case definition get command
 */
export interface TestCaseDefinitionGetOutput extends TestCaseDefinition {}

/**
 * Output format for test case definition mutation commands (create/update/delete)
 */
export interface TestCaseDefinitionMutationOutput {
  message: string;
  test_case_definition_id: string;
  name: string;
  operation: "create" | "update" | "delete";
  response_engine: ResponseEngine;
}

// ===== BATCH TEST TYPES =====

/**
 * Batch test status
 */
export type BatchTestStatus = "in_progress" | "complete";

/**
 * Batch test from API
 */
export interface BatchTest {
  test_case_batch_job_id: string;
  status: BatchTestStatus;
  response_engine: ResponseEngine;
  pass_count: number;
  fail_count: number;
  error_count: number;
  total_count: number;
  creation_timestamp: number;
  user_modified_timestamp: number;
}

/**
 * Output format for batch test list command
 */
export interface BatchTestListOutput {
  response_engine: ResponseEngine;
  batch_tests: BatchTest[];
  total_count: number;
  has_more?: boolean;
  pagination_key?: string;
  total?: number;
}

/**
 * Output format for batch test get command
 */
export interface BatchTestGetOutput extends BatchTest {}

/**
 * Output format for batch test create command
 */
export interface BatchTestCreateOutput {
  message: string;
  test_case_batch_job_id: string;
  status: BatchTestStatus;
  response_engine: ResponseEngine;
  test_case_definition_ids: string[];
}

// ===== TEST RUN TYPES =====

/**
 * Test run status
 */
export type TestRunStatus = "in_progress" | "pass" | "fail" | "error";

/**
 * Test run metric result
 */
export interface TestRunMetricResult {
  metric: TestMetric;
  score?: number;
  passed?: boolean;
  details?: string;
}

/**
 * Test run from API
 */
export interface TestRun {
  test_run_id: string;
  batch_job_id: string;
  test_case_definition_id: string;
  status: TestRunStatus;
  response_engine: ResponseEngine;
  created_at?: string;
  completed_at?: string;
  metric_results?: TestRunMetricResult[];
  call_id?: string;
  error_message?: string;
}

/**
 * Output format for test run list command
 */
export interface TestRunListOutput {
  batch_job_id: string;
  test_runs: TestRun[];
  total_count: number;
  has_more?: boolean;
  pagination_key?: string;
  total?: number;
}

/**
 * Output format for test run get command
 */
export interface TestRunGetOutput extends TestRun {}
