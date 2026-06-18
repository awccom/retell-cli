/**
 * Batch Tests List Command
 *
 * Lists all batch tests for a Retell LLM or Conversation Flow.
 */

import { listBatchTests } from "../../../services/test-api";
import {
  outputJson,
  outputError,
  handleSdkError,
  filterFields,
} from "../../../services/output-formatter";
import type { ResponseEngine, BatchTestListOutput } from "../../../types/tests";

/**
 * Options for the list batch tests command
 */
export interface ListBatchTestsOptions {
  /** Type of response engine (retell-llm or conversation-flow) */
  type: "retell-llm" | "conversation-flow";
  /** LLM ID (required when type is retell-llm) */
  llmId?: string;
  /** Flow ID (required when type is conversation-flow) */
  flowId?: string;
  /** Maximum number of batch tests to return */
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
  options: ListBatchTestsOptions,
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
 * List all batch tests for an LLM or flow
 *
 * @param options Command options
 */
export async function listBatchTestsCommand(
  options: ListBatchTestsOptions,
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

    const batchTestsPage = await listBatchTests(responseEngine, query);
    const batchTests = batchTestsPage.items;

    const output: BatchTestListOutput = {
      response_engine: responseEngine,
      batch_tests: batchTests,
      total_count: batchTests.length,
      ...(batchTestsPage.has_more !== undefined && {
        has_more: batchTestsPage.has_more,
      }),
      ...(batchTestsPage.pagination_key !== undefined && {
        pagination_key: batchTestsPage.pagination_key,
      }),
      ...(batchTestsPage.total !== undefined && {
        total: batchTestsPage.total,
      }),
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
