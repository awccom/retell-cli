/**
 * Search Transcripts Command
 *
 * Advanced filtering for call transcripts with API-based filtering.
 * Usage: retell transcripts search [options]
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError, filterFields } from '../../services/output-formatter';
import { z } from 'zod';

// ===== CONSTANTS =====

/** Maximum number of results allowed by the API */
const MAX_LIMIT = 1000;

/** Default number of results if not specified */
const DEFAULT_LIMIT = 50;

// ===== TYPES & VALIDATION =====

/**
 * Zod schema for validating API call responses
 * This ensures the API returns the expected data structure
 */
const CallSchema = z.object({
  call_id: z.string(),
  call_status: z.string().optional(),
  agent_id: z.string().optional(),
  start_timestamp: z.number().optional(),
  end_timestamp: z.number().optional(),
  // Allow additional fields (the API may return more fields than we validate)
}).passthrough();

const CallListSchema = z.array(CallSchema);

/**
 * Options for searching transcripts
 *
 * @property status - Filter by call status (error, ended, ongoing)
 * @property agentId - Filter by specific agent ID
 * @property since - Start date for filtering calls (YYYY-MM-DD or ISO 8601 format)
 * @property until - End date for filtering calls (YYYY-MM-DD or ISO 8601 format)
 * @property limit - Maximum number of results to return (default: 50, max: 1000)
 * @property fields - Comma-separated list of fields to include in output
 */
interface SearchOptions {
  status?: string;
  agentId?: string;
  since?: string;
  until?: string;
  limit?: number;
  fields?: string;
}

interface SearchResult {
  results: any[];
  total_count: number;
  filters_applied: {
    status?: string;
    agent_id?: string;
    since?: string;
    until?: string;
    limit: number;
  };
}

interface ApiFilterCriteria {
  call_status?: string[];
  agent_id?: string[];
  start_timestamp?: {
    lower_threshold?: number;
    upper_threshold?: number;
  };
}

interface ApiListParams {
  limit: number;
  sort_order: 'ascending' | 'descending';
  filter_criteria?: ApiFilterCriteria;
}

/**
 * Custom error class for validation errors
 * Allows us to distinguish validation errors from API errors
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Parse date string into Date object
 * Supports ISO format (YYYY-MM-DD, offsets, or full ISO 8601)
 * Uses strict regex validation to prevent unexpected date parsing
 */
interface ParsedDate {
  date: Date;
  isDateOnly: boolean;
}

function parseDate(dateStr: string): ParsedDate {
  if (!dateStr) {
    throw new ValidationError('Date string cannot be empty');
  }

  // Strict validation: accept YYYY-MM-DD, or ISO 8601 with timezone/offset
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const iso8601Pattern =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

  if (!iso8601Pattern.test(dateStr)) {
    throw new ValidationError(`Invalid date format: "${dateStr}". Use YYYY-MM-DD or ISO 8601 format.`);
  }

  // Parse as ISO date
  const date = new Date(dateStr);

  // Double-check the parsed date is valid
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid date format: "${dateStr}". Use YYYY-MM-DD or ISO 8601 format.`);
  }

  return { date, isDateOnly: dateOnlyPattern.test(dateStr) };
}

/**
 * Validate search options and return parsed dates
 * Returns cached parsed dates to avoid redundant parsing
 */
function validateSearchOptions(options: SearchOptions): { sinceDate?: ParsedDate; untilDate?: ParsedDate } {
  // Validate status
  const validStatuses = ['error', 'ended', 'ongoing'];
  if (options.status && !validStatuses.includes(options.status)) {
    throw new ValidationError(
      `Invalid status: "${options.status}". Valid options: ${validStatuses.join(', ')}`
    );
  }

  // Parse and cache dates (avoids redundant parsing)
  const parsedDates: { sinceDate?: ParsedDate; untilDate?: ParsedDate } = {};

  if (options.since !== undefined) {
    parsedDates.sinceDate = parseDate(options.since); // Will throw ValidationError if invalid
  }

  if (options.until !== undefined) {
    parsedDates.untilDate = parseDate(options.until); // Will throw ValidationError if invalid

    // If user provided date-only string, make it inclusive through end of day (23:59:59.999 UTC)
    if (parsedDates.untilDate.isDateOnly) {
      const date = new Date(parsedDates.untilDate.date.getTime());
      date.setUTCHours(23, 59, 59, 999);
      parsedDates.untilDate.date = date;
    }
  }

  // Validate date range (only if both are provided and valid)
  if (parsedDates.sinceDate && parsedDates.untilDate) {
    if (parsedDates.sinceDate.date > parsedDates.untilDate.date) {
      throw new ValidationError(
        `Invalid date range: --since ("${options.since}") is after --until ("${options.until}")`
      );
    }
  }

  // Validate limit
  if (options.limit !== undefined && (options.limit < 1 || !Number.isInteger(options.limit))) {
    throw new ValidationError(`Limit must be a positive integer (got: "${options.limit}")`);
  }

  if (options.limit !== undefined && options.limit > MAX_LIMIT) {
    throw new ValidationError(`Limit cannot exceed ${MAX_LIMIT} (got: "${options.limit}")`);
  }

  return parsedDates;
}

/**
 * Search transcripts with API filtering
 *
 * Note: Thanks to Retell API's comprehensive filtering capabilities,
 * all filtering is done server-side. See localdocs/retell-api-search-capabilities.md
 *
 * @param options Search options
 * @param parsedDates Pre-parsed and validated date objects (to avoid redundant parsing)
 */
async function searchTranscripts(
  options: SearchOptions,
  parsedDates: { sinceDate?: ParsedDate; untilDate?: ParsedDate }
): Promise<SearchResult> {
  const client = getRetellClient();

  // Build API parameters with proper typing
  const apiParams: ApiListParams = {
    limit: options.limit || DEFAULT_LIMIT,
    sort_order: 'descending', // Most recent first
  };

  // Build filter_criteria object
  const filterCriteria: ApiFilterCriteria = {};

  // Status filter (API accepts array, we convert single value)
  if (options.status) {
    filterCriteria.call_status = [options.status];
  }

  // Agent ID filter (API accepts array, we convert single value)
  if (options.agentId) {
    filterCriteria.agent_id = [options.agentId];
  }

  // Date range filter (API accepts Unix timestamps in milliseconds)
  // Use pre-parsed dates from validation to avoid redundant parsing
  if (parsedDates.sinceDate || parsedDates.untilDate) {
    filterCriteria.start_timestamp = {};

    if (parsedDates.sinceDate) {
      filterCriteria.start_timestamp.lower_threshold = parsedDates.sinceDate.date.getTime();
    }

    if (parsedDates.untilDate) {
      filterCriteria.start_timestamp.upper_threshold = parsedDates.untilDate.date.getTime();
    }
  }

  // Add filter_criteria to params if any filters were set
  if (Object.keys(filterCriteria).length > 0) {
    apiParams.filter_criteria = filterCriteria;
  }

  // Fetch from API (all filtering is done server-side!)
  const response = await client.call.list(apiParams as any);

  // Validate response format with Zod
  const validation = CallListSchema.safeParse(response);

  if (!validation.success) {
    console.warn('Warning: API response validation failed:', validation.error.message);
    throw new Error(`Invalid API response format: ${validation.error.message}`);
  }

  const results = validation.data;
  const requestedLimit = options.limit || DEFAULT_LIMIT;

  // Build result object
  const result = {
    results: results,
    total_count: results.length,
    filters_applied: {
      ...(options.status && { status: options.status }),
      ...(options.agentId && { agent_id: options.agentId }),
      ...(options.since && { since: options.since }),
      ...(options.until && { until: options.until }),
      limit: requestedLimit,
    },
  };

  // Warn if results might be truncated (hit the limit exactly)
  if (results.length === requestedLimit && results.length > 0) {
    console.warn(
      `Warning: Results limited to ${results.length}. There may be additional results available. ` +
        `Use --limit to increase (max: ${MAX_LIMIT}).`
    );
  }

  return result;
}

// ===== COMMAND IMPLEMENTATION =====

/**
 * Search transcripts with advanced filtering
 *
 * @param options Search options (status, agentId, dates, limit, fields)
 */
export async function searchTranscriptsCommand(options: SearchOptions = {}): Promise<void> {
  try {
    // Validate options and get cached parsed dates
    const parsedDates = validateSearchOptions(options);

    // Execute search with cached dates
    const searchResult = await searchTranscripts(options, parsedDates);

    // Apply field filtering if requested
    const output = options.fields
      ? {
          results: searchResult.results.map(r =>
            filterFields(r, options.fields!.split(',').map(f => f.trim()))
          ),
          total_count: searchResult.total_count,
          filters_applied: searchResult.filters_applied,
        }
      : searchResult;

    // Output results
    outputJson(output);
  } catch (error) {
    // Handle validation errors separately from SDK errors
    if (error instanceof ValidationError) {
      handleSdkError(error);
    } else {
      // API or network errors
      handleSdkError(error);
    }
  }
}
