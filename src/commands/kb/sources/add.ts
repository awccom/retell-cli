/**
 * Knowledge Base Add Sources Command
 *
 * Adds sources to an existing knowledge base.
 * Usage: retell kb sources add <knowledge_base_id> [--urls <url1,url2,...>] [--texts <file.json>]
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../../services/output-formatter";
import type {
  AddSourcesOptions,
  TextEntry,
  KnowledgeBaseMutationOutput,
} from "../../../types/kb";

/**
 * Add sources to a knowledge base
 *
 * @param knowledgeBaseId The knowledge base ID
 * @param options Command options
 */
export async function addKnowledgeBaseSourcesCommand(
  knowledgeBaseId: string,
  options: AddSourcesOptions,
): Promise<void> {
  try {
    // Validate at least one source type is provided
    if (!options.urls && !options.texts) {
      outputError(
        "At least one of --urls or --texts must be provided",
        "MISSING_SOURCES",
      );
      return;
    }

    // Build the add sources request
    const addParams: {
      knowledge_base_urls?: string[];
      knowledge_base_texts?: Array<{ title: string; text: string }>;
    } = {};

    // Parse URLs if provided
    if (options.urls) {
      const urls = options.urls
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      if (urls.length > 0) {
        addParams.knowledge_base_urls = urls;
      }
    }

    // Parse texts file if provided
    if (options.texts) {
      if (!existsSync(options.texts)) {
        outputError(`Texts file not found: ${options.texts}`, "FILE_NOT_FOUND");
        return;
      }

      try {
        const content = readFileSync(options.texts, "utf-8");
        const textsData = JSON.parse(content);

        // Validate texts structure
        if (!Array.isArray(textsData)) {
          outputError(
            "Texts file must contain an array of { title, text } objects",
            "INVALID_TEXTS",
          );
          return;
        }

        const texts: TextEntry[] = textsData.map(
          (entry: unknown, index: number) => {
            if (typeof entry !== "object" || entry === null) {
              throw new Error(`Entry at index ${index} must be an object`);
            }
            const e = entry as Record<string, unknown>;
            if (typeof e.title !== "string" || typeof e.text !== "string") {
              throw new Error(
                `Entry at index ${index} must have "title" and "text" string fields`,
              );
            }
            return { title: e.title, text: e.text };
          },
        );

        if (texts.length > 0) {
          addParams.knowledge_base_texts = texts;
        }
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          outputError(
            `Invalid JSON in texts file: ${error.message}`,
            "INVALID_JSON",
          );
        } else if (error instanceof Error) {
          outputError(
            `Error parsing texts file: ${error.message}`,
            "INVALID_TEXTS",
          );
        }
        return;
      }
    }

    const client = getRetellClient();

    // Add sources to the knowledge base
    const knowledgeBase = await client.knowledgeBase.addSources(
      knowledgeBaseId,
      addParams,
    );

    const output: KnowledgeBaseMutationOutput = {
      message: "Sources added successfully",
      knowledge_base_id: knowledgeBase.knowledge_base_id,
      knowledge_base_name: knowledgeBase.knowledge_base_name,
      operation: "add_sources",
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
