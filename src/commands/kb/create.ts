/**
 * Knowledge Base Create Command
 *
 * Creates a new knowledge base with optional URL and text sources.
 * Usage: retell kb create --name <name> [--urls <url1,url2,...>] [--texts <file.json>] [--auto-refresh]
 */

import { readFileSync, existsSync } from "fs";
import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  outputError,
  handleSdkError,
} from "../../services/output-formatter";
import type {
  CreateKnowledgeBaseOptions,
  TextEntry,
  KnowledgeBaseMutationOutput,
} from "../../types/kb";

/**
 * Create a new knowledge base
 *
 * @param options Command options
 */
export async function createKnowledgeBaseCommand(
  options: CreateKnowledgeBaseOptions,
): Promise<void> {
  try {
    // Validate name length (max 40 chars per API)
    if (options.name.length > 40) {
      outputError(
        "Knowledge base name must be 40 characters or less",
        "INVALID_NAME",
      );
      return;
    }

    // Build the create request
    const createParams: {
      knowledge_base_name: string;
      enable_auto_refresh?: boolean;
      knowledge_base_urls?: string[];
      knowledge_base_texts?: Array<{ title: string; text: string }>;
    } = {
      knowledge_base_name: options.name,
    };

    // Add auto-refresh if specified
    if (options.autoRefresh) {
      createParams.enable_auto_refresh = true;
    }

    // Parse URLs if provided
    if (options.urls) {
      const urls = options.urls
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      if (urls.length > 0) {
        createParams.knowledge_base_urls = urls;
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
          createParams.knowledge_base_texts = texts;
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

    // Create the knowledge base
    const knowledgeBase = await client.knowledgeBase.create(createParams);

    const output: KnowledgeBaseMutationOutput = {
      message: "Knowledge base created successfully",
      knowledge_base_id: knowledgeBase.knowledge_base_id,
      knowledge_base_name: knowledgeBase.knowledge_base_name,
      operation: "create",
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
