# Phase 2: Field Selection

**Duration:** 1-2 days
**Dependencies:** Phase 1 (requires `filterFields()` utility)

---

## Objective

Add `--fields` option to transcripts and agents commands for token control, reducing output size for AI agent workflows.

---

## Commands to Modify

### Transcript Commands
1. `src/commands/transcripts/list.ts`
2. `src/commands/transcripts/get.ts`
3. `src/commands/transcripts/analyze.ts`

### Agent Commands
4. `src/commands/agents/list.ts`
5. `src/commands/agents/info.ts`

---

## Implementation Pattern

Each command will follow this pattern:

```typescript
import { filterFields } from '../services/output-formatter';

// In command options
.option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,status,metadata.duration)')

// In command handler
const result = await fetchData(); // existing logic

// Apply field filtering if requested
const output = options.fields
  ? filterFields(result, options.fields.split(',').map(f => f.trim()))
  : result;

outputJson(output);
```

---

## Task Breakdown

### 1. Update Transcript Commands

**File: `src/commands/transcripts/list.ts`**
- Add `--fields` option
- Apply `filterFields()` before `outputJson()`
- Update help text with examples

**File: `src/commands/transcripts/get.ts`**
- Add `--fields` option
- Apply `filterFields()` before `outputJson()`
- Update help text with examples

**File: `src/commands/transcripts/analyze.ts`**
- Add `--fields` option
- Apply `filterFields()` to enriched result
- Works with both default and `--raw` output
- Update help text with examples

---

### 2. Update Agent Commands

**File: `src/commands/agents/list.ts`**
- Add `--fields` option
- Apply `filterFields()` to formatted agents array
- Update help text with examples

**File: `src/commands/agents/info.ts`**
- Add `--fields` option
- Apply `filterFields()` before `outputJson()`
- Update help text with examples

---

### 3. Help Text Examples

Add to each command's help description:

```
Examples:
  $ retell transcripts list --fields call_id,call_status
  $ retell transcripts get abc123 --fields metadata,analysis.summary
  $ retell agents list --fields agent_id,agent_name,response_engine_type
```

---

## Deliverables

- [ ] All 5 commands updated with `--fields` option
- [ ] Consistent implementation across commands
- [ ] Updated help text with examples
- [ ] All existing functionality preserved (backward compatible)

---

## Testing Requirements

### Integration Tests

**Transcripts List:**
- [ ] `retell transcripts list --fields call_id,call_status`
  - Verify only call_id and call_status are returned
- [ ] `retell transcripts list --limit 5 --fields call_id`
  - Verify --fields works with existing --limit option

**Transcripts Get:**
- [ ] `retell transcripts get <id> --fields metadata.duration,analysis`
  - Verify nested field selection works
- [ ] `retell transcripts get <id> --fields call_id,metadata`
  - Verify mixed top-level and nested fields

**Transcripts Analyze:**
- [ ] `retell transcripts analyze <id> --fields call_id,performance`
  - Verify field filtering on enriched output
- [ ] `retell transcripts analyze <id> --raw --fields call_id,transcript`
  - Verify --fields works with --raw mode

**Agents List:**
- [ ] `retell agents list --fields agent_id,agent_name`
  - Verify filtering on already-formatted output
- [ ] `retell agents list --limit 10 --fields agent_id,response_engine_type`
  - Verify compatibility with --limit

**Agents Info:**
- [ ] `retell agents info <id> --fields agent_name,response_engine_type`
  - Verify field selection on full agent object

---

### Edge Cases

- [ ] **No --fields flag** (should return everything - backward compat)
  ```bash
  retell transcripts get <id>
  # Expected: Full response object
  ```

- [ ] **Invalid field names** (graceful handling)
  ```bash
  retell transcripts get <id> --fields call_id,nonexistent_field
  # Expected: Returns call_id, skips invalid field (or warns)
  ```

- [ ] **Empty --fields value**
  ```bash
  retell transcripts get <id> --fields ""
  # Expected: Error or return full object
  ```

- [ ] **Nested field that doesn't exist**
  ```bash
  retell transcripts get <id> --fields metadata.nonexistent
  # Expected: Returns empty metadata object or skips
  ```

- [ ] **Whitespace in field list**
  ```bash
  retell transcripts get <id> --fields "call_id, status, metadata.duration"
  # Expected: Trim whitespace, works correctly
  ```

---

## Example Usage & Expected Output

### Before (full output):
```bash
$ retell transcripts get abc123
{
  "call_id": "abc123",
  "call_status": "ended",
  "agent_id": "agent_456",
  "metadata": {
    "duration": 120,
    "cost": 0.05,
    "start_time": "2025-11-15T10:00:00Z"
  },
  "transcript": [...],
  "analysis": {...},
  "performance": {...}
}
```

### After (with --fields):
```bash
$ retell transcripts get abc123 --fields call_id,metadata.duration
{
  "call_id": "abc123",
  "metadata": {
    "duration": 120
  }
}
```

**Token savings:** ~80-90% reduction in output size

---

## Performance Considerations

- Field filtering should be fast (<10ms for typical objects)
- No impact when --fields is not used
- Consider memoization if filtering is expensive

---

## Documentation Updates

Add to README.md:

```markdown
### Field Selection

Reduce output size and token usage by selecting specific fields:

\`\`\`bash
# Get only call_id and status
retell transcripts list --fields call_id,call_status

# Select nested fields with dot notation
retell transcripts get abc123 --fields metadata.duration,analysis.summary

# Combine with other options
retell agents list --limit 10 --fields agent_id,agent_name
\`\`\`

Field selection works with:
- All transcript commands (list, get, analyze)
- All agent commands (list, info)
- Both raw and enriched output modes
```

---

## Success Criteria

- [ ] All 5 commands support --fields
- [ ] Field filtering reduces output by 50-90% for typical use cases
- [ ] Backward compatible (no --fields = full output)
- [ ] Works correctly with nested fields
- [ ] Graceful handling of invalid field names
- [ ] All tests passing
- [ ] Documentation updated

---

## Next Phase

After completion, proceed to **Phase 3: Raw Output Mode** (can run in parallel with Phase 4).
