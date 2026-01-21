/**
 * Batch Tests List Command
 *
 * Lists all batch tests for a Retell LLM or Conversation Flow.
 */

import { listBatchTests } from '../../../services/test-api';
import { outputJson, outputError, handleSdkError, filterFields } from '../../../services/output-formatter';
import type { ResponseEngine, BatchTestListOutput } from '../../../types/tests';

/**
 * Options for the list batch tests command
 */
export interface ListBatchTestsOptions {
  /** Type of response engine (retell-llm or conversation-flow) */
  type: 'retell-llm' | 'conversation-flow';
  /** LLM ID (required when type is retell-llm) */
  llmId?: string;
  /** Flow ID (required when type is conversation-flow) */
  flowId?: string;
  /** Comma-separated list of fields to return */
  fields?: string;
}

/**
 * Build the response engine object from options
 */
function buildResponseEngine(options: ListBatchTestsOptions): ResponseEngine | null {
  if (options.type === 'retell-llm') {
    if (!options.llmId) {
      outputError('--llm-id is required when type is retell-llm', 'MISSING_PARAMETER');
      return null;
    }
    return { type: 'retell-llm', llm_id: options.llmId };
  } else {
    if (!options.flowId) {
      outputError('--flow-id is required when type is conversation-flow', 'MISSING_PARAMETER');
      return null;
    }
    return { type: 'conversation-flow', conversation_flow_id: options.flowId };
  }
}

/**
 * List all batch tests for an LLM or flow
 *
 * @param options Command options
 */
export async function listBatchTestsCommand(options: ListBatchTestsOptions): Promise<void> {
  try {
    const responseEngine = buildResponseEngine(options);
    if (!responseEngine) return;

    const batchTests = await listBatchTests(responseEngine);

    const output: BatchTestListOutput = {
      response_engine: responseEngine,
      batch_tests: batchTests || [],
      total_count: (batchTests || []).length,
    };

    if (options.fields) {
      const filtered = filterFields(output, options.fields.split(',').map((f) => f.trim()));
      outputJson(filtered);
    } else {
      outputJson(output);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
