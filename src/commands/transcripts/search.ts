/**
 * Search Transcripts Command
 *
 * Advanced filtering for call transcripts with API-based filtering.
 * Usage: retell transcripts search [options]
 */

import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError, filterFields } from '../../services/output-formatter';

// ===== TYPES =====

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

// ===== HELPER FUNCTIONS =====

/**
 * Parse date string into Date object
 * Supports ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('Date string cannot be empty');
  }

  // Try parsing as ISO date
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: "${dateStr}". Use YYYY-MM-DD or ISO 8601 format.`);
  }

  return date;
}

/**
 * Validate search options
 */
function validateSearchOptions(options: SearchOptions): void {
  // Validate status
  const validStatuses = ['error', 'ended', 'ongoing'];
  if (options.status && !validStatuses.includes(options.status)) {
    throw new Error(
      `Invalid status: "${options.status}". Valid options: ${validStatuses.join(', ')}`
    );
  }

  // Validate individual dates (this will catch empty strings and invalid formats)
  if (options.since !== undefined) {
    parseDate(options.since); // Will throw if invalid
  }

  if (options.until !== undefined) {
    parseDate(options.until); // Will throw if invalid
  }

  // Validate date range (only if both are provided and valid)
  if (options.since && options.until) {
    const sinceDate = parseDate(options.since);
    const untilDate = parseDate(options.until);

    if (sinceDate > untilDate) {
      throw new Error(
        `Invalid date range: --since (${options.since}) is after --until (${options.until})`
      );
    }
  }

  // Validate limit
  if (options.limit !== undefined && (options.limit < 1 || !Number.isInteger(options.limit))) {
    throw new Error(`Limit must be a positive integer (got: ${options.limit})`);
  }

  if (options.limit !== undefined && options.limit > 1000) {
    throw new Error(`Limit cannot exceed 1000 (got: ${options.limit})`);
  }
}

/**
 * Search transcripts with API filtering
 *
 * Note: Thanks to Retell API's comprehensive filtering capabilities,
 * all filtering is done server-side. See localdocs/retell-api-search-capabilities.md
 */
async function searchTranscripts(options: SearchOptions): Promise<SearchResult> {
  const client = getRetellClient();

  // Build API parameters
  const apiParams: any = {
    limit: options.limit || 50,
    sort_order: 'descending' as const, // Most recent first
  };

  // Build filter_criteria object
  const filterCriteria: any = {};

  // Status filter (API accepts array, we convert single value)
  if (options.status) {
    filterCriteria.call_status = [options.status];
  }

  // Agent ID filter (API accepts array, we convert single value)
  if (options.agentId) {
    filterCriteria.agent_id = [options.agentId];
  }

  // Date range filter (API accepts Unix timestamps in milliseconds)
  if (options.since || options.until) {
    filterCriteria.start_timestamp = {};

    if (options.since) {
      const sinceDate = parseDate(options.since);
      filterCriteria.start_timestamp.lower_threshold = sinceDate.getTime();
    }

    if (options.until) {
      const untilDate = parseDate(options.until);
      filterCriteria.start_timestamp.upper_threshold = untilDate.getTime();
    }
  }

  // Add filter_criteria to params if any filters were set
  if (Object.keys(filterCriteria).length > 0) {
    apiParams.filter_criteria = filterCriteria;
  }

  // Fetch from API (all filtering is done server-side!)
  const response = await client.call.list(apiParams);

  // The response is an array of calls
  const results = Array.isArray(response) ? response : [];

  // Build result object
  return {
    results: results,
    total_count: results.length,
    filters_applied: {
      ...(options.status && { status: options.status }),
      ...(options.agentId && { agent_id: options.agentId }),
      ...(options.since && { since: options.since }),
      ...(options.until && { until: options.until }),
      limit: options.limit || 50,
    },
  };
}

// ===== COMMAND IMPLEMENTATION =====

/**
 * Search transcripts with advanced filtering
 *
 * @param options Search options (status, agentId, dates, limit, fields)
 */
export async function searchTranscriptsCommand(options: SearchOptions = {}): Promise<void> {
  try {
    // Validate options
    validateSearchOptions(options);

    // Execute search
    const searchResult = await searchTranscripts(options);

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
    handleSdkError(error);
  }
}
