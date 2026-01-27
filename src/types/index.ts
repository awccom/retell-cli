/**
 * TypeScript Type Definitions for Retell CLI v1.0.1
 *
 * Shared types for new features:
 * - Field filtering
 * - Prompt diffing
 * - Hotspot detection
 * - Search functionality
 */

// ===== DIFF FUNCTIONALITY TYPES =====

/**
 * Details about a specific change detected in a diff
 */
export interface ChangeDetail {
  /** Previous value (null if added) */
  old: string | number | boolean | object | null;
  /** New value (null if removed) */
  new: string | number | boolean | object | null;
  /** Type of change */
  change_type: "added" | "removed" | "modified";
}

/**
 * Result of comparing local vs remote prompts
 */
export interface DiffResult {
  /** Unique agent identifier */
  agent_id: string;
  /** Type of agent (determines prompt structure) */
  agent_type: "retell-llm" | "conversation-flow";
  /** Whether any changes were detected */
  has_changes: boolean;
  /** Map of field paths to their changes */
  changes: Record<string, ChangeDetail>;
}

// ===== HOTSPOT DETECTION TYPES =====

/**
 * A problematic moment detected in a call transcript
 */
export interface HotspotIssue {
  /** Index of the conversation turn where issue occurred */
  turn_index: number;
  /** Timestamp when the issue occurred */
  timestamp: string;
  /** Category of issue detected */
  issue_type: "latency_spike" | "interruption" | "sentiment" | "long_silence";
  /** What the user said (if available) */
  user_utterance?: string;
  /** How the agent responded (if available) */
  agent_utterance?: string;
  /** Relevant performance metrics for this issue */
  metrics?: Record<string, number>;
  /** Suggested prompt modification to address this issue */
  suggested_prompt_fix?: string;
}

/**
 * Collection of hotspots found in a call
 */
export interface HotspotsResult {
  /** Unique call identifier */
  call_id: string;
  /** List of detected hotspots */
  hotspots: HotspotIssue[];
}

// ===== SEARCH FUNCTIONALITY TYPES =====

/**
 * Filters for searching call transcripts
 */
export interface SearchOptions {
  /** Filter by call status (e.g., 'registered', 'ongoing', 'ended', 'error') */
  status?: string;
  /** Filter by specific agent ID */
  agent_id?: string;
  /** Start date/time for search range (ISO 8601 format) */
  since?: string;
  /** End date/time for search range (ISO 8601 format) */
  until?: string;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Response from search operation
 */
export interface SearchResult {
  /** Array of matching call objects */
  results: any[];
  /** Total number of matches found */
  total_count: number;
  /** Filters that were applied to this search */
  filters_applied: SearchOptions;
}

// ===== FIELD FILTERING TYPES =====

/**
 * Options for field filtering operations
 */
export interface FieldFilterOptions {
  /** Array of field paths to include (supports dot notation) */
  fields: string[];
  /** Whether to throw on invalid field paths (default: false, warns instead) */
  strict?: boolean;
}

/**
 * Result of a field filtering operation
 */
export interface FilteredResult {
  /** The filtered data */
  data: any;
  /** Warnings about invalid or missing fields */
  warnings?: string[];
}
