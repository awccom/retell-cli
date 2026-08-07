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
import { loadUploadFiles } from "../../services/upload-files";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";
import type { KnowledgeBaseCreateParams } from "retell-sdk/resources/knowledge-base";

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
    const createParams: KnowledgeBaseCreateParams = {
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

    const files = loadUploadFiles(options.files);
    if (files) createParams.knowledge_base_files = files;

    const minChunkSize =
      options.minChunkSize !== undefined
        ? parsePositiveIntegerFlag(options.minChunkSize, "--min-chunk-size")
        : undefined;
    const maxChunkSize =
      options.maxChunkSize !== undefined
        ? parsePositiveIntegerFlag(options.maxChunkSize, "--max-chunk-size")
        : undefined;
    validateChunkSizes(minChunkSize, maxChunkSize);
    if (minChunkSize !== undefined) createParams.min_chunk_size = minChunkSize;
    if (maxChunkSize !== undefined) createParams.max_chunk_size = maxChunkSize;

    const client = getRetellClient();
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

function validateChunkSizes(
  minChunkSize: number | undefined,
  maxChunkSize: number | undefined,
): void {
  if (
    minChunkSize !== undefined &&
    (minChunkSize < 200 || minChunkSize > 2000)
  ) {
    throwValidation("--min-chunk-size must be between 200 and 2000");
  }
  if (
    maxChunkSize !== undefined &&
    (maxChunkSize < 600 || maxChunkSize > 6000)
  ) {
    throwValidation("--max-chunk-size must be between 600 and 6000");
  }
  if ((minChunkSize ?? 400) >= (maxChunkSize ?? 2000)) {
    throwValidation("--min-chunk-size must be less than --max-chunk-size");
  }
}

function throwValidation(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
