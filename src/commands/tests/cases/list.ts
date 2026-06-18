/**
 * Test Cases List Command
 *
 * Lists all test case definitions for a Retell LLM or Conversation Flow.
 */

import { listTestCaseDefinitions } from "../../../services/test-api";
import {
  outputJson,
  outputError,
  handleSdkError,
  filterFields,
} from "../../../services/output-formatter";
import type {
  ResponseEngine,
  TestCaseDefinitionListOutput,
} from "../../../types/tests";

/**
 * Options for the list test cases command
 */
export interface ListTestCasesOptions {
  /** Type of response engine (retell-llm or conversation-flow) */
  type: "retell-llm" | "conversation-flow";
  /** LLM ID (required when type is retell-llm) */
  llmId?: string;
  /** Flow ID (required when type is conversation-flow) */
  flowId?: string;
  /** Maximum number of test case definitions to return */
  limit?: number;
  /** Pagination key for the next page */
  paginationKey?: string;
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Build the response engine object from options
 */
function buildResponseEngine(
  options: ListTestCasesOptions,
): ResponseEngine | null {
  if (options.type === "retell-llm") {
    if (!options.llmId) {
      outputError(
        "--llm-id is required when type is retell-llm",
        "MISSING_PARAMETER",
      );
      return null;
    }
    return { type: "retell-llm", llm_id: options.llmId };
  } else {
    if (!options.flowId) {
      outputError(
        "--flow-id is required when type is conversation-flow",
        "MISSING_PARAMETER",
      );
      return null;
    }
    return { type: "conversation-flow", conversation_flow_id: options.flowId };
  }
}

/**
 * List all test case definitions for an LLM or flow
 *
 * @param options Command options
 */
export async function listTestCasesCommand(
  options: ListTestCasesOptions,
): Promise<void> {
  try {
    const responseEngine = buildResponseEngine(options);
    if (!responseEngine) return;

    const query: { limit?: number; pagination_key?: string } = {};
    if (options.limit !== undefined) {
      if (!Number.isInteger(options.limit) || options.limit <= 0) {
        throwValidation("--limit must be a positive integer");
      }
      query.limit = options.limit;
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;

    const testCasesPage = await listTestCaseDefinitions(responseEngine, query);
    const testCases = testCasesPage.items;

    const output: TestCaseDefinitionListOutput = {
      response_engine: responseEngine,
      test_case_definitions: testCases,
      total_count: testCases.length,
      ...(testCasesPage.has_more !== undefined && {
        has_more: testCasesPage.has_more,
      }),
      ...(testCasesPage.pagination_key !== undefined && {
        pagination_key: testCasesPage.pagination_key,
      }),
      ...(testCasesPage.total !== undefined && { total: testCasesPage.total }),
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
