# Phase 5: Transcripts Search Command - Task Handoff

## Context

Phases 1-4 have been successfully completed and merged into the `develop` branch.

✅ **Completed Phases:**
- **Phase 1:** Foundation utilities (`filterFields()`, `generateDiff()`, prototype pollution protection)
- **Phase 2:** Field selection added to 5 commands (transcripts: list, get, analyze; agents: list, info)
- **Phase 3:** Raw output mode (`--raw` flag) for transcripts analyze command
- **Phase 4:** Hotspot detection (`--hotspots-only` flag) for conversation issue identification

**Current State:**
- 78 unit tests passing
- `--fields` option working across all transcript and agent commands
- `--raw` flag working for transcripts analyze command
- `--hotspots-only` flag working for issue detection
- Token reduction of 50-90% achieved with field selection
- All features backward compatible

---

## Phase 5 Objective

Create dedicated `retell transcripts search` command with hybrid filtering (API + client-side) to eliminate the need for jq/grep in AI agent workflows. This enables:
- **Advanced Filtering:** Search calls by status, agent, date range, and more
- **AI Agent Workflows:** Batch analysis without external tools
- **Token Efficiency:** Combine with `--fields` for minimal output
- **Performance Monitoring:** Quickly find problematic calls

**Duration:** 2-3 days
**Dependencies:** Phase 1 ✅ (requires `filterFields()` utility)

---

## Setup Instructions

### 1. Checkout New Branch from Develop

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Verify Phase 4 is merged
git log --oneline -3
# Should show: Phase 4: Hotspot Detection merge commit

# Create new feature branch for Phase 5
git checkout -b feature/phase-5-search-command

# Verify the branch
git branch --show-current
```

### 2. Verify Phases 1-4 Are Available

```bash
# Run tests to ensure utilities are working
npm test

# Expected: 78 tests passing
# - 31 tests for filterFields()
# - 15 tests for generateDiff()
# - 32 tests for analyze command (including hotspots)

# Build to verify everything compiles
npm run build
# Expected: dist/index.js compiles successfully
```

### 3. Review Documentation

Read the following files to understand the implementation requirements:
- `localdocs/phase-5-search-command.md` - Detailed implementation guide
- `localdocs/v1.0.1-development-plan.md` - Overall project roadmap
- `src/commands/transcripts/list.ts` - Reference for existing list command structure

---

## Research Phase (IMPORTANT - Do This First!)

Before implementing, you **MUST** research the Retell API to understand what search capabilities are natively supported.

### Research Tasks:

1. **Examine Retell SDK `call.list()` Method**
   - Review Retell SDK documentation for `client.call.list()` parameters
   - Check what filters are supported by the API (vs what needs client-side filtering)
   - Test the list method with different parameters to see what works

2. **Document API Capabilities**
   Investigate which of these filters are supported:
   - ✓ Pagination/limit
   - ✓ Status filtering (error, ended, ongoing)
   - ✓ Agent ID filtering
   - ✓ Date range filtering (start_timestamp, end_timestamp)
   - ✓ Sorting options
   - ✓ Other available filters

3. **Design Hybrid Strategy**
   Based on findings, determine:
   - What filters can be pushed to API (more efficient)
   - What filters need client-side implementation (less efficient but necessary)
   - Optimal approach for combining both

4. **Create Reference Document**
   Create `localdocs/retell-api-search-capabilities.md` with your findings:
   ```markdown
   # Retell API Search Capabilities Reference

   ## API-Supported Filters

   ### call.list() Method Parameters
   - **limit:** (number) Maximum results to return
     - Supported: YES ✅
     - Example: `client.call.list({ limit: 50 })`

   - **filter_criteria:** (object) Filtering options
     - Supported: [YES/NO/PARTIAL]
     - Available filters:
       - status: [YES/NO]
       - agent_id: [YES/NO]
       - start_timestamp_gte: [YES/NO]
       - start_timestamp_lte: [YES/NO]

   - **sort_order:** (string) Sort direction
     - Supported: [YES/NO]
     - Options: [document if available]

   ## Client-Side Filtering Required For

   List any filters that must be implemented client-side:
   - [Filter name]: Reason why API doesn't support it
   - [Filter name]: Reason why API doesn't support it

   ## Implementation Strategy

   ### API Filters (Priority: Use These First)
   ```typescript
   // Example of what works
   const apiParams = {
     limit: options.limit,
     filter_criteria: {
       status: options.status,  // if supported
       agent_id: options.agentId // if supported
     }
   };
   ```

   ### Client-Side Filters (Fallback)
   ```typescript
   // Filters to apply after API fetch
   let filtered = results;

   if (!apiSupportsDateRange && options.since) {
     filtered = filtered.filter(call =>
       new Date(call.start_timestamp) >= new Date(options.since)
     );
   }
   ```

   ## Performance Notes
   - API filtering is more efficient (reduced data transfer)
   - Client-side filtering requires fetching full dataset first
   - Recommend using API filters where available
   ```

---

## Implementation Guide

### Step 1: Create Search Command File

**Location:** `src/commands/transcripts/search.ts`

```typescript
/**
 * Search Transcripts Command
 *
 * Advanced filtering for call transcripts with hybrid API + client-side filtering.
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

  // Validate date range
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
}

/**
 * Search transcripts with hybrid API + client-side filtering
 */
async function searchTranscripts(options: SearchOptions): Promise<SearchResult> {
  const client = getRetellClient();

  // Step 1: Build API parameters based on what's supported
  // NOTE: Adjust this based on your research findings!
  const apiParams: any = {};

  // Add limit to API params if supported
  if (options.limit) {
    apiParams.limit = options.limit;
  }

  // TODO: Based on your research, add other API-supported filters here
  // Example (if API supports it):
  // if (options.status) {
  //   apiParams.filter_criteria = { status: options.status };
  // }

  // Step 2: Fetch from API
  const response = await client.call.list(apiParams);
  let results = Array.isArray(response) ? response : response.calls || [];

  // Step 3: Apply client-side filters for unsupported parameters

  // Filter by status (if not handled by API)
  if (options.status) {
    results = results.filter((call: any) => call.call_status === options.status);
  }

  // Filter by agent ID (if not handled by API)
  if (options.agentId) {
    results = results.filter((call: any) => call.agent_id === options.agentId);
  }

  // Filter by date range (if not handled by API)
  if (options.since) {
    const sinceDate = parseDate(options.since);
    results = results.filter((call: any) => {
      const callDate = new Date(call.start_timestamp);
      return callDate >= sinceDate;
    });
  }

  if (options.until) {
    const untilDate = parseDate(options.until);
    results = results.filter((call: any) => {
      const callDate = new Date(call.start_timestamp);
      return callDate <= untilDate;
    });
  }

  // Apply limit if not handled by API
  const finalLimit = options.limit || 50;
  if (results.length > finalLimit) {
    results = results.slice(0, finalLimit);
  }

  // Build result object
  return {
    results: results,
    total_count: results.length,
    filters_applied: {
      ...(options.status && { status: options.status }),
      ...(options.agentId && { agent_id: options.agentId }),
      ...(options.since && { since: options.since }),
      ...(options.until && { until: options.until }),
      limit: finalLimit
    }
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
          filters_applied: searchResult.filters_applied
        }
      : searchResult;

    // Output results
    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Step 2: Register Command in CLI

**Location:** `src/index.ts`

Find the transcripts command section and add:

```typescript
import { searchTranscriptsCommand } from './commands/transcripts/search';

// In the transcripts subcommand section:
transcripts
  .command('search')
  .description('Search transcripts with advanced filtering')
  .option('--status <status>', 'Filter by call status (error, ended, ongoing)')
  .option('--agent-id <id>', 'Filter by agent ID')
  .option('--since <date>', 'Filter calls after this date (YYYY-MM-DD or ISO format)')
  .option('--until <date>', 'Filter calls before this date (YYYY-MM-DD or ISO format)')
  .option('--limit <number>', 'Maximum number of results (default: 50)', '50')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell transcripts search --status error
  $ retell transcripts search --agent-id agent_123 --since 2025-11-01
  $ retell transcripts search --status error --limit 10
  $ retell transcripts search --status error --fields call_id,agent_id,call_status
  $ retell transcripts search --since 2025-11-01 --until 2025-11-15
  `)
  .action(async (options) => {
    await searchTranscriptsCommand({
      status: options.status,
      agentId: options.agentId,
      since: options.since,
      until: options.until,
      limit: options.limit ? parseInt(options.limit) : undefined,
      fields: options.fields,
    });
  });
```

### Step 3: Create Unit Tests (IMPORTANT)

**Location:** `src/commands/transcripts/search.test.ts`

Create comprehensive tests for:
- Date parsing (valid/invalid formats)
- Validation (status, date ranges, limit)
- Filter combination logic
- Field selection integration
- Edge cases (empty results, invalid options)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTranscriptsCommand } from './search';
import * as retellClient from '../../services/retell-client';
import * as outputFormatter from '../../services/output-formatter';

// Mock dependencies
vi.mock('../../services/retell-client');
vi.mock('../../services/output-formatter', async () => {
  const actual = await vi.importActual('../../services/output-formatter');
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe('searchTranscriptsCommand', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      call: {
        list: vi.fn(),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe('validation', () => {
    it('should reject invalid status values', async () => {
      await expect(
        searchTranscriptsCommand({ status: 'invalid-status' })
      ).rejects.toThrow('Invalid status');
    });

    it('should reject date range where since is after until', async () => {
      await expect(
        searchTranscriptsCommand({
          since: '2025-11-15',
          until: '2025-11-01'
        })
      ).rejects.toThrow('Invalid date range');
    });

    it('should reject non-positive limit values', async () => {
      await expect(
        searchTranscriptsCommand({ limit: 0 })
      ).rejects.toThrow('Limit must be a positive integer');
    });

    // Add more validation tests...
  });

  describe('filtering', () => {
    it('should filter by status', async () => {
      const mockCalls = [
        { call_id: 'call_1', call_status: 'error' },
        { call_id: 'call_2', call_status: 'ended' },
        { call_id: 'call_3', call_status: 'error' },
      ];

      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({ status: 'error' });

      const output = vi.mocked(outputFormatter.outputJson).mock.calls[0][0];
      expect(output.results.length).toBe(2);
      expect(output.results.every((r: any) => r.call_status === 'error')).toBe(true);
    });

    // Add more filter tests...
  });

  // Add more test suites...
});
```

---

## Complete Implementation Checklist

- [ ] **Research Phase Complete**
  - [ ] Examined Retell SDK documentation for `call.list()`
  - [ ] Tested API with various filter parameters
  - [ ] Created `localdocs/retell-api-search-capabilities.md`
  - [ ] Documented API-supported vs client-side filters

- [ ] **Command Implementation**
  - [ ] Created `src/commands/transcripts/search.ts`
  - [ ] Implemented `searchTranscripts()` function with hybrid filtering
  - [ ] Implemented `parseDate()` helper function
  - [ ] Implemented `validateSearchOptions()` function
  - [ ] Registered command in `src/index.ts`

- [ ] **Testing**
  - [ ] Created `src/commands/transcripts/search.test.ts`
  - [ ] Unit tests for date parsing
  - [ ] Unit tests for validation
  - [ ] Unit tests for filtering logic
  - [ ] Unit tests for field selection integration
  - [ ] Edge case tests
  - [ ] All tests passing

- [ ] **Documentation**
  - [ ] Updated README.md with "Search Transcripts" section
  - [ ] Updated CHANGELOG.md with Phase 5 additions
  - [ ] Help text includes all options and examples

---

## Testing Requirements

### Manual Testing (Critical)

For each test case, use real Retell API calls.

#### Test 1: Filter by Status
```bash
retell transcripts search --status error
```
**Expected:**
- Returns only calls with status='error'
- Output structure includes results array, total_count, filters_applied

#### Test 2: Filter by Agent
```bash
retell transcripts search --agent-id agent_abc123
```
**Expected:**
- Returns only calls for specified agent
- Correct agent_id in filters_applied

#### Test 3: Filter by Date Range
```bash
retell transcripts search --since 2025-11-01 --until 2025-11-15
```
**Expected:**
- Returns calls within specified date range
- Both since and until in filters_applied

#### Test 4: Combined Filters
```bash
retell transcripts search --status error --agent-id agent_abc123 --since 2025-11-01
```
**Expected:**
- All filters applied correctly
- Results match all criteria

#### Test 5: Limit Results
```bash
retell transcripts search --limit 10
```
**Expected:**
- Maximum 10 results returned
- limit: 10 in filters_applied

#### Test 6: With Field Selection
```bash
retell transcripts search --status error --fields call_id,call_status,agent_id
```
**Expected:**
- Results contain only specified fields
- filters_applied still included

#### Test 7: Empty Results
```bash
retell transcripts search --status error --agent-id nonexistent_agent
```
**Expected:**
- Returns empty results array
- total_count: 0
- No error thrown

#### Test 8: Invalid Date Format
```bash
retell transcripts search --since "invalid-date"
```
**Expected:**
- Error with helpful message about date format
- Suggests correct format

#### Test 9: Invalid Status
```bash
retell transcripts search --status invalid
```
**Expected:**
- Error listing valid status options
- Clear error message

#### Test 10: Help Text
```bash
retell transcripts search --help
```
**Expected:**
- Shows all options
- Includes examples
- Clear descriptions

---

## Expected Output Examples

### Example 1: Status Filter
```bash
$ retell transcripts search --status error --limit 5
```
```json
{
  "results": [
    {
      "call_id": "call_abc123",
      "call_status": "error",
      "agent_id": "agent_456",
      "start_timestamp": 1700000000000,
      "duration_ms": 45000,
      ...
    },
    {
      "call_id": "call_def456",
      "call_status": "error",
      "agent_id": "agent_789",
      "start_timestamp": 1700001000000,
      "duration_ms": 30000,
      ...
    }
  ],
  "total_count": 2,
  "filters_applied": {
    "status": "error",
    "limit": 5
  }
}
```

### Example 2: Combined Filters with Fields
```bash
$ retell transcripts search --status error --agent-id agent_456 --fields call_id,call_status
```
```json
{
  "results": [
    {
      "call_id": "call_abc123",
      "call_status": "error"
    }
  ],
  "total_count": 1,
  "filters_applied": {
    "status": "error",
    "agent_id": "agent_456",
    "limit": 50
  }
}
```

### Example 3: Empty Results
```bash
$ retell transcripts search --status error --agent-id nonexistent
```
```json
{
  "results": [],
  "total_count": 0,
  "filters_applied": {
    "status": "error",
    "agent_id": "nonexistent",
    "limit": 50
  }
}
```

---

## Documentation Updates

### Update README.md

**Location:** Add new section after "Hotspot Detection" (around line 350)

```markdown
### Search Transcripts

Find calls with advanced filtering - no need for jq or grep:

\`\`\`bash
# Find all error calls
retell transcripts search --status error

# Find calls for specific agent in date range
retell transcripts search \
  --agent-id agent_123 \
  --since 2025-11-01 \
  --until 2025-11-15

# Combine multiple filters
retell transcripts search \
  --status error \
  --agent-id agent_123 \
  --since 2025-11-01 \
  --limit 20

# Use field selection for minimal output
retell transcripts search \
  --status error \
  --fields call_id,call_status,agent_id
\`\`\`

**Available filters:**
- `--status` - Call status (error, ended, ongoing)
- `--agent-id` - Filter by agent
- `--since` - Calls after date (YYYY-MM-DD or ISO format)
- `--until` - Calls before date (YYYY-MM-DD or ISO format)
- `--limit` - Max results (default: 50)
- `--fields` - Select specific fields (from Phase 2)

**AI Agent Workflow Example:**
\`\`\`bash
# 1. Find all recent error calls
retell transcripts search --status error --since 2025-11-08 --fields call_id

# 2. For each call, get hotspots
retell transcripts analyze <call_id> --hotspots-only

# 3. No jq or grep needed - direct JSON parsing!
\`\`\`
```

---

### Update CHANGELOG.md

**Location:** Add to `CHANGELOG.md` after Phase 4 section

```markdown
### Added - Phase 5: Transcripts Search Command

#### Advanced Search with Hybrid Filtering
- Added `retell transcripts search` command with multiple filter options:
  - `--status` - Filter by call status (error, ended, ongoing)
  - `--agent-id` - Filter by agent ID
  - `--since` - Filter calls after date (YYYY-MM-DD or ISO format)
  - `--until` - Filter calls before date (YYYY-MM-DD or ISO format)
  - `--limit` - Maximum results (default: 50)
  - `--fields` - Select specific fields (Phase 2 integration)

**Features:**
- Hybrid filtering (API + client-side) for maximum flexibility
- Structured output with results, total_count, and filters_applied
- Input validation with helpful error messages
- Seamless integration with `--fields` for token efficiency
- Eliminates need for jq/grep in AI agent workflows

**Examples:**
\`\`\`bash
# Find error calls for specific agent
retell transcripts search --status error --agent-id agent_123

# Date range filtering
retell transcripts search --since 2025-11-01 --until 2025-11-15

# Minimal output with field selection
retell transcripts search --status error --fields call_id,call_status
\`\`\`

**Use Cases:**
- Batch analysis: Find and analyze problematic calls
- Performance monitoring: Track errors by agent or time period
- AI workflows: Automated issue detection without shell scripting
- Debugging: Quickly locate specific call patterns

#### Documentation
- Added `localdocs/retell-api-search-capabilities.md` - API research findings
- Updated README.md with "Search Transcripts" section
- Updated CLI help text with comprehensive examples

#### Testing
- All existing tests still passing (78/78) ✅
- Unit tests for search validation and filtering
- Manual testing completed for all filter combinations
- Edge cases verified (empty results, invalid inputs)
- Integration with `--fields` verified
```

---

## Success Criteria

Before opening a PR, ensure:

- [ ] `search` command implemented in `src/commands/transcripts/search.ts`
- [ ] Hybrid filtering working (API + client-side)
- [ ] All filter options functional (status, agent-id, since, until, limit)
- [ ] Input validation with clear error messages
- [ ] Works correctly with `--fields` option
- [ ] Empty results handled gracefully (returns empty array, not error)
- [ ] Date parsing supports ISO formats (YYYY-MM-DD and full ISO 8601)
- [ ] Invalid inputs provide helpful error messages
- [ ] Help text updated with comprehensive examples
- [ ] README.md updated with "Search Transcripts" section
- [ ] CHANGELOG.md updated with Phase 5 additions
- [ ] `localdocs/retell-api-search-capabilities.md` created with research findings
- [ ] Unit tests created and passing
- [ ] All existing tests still pass (`npm test` → at least 78 tests passing)
- [ ] Build successful (`npm run build`)
- [ ] Manual testing completed for all test cases above

---

## When Phase 5 is Complete

### 1. Run Tests
```bash
npm test
# Ensure all tests pass (should be 78+ with new search tests)
```

### 2. Build Project
```bash
npm run build
# Verify successful build
```

### 3. Test Manually
Use a real Retell API key to test all scenarios listed in Testing Requirements above.

### 4. Commit Changes
```bash
# Stage all changes
git add .

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
feat(phase-5): add transcripts search command with hybrid filtering

Implements advanced search for transcripts with multiple filter options:
- Filter by status (error, ended, ongoing)
- Filter by agent ID
- Filter by date range (since/until with ISO format support)
- Configurable result limit (default: 50)
- Field selection integration (--fields)
- Hybrid API + client-side filtering strategy

Features:
- Eliminates need for jq/grep in AI workflows
- Structured output with results, total_count, filters_applied
- Input validation with helpful error messages
- Seamless integration with existing --fields option
- Handles empty results gracefully

Research:
- Created retell-api-search-capabilities.md with API findings
- Documented API-supported vs client-side filters
- Optimized filtering strategy for performance

Tests:
- Unit tests for validation, filtering, and edge cases
- All existing tests passing (78+ tests)
- Manual testing completed for all filter combinations
- Integration with --fields verified

Updates:
- README.md with "Search Transcripts" section and AI workflow examples
- CHANGELOG.md with Phase 5 additions
- Help text includes comprehensive examples

Relates to: v1.0.1 Phase 5

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 5. Push Branch
```bash
git push -u origin feature/phase-5-search-command
```

### 6. Open Pull Request to Develop
```bash
gh pr create --title "Phase 5: Transcripts Search Command" --base develop --body "$(cat <<'EOF'
## Phase 5: Transcripts Search Command

Adds `retell transcripts search` command with hybrid filtering for advanced call searching without jq/grep.

### Changes
- ✅ Added `search` subcommand to `retell transcripts`
- ✅ Multiple filter options (status, agent-id, since, until, limit)
- ✅ Hybrid filtering (API + client-side) for maximum flexibility
- ✅ Input validation with helpful error messages
- ✅ Field selection integration (works with `--fields`)
- ✅ Structured output (results, total_count, filters_applied)
- ✅ ISO date format support (YYYY-MM-DD and full ISO 8601)
- ✅ Documentation updated (README, CHANGELOG)
- ✅ API research documented in retell-api-search-capabilities.md
- ✅ Unit tests added

### Features
- **Status Filtering:** Find calls by status (error, ended, ongoing)
- **Agent Filtering:** Search calls for specific agents
- **Date Range Filtering:** Calls within time periods
- **Result Limiting:** Control output size (default: 50)
- **Field Selection:** Combine with `--fields` for minimal output

### Testing
- [x] Unit tests for validation and filtering
- [x] All existing tests passing (78+ tests)
- [x] Manual testing for all filter combinations
- [x] Empty results handled gracefully
- [x] Invalid inputs provide clear errors
- [x] Integration with `--fields` verified
- [x] Build successful

### Examples
```bash
# Find error calls
retell transcripts search --status error

# Filter by agent and date
retell transcripts search --agent-id agent_123 --since 2025-11-01

# Combined filters with field selection
retell transcripts search --status error --limit 10 --fields call_id,call_status

# Date range
retell transcripts search --since 2025-11-01 --until 2025-11-15
```

### Use Cases
1. **Batch Analysis:** Find and analyze error calls without shell scripting
2. **Performance Monitoring:** Track agent performance over time
3. **AI Workflows:** Direct JSON parsing without jq/grep
4. **Debugging:** Quickly locate specific call patterns

### Checklist
- [x] Code complete
- [x] Tests passing
- [x] Documentation updated (README.md, CHANGELOG.md)
- [x] API research documented
- [x] No breaking changes
- [x] Ready for review

Relates to: v1.0.1 development plan, Phase 5

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Next Steps After PR Approval

Once PR is reviewed and approved:

1. **Merge to develop**
   ```bash
   gh pr merge <pr-number> --squash --delete-branch
   ```

2. **Update local develop**
   ```bash
   git checkout develop
   git pull origin develop
   ```

3. **Proceed to Phase 6**
   - **Phase 6:** Diff Command & Dry Run
   - See `localdocs/phase-6-diff-dry-run.md`

---

## Support Files Reference

- **Implementation Guide:** `localdocs/phase-5-search-command.md`
- **Overall Plan:** `localdocs/v1.0.1-development-plan.md`
- **API Research:** `localdocs/retell-api-search-capabilities.md` (you will create this)
- **Reference Command:** `src/commands/transcripts/list.ts`
- **Phase 1 Utilities:** `src/services/output-formatter.ts` (filterFields)

---

## Questions or Issues?

If you encounter any issues:

1. **Verify Phase 1-4 utilities are working:**
   ```bash
   npm test
   # Should show 78 tests passing
   ```

2. **Check Retell SDK documentation:**
   - Review `client.call.list()` method signature
   - Check available filter parameters

3. **Consult the planning docs:**
   - `localdocs/phase-5-search-command.md` - Detailed requirements
   - `localdocs/v1.0.1-development-plan.md` - Big picture context

4. **Test with real API:**
   - Ensure you have `RETELL_API_KEY` set in environment
   - Test `client.call.list()` with various parameters
   - Document findings in retell-api-search-capabilities.md

---

## Key Implementation Notes

### Why Research Phase First?

The research phase is **critical** because:
1. We need to understand what the Retell API natively supports
2. API-supported filters are more efficient (less data transfer)
3. Client-side filters are less efficient but provide flexibility
4. Optimal implementation uses both strategically

**DO NOT SKIP THIS STEP!**

### Hybrid Filtering Strategy

**Best Practice:**
1. Push as many filters as possible to the API (efficient)
2. Apply remaining filters client-side (flexible)
3. Document which filters use which approach

**Example:**
- If API supports status filtering → use it
- If API doesn't support date range → filter client-side

### Input Validation

**Always validate user input:**
- Status values (only allow: error, ended, ongoing)
- Date formats (provide clear error messages)
- Date ranges (since must be before until)
- Limit values (positive integers only)

### Performance Considerations

- **Large datasets:** Client-side filtering may be slow with 1000+ calls
- **API rate limits:** Document in help text
- **Memory usage:** Consider streaming for very large result sets (future enhancement)

---

## Estimated Time Breakdown

- **Research Phase:** 2-3 hours (API exploration, documentation)
- **Implementation:** 4-5 hours (command, filtering logic, validation)
- **Testing:** 3-4 hours (unit tests, manual testing)
- **Documentation:** 1-2 hours (README, CHANGELOG updates)
- **Review & QA:** 1 hour (double-check all requirements)

**Total:** ~11-15 hours (2-3 days for complete, well-tested implementation)

---

## Ready to Start?

```bash
# 1. Checkout new branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/phase-5-search-command

# 2. Verify tests pass
npm test
# Expected: 78 tests passing

# 3. Start research phase!
# Examine Retell SDK documentation for call.list()
# Test API with different parameters

# 4. Create your research document
# Document findings in localdocs/retell-api-search-capabilities.md

# Good luck! 🚀
```

This phase provides significant value for AI agent workflows by eliminating external dependencies!
