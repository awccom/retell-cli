# Phase 5: Transcripts Search Command

**Duration:** 2-3 days
**Dependencies:** Phase 1 (requires `filterFields()` utility)

---

## Objective

Create dedicated `retell transcripts search` command with hybrid filtering (API + client-side) to eliminate need for jq/grep in AI agent workflows.

---

## Command Structure

```bash
retell transcripts search [options]
```

### Options:
- `--status <status>` - Filter by call status (error, ended, ongoing)
- `--agent-id <id>` - Filter by agent ID
- `--since <date>` - Filter calls after this date (ISO format or relative)
- `--until <date>` - Filter calls before this date (ISO format)
- `--limit <n>` - Maximum results to return (default: 50)
- `--fields <fields>` - Select specific fields (from Phase 2)

---

## Implementation Strategy (Hybrid Filtering)

### Day 1: Research Retell API

**Task:** Investigate `client.call.list()` capabilities

1. Check Retell SDK documentation for supported parameters
2. Test what filters can be passed to API
3. Document findings in `localdocs/retell-api-search-capabilities.md`

**Expected findings:**
- API may support: limit, pagination
- API may NOT support: status filtering, date ranges, agent filtering
- Document exactly what's available

### API vs Client-Side Strategy:

```typescript
// Pseudo-code strategy
async function search(options: SearchOptions) {
  // Step 1: Build API query with supported params
  const apiParams = {};
  if (apiSupportsLimit) apiParams.limit = options.limit;
  if (apiSupportsStatus) apiParams.status = options.status;
  // ... add other supported params

  // Step 2: Fetch from API
  const allResults = await client.call.list(apiParams);

  // Step 3: Apply client-side filtering for unsupported params
  let filtered = allResults;

  if (!apiSupportsStatus && options.status) {
    filtered = filtered.filter(call => call.call_status === options.status);
  }

  if (!apiSupportsAgentId && options.agentId) {
    filtered = filtered.filter(call => call.agent_id === options.agentId);
  }

  if (!apiSupportsDateRange) {
    if (options.since) {
      const sinceDate = parseDate(options.since);
      filtered = filtered.filter(call => new Date(call.start_timestamp) >= sinceDate);
    }
    if (options.until) {
      const untilDate = parseDate(options.until);
      filtered = filtered.filter(call => new Date(call.start_timestamp) <= untilDate);
    }
  }

  // Step 4: Apply limit if not handled by API
  if (!apiSupportsLimit) {
    filtered = filtered.slice(0, options.limit || 50);
  }

  return { results: filtered, total_count: filtered.length };
}
```

---

## File Structure

### Create New File

**File:** `src/commands/transcripts/search.ts`

```typescript
import { Command } from 'commander';
import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';
import { filterFields } from '../../services/output-formatter';

interface SearchOptions {
  status?: string;
  agentId?: string;
  since?: string;
  until?: string;
  limit?: number;
  fields?: string;
}

export function createSearchCommand() {
  return new Command('search')
    .description('Search transcripts with advanced filtering')
    .option('--status <status>', 'Filter by call status (error, ended, ongoing)')
    .option('--agent-id <id>', 'Filter by agent ID')
    .option('--since <date>', 'Filter calls after this date (ISO format or YYYY-MM-DD)')
    .option('--until <date>', 'Filter calls before this date (ISO format or YYYY-MM-DD)')
    .option('--limit <number>', 'Maximum number of results', '50')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .action(async (options: SearchOptions) => {
      try {
        const client = getRetellClient();

        // Build search query
        const results = await searchTranscripts(client, options);

        // Apply field filtering if requested
        const output = options.fields
          ? {
              results: results.results.map(r =>
                filterFields(r, options.fields!.split(',').map(f => f.trim()))
              ),
              total_count: results.total_count,
              filters_applied: results.filters_applied
            }
          : results;

        outputJson(output);
      } catch (error) {
        handleSdkError(error);
      }
    });
}

async function searchTranscripts(client: any, options: SearchOptions) {
  // Implementation here (hybrid filtering logic)
}

function parseDate(dateStr: string): Date {
  // Parse ISO dates and relative dates
  // Support: "2025-11-01", "2025-11-01T10:00:00Z", etc.
}
```

---

### Register Command

**File:** `src/index.ts`

```typescript
import { createSearchCommand } from './commands/transcripts/search';

// In transcripts subcommand:
transcriptsCommand.addCommand(createSearchCommand());
```

---

## Task Breakdown

### Day 1: Research & Planning
- [ ] Research Retell API `call.list()` capabilities
- [ ] Document supported vs unsupported filters
- [ ] Create `localdocs/retell-api-search-capabilities.md`
- [ ] Design hybrid filtering strategy

### Day 2: Implementation
- [ ] Create `src/commands/transcripts/search.ts`
- [ ] Implement `searchTranscripts()` function
- [ ] Implement `parseDate()` helper
- [ ] Implement hybrid filtering logic
- [ ] Add field filtering integration
- [ ] Register command in `src/index.ts`

### Day 3: Testing & Polish
- [ ] Write integration tests
- [ ] Test all filter combinations
- [ ] Test edge cases
- [ ] Update documentation
- [ ] Add examples to help text

---

## Deliverables

- [ ] `localdocs/retell-api-search-capabilities.md` - Research findings
- [ ] `src/commands/transcripts/search.ts` - New command
- [ ] Updated `src/index.ts` - Command registration
- [ ] Documentation with examples

---

## Testing Requirements

### Basic Filtering Tests

- [ ] **Filter by status**
  ```bash
  retell transcripts search --status error
  # Expected: Only calls with status='error'
  ```

- [ ] **Filter by agent**
  ```bash
  retell transcripts search --agent-id agent_123
  # Expected: Only calls for agent_123
  ```

- [ ] **Filter by date range**
  ```bash
  retell transcripts search --since 2025-11-01 --until 2025-11-15
  # Expected: Calls between Nov 1-15
  ```

---

### Combined Filters

- [ ] **Status + Agent**
  ```bash
  retell transcripts search --status error --agent-id agent_123
  # Expected: Error calls for agent_123
  ```

- [ ] **Date range + Status**
  ```bash
  retell transcripts search --since 2025-11-01 --status ended
  # Expected: Ended calls since Nov 1
  ```

- [ ] **All filters together**
  ```bash
  retell transcripts search --status error --agent-id agent_123 --since 2025-11-01 --limit 10
  # Expected: Up to 10 error calls for agent_123 since Nov 1
  ```

---

### Limit & Pagination

- [ ] **Limit results**
  ```bash
  retell transcripts search --limit 10
  # Expected: Maximum 10 results
  ```

- [ ] **Default limit** (no --limit specified)
  ```bash
  retell transcripts search --status error
  # Expected: Maximum 50 results (default)
  ```

---

### Date Parsing

- [ ] **ISO date format**
  ```bash
  retell transcripts search --since 2025-11-01
  # Expected: Parsed correctly
  ```

- [ ] **ISO datetime format**
  ```bash
  retell transcripts search --since 2025-11-01T10:00:00Z
  # Expected: Parsed correctly
  ```

- [ ] **Invalid date format**
  ```bash
  retell transcripts search --since "invalid-date"
  # Expected: Error with helpful message
  ```

---

### Field Selection Integration

- [ ] **Works with --fields**
  ```bash
  retell transcripts search --status error --fields call_id,agent_id,call_status
  # Expected: Filtered results with only specified fields
  ```

---

### Edge Cases

- [ ] **Empty results** (no matches)
  ```bash
  retell transcripts search --status nonexistent-status
  # Expected: {"results": [], "total_count": 0, "filters_applied": {...}}
  ```

- [ ] **Invalid status value**
  - Should validate against known statuses?
  - Or let API/filtering handle it?

- [ ] **Date range with until before since**
  ```bash
  retell transcripts search --since 2025-11-15 --until 2025-11-01
  # Expected: Error or empty results
  ```

---

## Output Structure

### Successful Search:
```json
{
  "results": [
    {
      "call_id": "abc123",
      "call_status": "error",
      "agent_id": "agent_456",
      "start_timestamp": 1700000000000,
      ...
    },
    {
      "call_id": "def456",
      "call_status": "error",
      "agent_id": "agent_456",
      "start_timestamp": 1700000120000,
      ...
    }
  ],
  "total_count": 2,
  "filters_applied": {
    "status": "error",
    "agent_id": "agent_456",
    "since": "2025-11-01",
    "limit": 50
  }
}
```

### With Field Selection:
```json
{
  "results": [
    {
      "call_id": "abc123",
      "call_status": "error"
    },
    {
      "call_id": "def456",
      "call_status": "error"
    }
  ],
  "total_count": 2,
  "filters_applied": {...}
}
```

---

## Use Cases for AI Agents

### Example Workflow:
```bash
# 1. Find all error calls for a specific agent in the last week
retell transcripts search \
  --status error \
  --agent-id agent_123 \
  --since 2025-11-08 \
  --fields call_id

# 2. Iterate through each result and analyze
# (AI agent parses JSON and loops)

# 3. For each call, get hotspots
retell transcripts analyze <call_id> --hotspots-only

# 4. Aggregate issues and suggest prompt updates
```

No need for jq, grep, or complex shell scripting!

---

## Documentation Updates

Add to README.md:

```markdown
### Search Transcripts

Find calls with advanced filtering:

\`\`\`bash
# Find error calls
retell transcripts search --status error

# Find calls for specific agent in date range
retell transcripts search \
  --agent-id agent_123 \
  --since 2025-11-01 \
  --until 2025-11-15

# Combine filters and limit results
retell transcripts search \
  --status error \
  --agent-id agent_123 \
  --limit 20

# Use field selection for minimal output
retell transcripts search \
  --status error \
  --fields call_id,call_status,agent_id
\`\`\`

**Available filters:**
- \`--status\` - Call status (error, ended, ongoing)
- \`--agent-id\` - Filter by agent
- \`--since\` - Calls after date (YYYY-MM-DD or ISO format)
- \`--until\` - Calls before date (YYYY-MM-DD or ISO format)
- \`--limit\` - Max results (default: 50)
- \`--fields\` - Select specific fields
```

---

## Performance Considerations

- **Large result sets:** If API returns thousands of calls, client-side filtering could be slow
  - Consider streaming or pagination for future versions
  - Add progress indicator for long operations?

- **API rate limits:** Be mindful of rate limiting
  - Document in help text
  - Handle rate limit errors gracefully

---

## Success Criteria

- [ ] Search command implemented with all filters
- [ ] Hybrid filtering works (API + client-side)
- [ ] Works with --fields for token efficiency
- [ ] Returns structured, parseable output
- [ ] Handles all edge cases gracefully
- [ ] Reduces need for jq/grep by 80%+
- [ ] All tests passing
- [ ] Documentation updated

---

## Next Phase

After completion, proceed to **Phase 6: Diff Command & Dry Run**.
