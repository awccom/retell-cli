/**
 * Knowledge Base Get Command
 *
 * Gets a specific knowledge base by ID.
 * Usage: retell kb get <knowledge_base_id> [--fields <fields>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { GetKnowledgeBaseOptions } from "../../types/kb";

/**
 * Get a specific knowledge base
 *
 * @param knowledgeBaseId The knowledge base ID
 * @param options Command options
 */
export async function getKnowledgeBaseCommand(
  knowledgeBaseId: string,
  options: GetKnowledgeBaseOptions,
): Promise<void> {
  try {
    const client = getRetellClient();

    // Call the SDK to get the knowledge base
    const knowledgeBase = await client.knowledgeBase.retrieve(knowledgeBaseId);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          knowledgeBase,
          options.fields.split(",").map((f) => f.trim()),
        )
      : knowledgeBase;

    // Output as JSON
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
