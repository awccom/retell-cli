/**
 * Knowledge Base Delete Source Command
 *
 * Removes a source from a knowledge base.
 * Usage: retell kb sources delete <knowledge_base_id> <source_id>
 */

import { getRetellClient } from "../../../services/retell-client";
import { outputJson, handleSdkError } from "../../../services/output-formatter";
import type { KnowledgeBaseMutationOutput } from "../../../types/kb";

/**
 * Delete a source from a knowledge base
 *
 * @param knowledgeBaseId The knowledge base ID
 * @param sourceId The source ID to delete
 */
export async function deleteKnowledgeBaseSourceCommand(
  knowledgeBaseId: string,
  sourceId: string,
): Promise<void> {
  try {
    const client = getRetellClient();

    // Delete the source from the knowledge base
    const knowledgeBase = await client.knowledgeBase.deleteSource(sourceId, {
      knowledge_base_id: knowledgeBaseId,
    });

    const output: KnowledgeBaseMutationOutput = {
      message: "Source deleted successfully",
      knowledge_base_id: knowledgeBase.knowledge_base_id,
      knowledge_base_name: knowledgeBase.knowledge_base_name,
      operation: "delete_source",
    };

    outputJson({
      ...output,
      status: knowledgeBase.status,
      sources_count: knowledgeBase.knowledge_base_sources?.length ?? 0,
    });
  } catch (error) {
    handleSdkError(error);
  }
}
