/**
 * Knowledge Base Type Definitions for Retell CLI
 *
 * Type definitions for managing RAG knowledge bases with documents, text, and URLs.
 */

// ===== KNOWLEDGE BASE SOURCE TYPES =====

/**
 * Document source in a knowledge base
 */
export interface KnowledgeBaseDocumentSource {
  type: "document";
  source_id: string;
  filename: string;
  file_url: string;
}

/**
 * Text source in a knowledge base
 */
export interface KnowledgeBaseTextSource {
  type: "text";
  source_id: string;
  title: string;
  content_url: string;
}

/**
 * URL source in a knowledge base
 */
export interface KnowledgeBaseUrlSource {
  type: "url";
  source_id: string;
  url: string;
}

/**
 * Union of all knowledge base source types
 */
export type KnowledgeBaseSource =
  | KnowledgeBaseDocumentSource
  | KnowledgeBaseTextSource
  | KnowledgeBaseUrlSource;

// ===== KNOWLEDGE BASE TYPES =====

/**
 * Knowledge base status
 */
export type KnowledgeBaseStatus = "in_progress" | "complete" | "error";

/**
 * Knowledge base object from the API
 */
export interface KnowledgeBase {
  knowledge_base_id: string;
  knowledge_base_name: string;
  status: KnowledgeBaseStatus;
  enable_auto_refresh?: boolean;
  knowledge_base_sources?: KnowledgeBaseSource[];
  last_refreshed_timestamp?: number;
}

// ===== COMMAND INPUT TYPES =====

/**
 * Text entry for creating knowledge base sources
 */
export interface TextEntry {
  title: string;
  text: string;
}

/**
 * Options for listing knowledge bases
 */
export interface ListKnowledgeBasesOptions {
  fields?: string;
}

/**
 * Options for getting a knowledge base
 */
export interface GetKnowledgeBaseOptions {
  fields?: string;
}

/**
 * Options for creating a knowledge base
 */
export interface CreateKnowledgeBaseOptions {
  name: string;
  urls?: string;
  texts?: string;
  autoRefresh?: boolean;
}

/**
 * Options for adding sources to a knowledge base
 */
export interface AddSourcesOptions {
  urls?: string;
  texts?: string;
}

// ===== COMMAND OUTPUT TYPES =====

/**
 * Output for knowledge base list command
 */
export interface KnowledgeBaseListOutput {
  knowledge_bases: KnowledgeBase[];
  count: number;
}

/**
 * Output for knowledge base mutation commands
 */
export interface KnowledgeBaseMutationOutput {
  message: string;
  knowledge_base_id: string;
  knowledge_base_name?: string;
  operation: "create" | "delete" | "add_sources" | "delete_source";
}
