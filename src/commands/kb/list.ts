/**
 * Knowledge Base List Command
 *
 * Lists all knowledge bases.
 * Usage: retell kb list [--fields <fields>]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import type { ListKnowledgeBasesOptions } from "../../types/kb";

/**
 * List all knowledge bases
 *
 * @param options Command options
 */
export async function listKnowledgeBasesCommand(
  options: ListKnowledgeBasesOptions,
): Promise<void> {
  try {
    const client = getRetellClient();

    // Call the SDK to list knowledge bases
    const knowledgeBases = await client.knowledgeBase.list();

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          knowledgeBases,
          options.fields.split(",").map((f) => f.trim()),
        )
      : knowledgeBases;

    // Output as JSON
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
