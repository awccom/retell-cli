# Phase 2: Field Selection - Task Handoff

## Context

Phase 1 (Foundation & Utilities) has been successfully completed and merged into the `develop` branch. All utilities are in place and tested:

✅ **Completed in Phase 1:**
- `filterFields()` utility in `src/services/output-formatter.ts`
- `generateDiff()` and `formatDiffSummary()` in `src/services/prompt-diff.ts`
- TypeScript types in `src/types/index.ts`
- 46 unit tests passing
- Security: Prototype pollution protection
- Dependency: `microdiff` for diffing

---

## Phase 2 Objective

Add `--fields` option to transcript and agent commands to enable field selection, reducing output size and token usage for AI agent workflows.

**Duration:** 1-2 days
**Dependencies:** Phase 1 (completed ✅)

---

## Setup Instructions

### 1. Checkout New Branch from Develop

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Create new feature branch for Phase 2
git checkout -b feature/phase-2-field-selection

# Verify the branch
git branch --show-current
```

### 2. Verify Phase 1 Utilities Are Available

```bash
# Run tests to ensure Phase 1 utilities are working
npm test

# Expected: 46 tests passing
# - 31 tests for filterFields()
# - 15 tests for generateDiff()
```

### 3. Review Documentation

Read the following files to understand the implementation requirements:
- `localdocs/phase-2-field-selection.md` - Detailed implementation guide
- `localdocs/v1.0.1-development-plan.md` - Overall project roadmap
- `src/services/output-formatter.ts` - Review `filterFields()` function (lines 267-358)

---

## Commands to Modify

You will add `--fields <fields>` option to **5 command files**:

### Transcript Commands (3 files)
1. **`src/commands/transcripts/list.ts`**
   - Add `--fields` option
   - Apply field filtering before output

2. **`src/commands/transcripts/get.ts`**
   - Add `--fields` option
   - Apply field filtering before output

3. **`src/commands/transcripts/analyze.ts`**
   - Add `--fields` option
   - Works with enriched analysis output
   - Should be compatible with future `--raw` flag

### Agent Commands (2 files)
4. **`src/commands/agents/list.ts`**
   - Add `--fields` option
   - Apply to formatted agent array

5. **`src/commands/agents/info.ts`**
   - Add `--fields` option
   - Apply to full agent object

---

## Implementation Pattern

Each command should follow this consistent pattern:

```typescript
import { filterFields } from '../../services/output-formatter';

// In command options (using commander.js)
.option(
  '--fields <fields>',
  'Comma-separated list of fields to return (e.g., call_id,status,metadata.duration)'
)

// In command handler
const result = await fetchData(); // existing API call logic

// Apply field filtering if requested
const output = options.fields
  ? filterFields(result, options.fields.split(',').map(f => f.trim()))
  : result;

outputJson(output);
```

### Key Implementation Details

1. **Import the utility:**
   ```typescript
   import { filterFields } from '../../services/output-formatter';
   ```

2. **Parse comma-separated fields:**
   ```typescript
   options.fields.split(',').map(f => f.trim())
   ```
   This handles whitespace: `"call_id, status, metadata.duration"` → `["call_id", "status", "metadata.duration"]`

3. **Maintain backward compatibility:**
   - If `--fields` is NOT provided, return full response
   - This ensures existing users aren't affected

4. **Update help text:**
   Add examples to each command's description showing typical field usage

---

## Testing Requirements

### Integration Tests (Manual Testing)

For each command, test the following scenarios:

#### Transcript List
```bash
# Basic field selection
retell transcripts list --fields call_id,call_status

# With existing --limit option
retell transcripts list --limit 5 --fields call_id,call_status

# Nested field selection
retell transcripts list --fields call_id,metadata.duration
```

#### Transcript Get
```bash
# Nested fields
retell transcripts get <call_id> --fields metadata.duration,analysis

# Mixed top-level and nested
retell transcripts get <call_id> --fields call_id,metadata,analysis.summary
```

#### Transcript Analyze
```bash
# With enriched output
retell transcripts analyze <call_id> --fields call_id,performance

# Should work with future --raw flag
retell transcripts analyze <call_id> --raw --fields call_id,transcript
```

#### Agent List
```bash
# Basic fields
retell agents list --fields agent_id,agent_name

# With limit
retell agents list --limit 10 --fields agent_id,response_engine.type
```

#### Agent Info
```bash
# Select specific fields
retell agents info <agent_id> --fields agent_name,response_engine.type,voice_config
```

### Edge Cases to Test

1. **No --fields flag (backward compatibility)**
   ```bash
   retell transcripts get <call_id>
   # Expected: Full response object
   ```

2. **Invalid field names (graceful handling)**
   ```bash
   retell transcripts get <call_id> --fields call_id,nonexistent_field
   # Expected: Returns call_id, warns about nonexistent_field
   ```

3. **Empty fields value**
   ```bash
   retell transcripts get <call_id> --fields ""
   # Expected: Full object (treats as if --fields not provided)
   ```

4. **Whitespace handling**
   ```bash
   retell transcripts get <call_id> --fields "call_id, status, metadata.duration"
   # Expected: Correctly trims whitespace and works
   ```

5. **Deeply nested fields**
   ```bash
   retell transcripts analyze <call_id> --fields metadata.performance.latency_p50_ms.e2e
   # Expected: Returns only that deeply nested value
   ```

---

## Expected Output Examples

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

**Token savings:** ~80-90% reduction in output size for typical use cases

---

## Documentation Updates

After implementing the feature, update `README.md` with a new section:

### Location: After the "Command Reference" section

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

**Supported commands:**
- All transcript commands (`list`, `get`, `analyze`)
- All agent commands (`list`, `info`)

**Features:**
- Dot notation for nested fields (e.g., `metadata.duration`)
- Works with arrays
- Reduces token usage by 50-90% for AI workflows
- Backward compatible (no --fields = full output)
```

---

## CHANGELOG Updates

Add to `CHANGELOG.md` under `## [Unreleased] - v1.0.1`:

```markdown
### Added - Phase 2: Field Selection

#### Field Selection Flag (`--fields`)
- Added `--fields` option to transcript commands:
  - `retell transcripts list --fields <fields>`
  - `retell transcripts get <call_id> --fields <fields>`
  - `retell transcripts analyze <call_id> --fields <fields>`

- Added `--fields` option to agent commands:
  - `retell agents list --fields <fields>`
  - `retell agents info <agent_id> --fields <fields>`

**Features:**
- Comma-separated field list: `call_id,status,metadata.duration`
- Dot notation for nested fields: `metadata.duration`
- Handles whitespace in field lists
- Graceful handling of invalid field names (warns, continues)
- Reduces output size by 50-90% for typical AI workflows
- Fully backward compatible (no --fields = full output)

**Examples:**
\`\`\`bash
# Select specific fields
retell transcripts list --fields call_id,call_status

# Nested field selection
retell transcripts get abc123 --fields metadata.duration,analysis.summary

# Combined with other options
retell agents list --limit 10 --fields agent_id,agent_name
\`\`\`
```

---

## Success Criteria

Before opening a PR, ensure:

- [ ] All 5 commands support `--fields` option
- [ ] Field filtering reduces output size significantly (test with real API calls)
- [ ] Backward compatible: no `--fields` = full output
- [ ] Works correctly with nested fields using dot notation
- [ ] Gracefully handles invalid field names (warns, doesn't crash)
- [ ] Whitespace in field lists is handled correctly
- [ ] README.md updated with field selection documentation
- [ ] CHANGELOG.md updated with Phase 2 additions
- [ ] All existing tests still pass (`npm test`)
- [ ] Manual testing completed for all edge cases

---

## When Phase 2 is Complete

### 1. Run Tests
```bash
npm test
# Ensure all 46 existing tests still pass
```

### 2. Test Manually
Use a real Retell API key to test each command with various field combinations.

### 3. Commit Changes
```bash
# Stage all changes
git add .

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
feat(phase-2): add --fields option for field selection

Implements field selection across all transcript and agent commands:
- transcripts list, get, analyze
- agents list, info

Features:
- Comma-separated field selection
- Dot notation for nested fields
- Backward compatible (no breaking changes)
- Token usage reduction of 50-90%

Tests:
- All existing tests passing (46/46)
- Manual testing completed for all commands
- Edge cases verified (invalid fields, whitespace, etc.)

Updates:
- README.md with field selection documentation
- CHANGELOG.md with Phase 2 additions

Relates to: v1.0.1 Phase 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 4. Push Branch
```bash
git push -u origin feature/phase-2-field-selection
```

### 5. Open Pull Request
```bash
gh pr create --title "Phase 2: Field Selection" --base develop --body "$(cat <<'EOF'
## Phase 2: Field Selection

Adds `--fields` option to all transcript and agent commands for selective field output.

### Changes
- ✅ Added `--fields` option to 5 commands (transcripts: list, get, analyze; agents: list, info)
- ✅ Consistent implementation using `filterFields()` utility
- ✅ Dot notation support for nested fields
- ✅ Backward compatible (no breaking changes)
- ✅ Documentation updated (README, CHANGELOG)

### Features
- **Token Reduction:** 50-90% output size reduction for typical AI workflows
- **Nested Field Support:** Use dot notation like `metadata.duration`
- **Graceful Error Handling:** Invalid fields are warned about, not fatal
- **Whitespace Handling:** Correctly parses `"call_id, status, metadata.duration"`

### Testing
- [x] All existing tests passing (46/46)
- [x] Manual testing completed for all commands
- [x] Edge cases verified (invalid fields, empty fields, whitespace)
- [x] Backward compatibility confirmed
- [x] Real API testing with Retell API

### Examples
\`\`\`bash
# Basic field selection
retell transcripts list --fields call_id,call_status

# Nested fields with dot notation
retell transcripts get abc123 --fields metadata.duration,analysis.summary

# Combined with existing options
retell agents list --limit 10 --fields agent_id,agent_name
\`\`\`

### Checklist
- [x] Code complete
- [x] Tests passing
- [x] Documentation updated (README.md, CHANGELOG.md)
- [x] No breaking changes
- [x] Ready for review

Relates to: v1.0.1 development plan, Phase 2

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

3. **Proceed to Phase 3**
   - Phase 3: Raw Output Mode
   - Or Phase 4: Hotspots Detection (can run in parallel)
   - See `localdocs/phase-3-raw-output.md` or `localdocs/phase-4-hotspots-detection.md`

---

## Support Files Reference

- **Implementation Guide:** `localdocs/phase-2-field-selection.md`
- **Overall Plan:** `localdocs/v1.0.1-development-plan.md`
- **Phase 1 Completed:** PR #14 (merged)
- **Utilities Available:**
  - `src/services/output-formatter.ts` - `filterFields()` function
  - `src/types/index.ts` - TypeScript types

---

## Questions or Issues?

If you encounter any issues:

1. **Verify Phase 1 utilities are working:**
   ```bash
   npm test
   # Should show 46 tests passing
   ```

2. **Check the existing command structure:**
   - Review `src/commands/transcripts/list.ts` for command pattern
   - Review `src/services/output-formatter.ts` for `filterFields()` usage

3. **Consult the planning docs:**
   - `localdocs/phase-2-field-selection.md` - Detailed requirements
   - `localdocs/v1.0.1-development-plan.md` - Big picture context

---

## Ready to Start?

```bash
# 1. Checkout new branch
git checkout develop
git pull origin develop
git checkout -b feature/phase-2-field-selection

# 2. Verify tests pass
npm test

# 3. Start implementing!
# Open src/commands/transcripts/list.ts and begin adding --fields option

# Good luck! 🚀
```
