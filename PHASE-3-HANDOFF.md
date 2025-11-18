# Phase 3: Raw Output Mode - Task Handoff

## Context

Phase 1 (Foundation & Utilities) and Phase 2 (Field Selection) have been successfully completed and merged into the `develop` branch.

✅ **Completed Phases:**
- **Phase 1:** Foundation utilities (`filterFields()`, `generateDiff()`, prototype pollution protection)
- **Phase 2:** Field selection added to 5 commands (transcripts: list, get, analyze; agents: list, info)

**Current State:**
- 46 unit tests passing
- `--fields` option working across all transcript and agent commands
- Token reduction of 50-90% achieved with field selection
- All features backward compatible

---

## Phase 3 Objective

Add `--raw` flag to the `transcripts analyze` command to return unmodified API responses instead of enriched analysis. This is useful for:
- Debugging (comparing raw vs enriched output)
- API schema alignment (tools expecting official Retell schema)
- Future-proofing (accessing new API fields before CLI enriches them)
- Token efficiency (combine with `--fields` for precise data extraction)

**Duration:** 1 day
**Dependencies:** Phase 1 ✅ (optional: Phase 2 for --fields compatibility) ✅

---

## Setup Instructions

### 1. Checkout New Branch from Develop

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Verify Phase 2 is merged
git log --oneline -3
# Should show: Phase 2: Field Selection merge commit

# Create new feature branch for Phase 3
git checkout -b feature/phase-3-raw-output

# Verify the branch
git branch --show-current
```

### 2. Verify Phase 1 & 2 Are Available

```bash
# Run tests to ensure utilities are working
npm test

# Expected: 46 tests passing
# - 31 tests for filterFields()
# - 15 tests for generateDiff()

# Build to verify everything compiles
npm run build
# Expected: dist/index.js  33.0kb
```

### 3. Review Documentation

Read the following files to understand the implementation requirements:
- `localdocs/phase-3-raw-output.md` - Detailed implementation guide
- `localdocs/v1.0.1-development-plan.md` - Overall project roadmap
- `src/commands/transcripts/analyze.ts` - The file you'll be modifying

---

## Current Behavior of `analyze` Command

The `analyze` command currently enriches the raw API response into a structured format:

**File:** `src/commands/transcripts/analyze.ts`

**Current flow:**
1. Fetches call data via `client.call.retrieve(callId)`
2. Extracts and restructures data into `AnalysisOutput` format:
   - `metadata`: Extracted call metadata (status, duration, timestamps)
   - `transcript`: Simplified transcript turns with word counts
   - `analysis`: Call analysis data (summary, sentiment, success)
   - `performance`: Latency metrics (e2e, llm, tts)
   - `cost`: Cost breakdown
3. Applies field filtering if `--fields` is provided
4. Outputs the enriched JSON

**Current output structure (enriched):**
```json
{
  "call_id": "abc123",
  "metadata": {
    "status": "ended",
    "duration_ms": 120000,
    "start_timestamp": 1700000000000,
    "end_timestamp": 1700000120000,
    "agent_name": "Support Agent"
  },
  "transcript": [
    {"role": "user", "content": "...", "word_count": 5},
    {"role": "agent", "content": "...", "word_count": 12}
  ],
  "analysis": {
    "summary": "...",
    "sentiment": "positive",
    "successful": true,
    "in_voicemail": false
  },
  "performance": { /* latency metrics */ },
  "cost": { /* cost breakdown */ }
}
```

---

## Desired Behavior with `--raw`

When the `--raw` flag is provided, the command should:
1. Fetch call data via `client.call.retrieve(callId)`
2. **Skip all enrichment logic**
3. Return the raw API response directly
4. Still support `--fields` for filtering the raw response

**Output with --raw (unmodified API response):**
```json
{
  "call_id": "abc123",
  "from_number": "+1234567890",
  "to_number": "+0987654321",
  "direction": "inbound",
  "call_status": "ended",
  "start_timestamp": 1700000000000,
  "end_timestamp": 1700000120000,
  "agent_id": "agent_456",
  "retell_llm_dynamic_variables": {},
  "opt_out_sensitive_data_storage": false,
  "transcript": "...",
  "transcript_object": [...],
  "recording_url": "...",
  "public_log_url": "...",
  // ... all other fields from Retell API
}
```

---

## Implementation Guide

### Step 1: Update the Options Interface

**Location:** `src/commands/transcripts/analyze.ts` (around line 53)

**Current:**
```typescript
export interface AnalyzeTranscriptOptions {
  fields?: string;
}
```

**Update to:**
```typescript
export interface AnalyzeTranscriptOptions {
  fields?: string;
  raw?: boolean;  // Add this line
}
```

---

### Step 2: Add Early Return for Raw Mode

**Location:** `src/commands/transcripts/analyze.ts` in `analyzeTranscriptCommand()` function

**Find this section (around line 86-87):**
```typescript
// Retrieve the call from the API
const call = await client.call.retrieve(callId);
```

**Add immediately after:**
```typescript
// Retrieve the call from the API
const call = await client.call.retrieve(callId);

// If --raw flag is set, return unmodified API response
if (options.raw) {
  const output = options.fields
    ? filterFields(call, options.fields.split(',').map(f => f.trim()))
    : call;
  outputJson(output);
  return;
}

// Otherwise, continue with enrichment...
```

**Explanation:**
- When `options.raw` is true, skip enrichment and return the raw `call` object
- Still respect `--fields` if provided (allows `--raw --fields call_id,transcript`)
- Use `return` to exit early and skip the enrichment logic below

---

### Step 3: Update CLI Command Registration

**Location:** `src/index.ts`

**Find the `analyze` command registration (around line 99):**
```typescript
transcripts
  .command('analyze <call_id>')
  .description('Analyze a call transcript with performance metrics and insights')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,performance,analysis.summary)')
  .addHelpText('after', `
Examples:
  $ retell transcripts analyze call_abc123
  $ retell transcripts analyze call_abc123 --fields call_id,performance
  $ retell transcripts analyze call_abc123 | jq '.performance.latency_p50_ms'
  `)
  .action(async (callId, options) => {
    await analyzeTranscriptCommand(callId, {
      fields: options.fields,
    });
  });
```

**Update to:**
```typescript
transcripts
  .command('analyze <call_id>')
  .description('Analyze a call transcript with performance metrics and insights')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,performance,analysis.summary)')
  .option('--raw', 'Return unmodified API response instead of enriched analysis')  // Add this line
  .addHelpText('after', `
Examples:
  $ retell transcripts analyze call_abc123
  $ retell transcripts analyze call_abc123 --fields call_id,performance
  $ retell transcripts analyze call_abc123 --raw
  $ retell transcripts analyze call_abc123 --raw --fields call_id,transcript_object
  $ retell transcripts analyze call_abc123 | jq '.performance.latency_p50_ms'
  `)
  .action(async (callId, options) => {
    await analyzeTranscriptCommand(callId, {
      fields: options.fields,
      raw: options.raw,  // Add this line
    });
  });
```

---

## Complete Implementation Checklist

- [ ] Updated `AnalyzeTranscriptOptions` interface to include `raw?: boolean`
- [ ] Added early return logic for raw mode in `analyzeTranscriptCommand()`
- [ ] Updated CLI command registration in `src/index.ts` with `--raw` option
- [ ] Added `--raw` examples to help text
- [ ] Passed `raw: options.raw` to `analyzeTranscriptCommand()` in action handler

---

## Testing Requirements

### Manual Testing (Critical)

For each test case, use a real Retell API call ID.

#### Test 1: Raw Mode Returns Unmodified API Response
```bash
retell transcripts analyze <call_id> --raw
```
**Expected:**
- Output matches exact Retell API structure (includes fields like `from_number`, `to_number`, `direction`, etc.)
- No enrichment applied (no `metadata`, `transcript`, `analysis`, `performance` wrapper objects)

#### Test 2: Default Behavior Unchanged (Backward Compatibility)
```bash
retell transcripts analyze <call_id>
```
**Expected:**
- Enriched analysis output (current behavior)
- Contains `metadata`, `transcript`, `analysis`, `performance`, `cost` sections

#### Test 3: Raw Works with Fields
```bash
retell transcripts analyze <call_id> --raw --fields call_id,transcript_object
```
**Expected:**
- Raw API response filtered to only include `call_id` and `transcript_object`
- No enrichment applied

#### Test 4: Raw with Nested Fields
```bash
retell transcripts analyze <call_id> --raw --fields call_id,call_analysis.call_summary
```
**Expected:**
- Returns only `call_id` and the nested `call_analysis.call_summary` field from raw response

#### Test 5: Error Handling
```bash
retell transcripts analyze invalid_call_id --raw
```
**Expected:**
- Proper error message via `handleSdkError()`
- No crash or uncaught exceptions

#### Test 6: Help Text
```bash
retell transcripts analyze --help
```
**Expected:**
- Shows `--raw` option in help output
- Includes examples with `--raw` flag

---

### Edge Cases to Test

1. **Empty fields with raw**
   ```bash
   retell transcripts analyze <call_id> --raw --fields ""
   ```
   Expected: Returns full raw object (treats empty as no filtering)

2. **Invalid field with raw**
   ```bash
   retell transcripts analyze <call_id> --raw --fields call_id,nonexistent_field
   ```
   Expected: Returns `call_id`, warns about `nonexistent_field`

3. **Both flags together**
   ```bash
   retell transcripts analyze <call_id> --raw --fields call_id,performance
   ```
   Expected: Returns raw response filtered to those fields (not enriched structure)

---

### Automated Testing (Optional but Recommended)

Since this is a straightforward flag addition, existing tests should continue to pass:

```bash
npm test
# Expected: 46 tests passing (no new tests required for this phase)
```

**Optional:** Add integration tests if you want to verify raw mode programmatically, but manual testing is sufficient for this phase.

---

## Expected Output Examples

### Example 1: Enriched Analysis (default, no --raw)
```bash
$ retell transcripts analyze call_abc123
```
```json
{
  "call_id": "call_abc123",
  "metadata": {
    "status": "ended",
    "duration_ms": 120000,
    "start_timestamp": 1700000000000,
    "end_timestamp": 1700000120000,
    "agent_name": "Support Agent"
  },
  "transcript": [
    {"role": "user", "content": "Hello", "word_count": 1},
    {"role": "agent", "content": "Hi there!", "word_count": 2}
  ],
  "analysis": {
    "summary": "Customer called for support...",
    "sentiment": "positive",
    "successful": true,
    "in_voicemail": false
  },
  "performance": {
    "latency_p50_ms": {"e2e": 800, "llm": 500, "tts": 200},
    "latency_p90_ms": {"e2e": 1200, "llm": 900, "tts": 300}
  },
  "cost": {
    "total": 0.05,
    "breakdown": [{"product": "llm", "cost": 0.03}]
  }
}
```

---

### Example 2: Raw API Response (with --raw)
```bash
$ retell transcripts analyze call_abc123 --raw
```
```json
{
  "call_id": "call_abc123",
  "from_number": "+1234567890",
  "to_number": "+0987654321",
  "direction": "inbound",
  "call_status": "ended",
  "start_timestamp": 1700000000000,
  "end_timestamp": 1700000120000,
  "agent_id": "agent_456",
  "retell_llm_dynamic_variables": {},
  "opt_out_sensitive_data_storage": false,
  "transcript": "User: Hello\nAgent: Hi there!",
  "transcript_object": [
    {"role": "user", "content": "Hello", "words": [...]},
    {"role": "agent", "content": "Hi there!", "words": [...]}
  ],
  "call_analysis": {
    "call_summary": "Customer called for support...",
    "user_sentiment": "positive",
    "call_successful": true,
    "in_voicemail": false
  },
  "latency": {
    "e2e": {"p50": 800, "p90": 1200},
    "llm": {"p50": 500, "p90": 900},
    "tts": {"p50": 200, "p90": 300}
  },
  "call_cost": {
    "combined_cost": 0.05,
    "product_costs": [{"product": "llm", "cost": 0.03}]
  },
  "recording_url": "https://...",
  "public_log_url": "https://...",
  "agent_name": "Support Agent",
  "duration_ms": 120000
  // ... all other fields from Retell API
}
```

**Key Difference:** Raw response uses Retell's exact field structure (e.g., `call_analysis.call_summary` instead of `analysis.summary`).

---

### Example 3: Raw + Fields (Minimal Output)
```bash
$ retell transcripts analyze call_abc123 --raw --fields call_id,transcript_object
```
```json
{
  "call_id": "call_abc123",
  "transcript_object": [
    {"role": "user", "content": "Hello", "words": [...]},
    {"role": "agent", "content": "Hi there!", "words": [...]}
  ]
}
```

**Token Savings:** ~95% reduction compared to full raw response, ~90% compared to enriched analysis.

---

## Documentation Updates

### Update README.md

**Location:** Add new section after "Field Selection" (around line 291)

```markdown
### Raw Output Mode

Get the unmodified API response instead of enriched analysis:

\`\`\`bash
# Raw API response (useful for debugging)
retell transcripts analyze abc123 --raw

# Combine with field selection for minimal output
retell transcripts analyze abc123 --raw --fields call_id,transcript_object

# Compare raw vs enriched
retell transcripts analyze abc123 --raw > raw.json
retell transcripts analyze abc123 > enriched.json
diff raw.json enriched.json
\`\`\`

**When to use:**
- Debugging issues with API responses
- When tools expect the official Retell API schema
- Accessing new API fields before CLI enrichment support
- Comparing raw data to enriched output for validation

**Supported commands:**
- `transcripts analyze` (returns raw call object from Retell API)

**Note:** The `--raw` flag works seamlessly with `--fields` for precise data extraction.
```

---

### Update CHANGELOG.md

**Location:** Add to `CHANGELOG.md` under the Phase 2 section (after line 140)

```markdown
### Added - Phase 3: Raw Output Mode

#### Raw Output Flag (`--raw`)
- Added `--raw` option to `transcripts analyze` command:
  - `retell transcripts analyze <call_id> --raw`

**Features:**
- Returns unmodified API response from Retell (bypasses enrichment)
- Works seamlessly with `--fields` for combined filtering: `--raw --fields call_id,transcript`
- Useful for debugging, API schema alignment, and accessing new fields
- Fully backward compatible (no `--raw` = enriched analysis output)

**Examples:**
\`\`\`bash
# Get raw API response
retell transcripts analyze abc123 --raw

# Raw response with field filtering
retell transcripts analyze abc123 --raw --fields call_id,transcript_object

# Compare raw vs enriched
diff <(retell transcripts analyze abc123 --raw) <(retell transcripts analyze abc123)
\`\`\`

**Use Cases:**
- Debugging: Compare raw API response to enriched output
- API Schema Alignment: Tools expecting official Retell schema
- Future-proofing: Access new API fields before CLI enriches them
- Token Efficiency: Combine with `--fields` for precise extraction

#### Testing
- All existing tests still passing (46/46) ✅
- Backward compatibility verified (no `--raw` = enriched output)
- Manual testing completed for all use cases
```

---

## Success Criteria

Before opening a PR, ensure:

- [ ] `--raw` flag implemented in `src/commands/transcripts/analyze.ts`
- [ ] Returns exact API response (no transformation) when `--raw` is used
- [ ] Works correctly with `--fields` (raw response can be filtered)
- [ ] Backward compatible: no `--raw` flag = enriched output (current behavior)
- [ ] Help text updated with `--raw` examples in `src/index.ts`
- [ ] README.md updated with "Raw Output Mode" section
- [ ] CHANGELOG.md updated with Phase 3 additions
- [ ] All existing tests still pass (`npm test` → 46 tests passing)
- [ ] Build successful (`npm run build`)
- [ ] Manual testing completed for all test cases above

---

## When Phase 3 is Complete

### 1. Run Tests
```bash
npm test
# Ensure all 46 existing tests still pass
```

### 2. Build Project
```bash
npm run build
# Verify successful build (should output: dist/index.js  ~33kb)
```

### 3. Test Manually
Use a real Retell API key to test:
- Default behavior (no `--raw`)
- Raw mode (`--raw`)
- Raw with fields (`--raw --fields call_id,transcript`)
- Error handling (invalid call ID)

### 4. Commit Changes
```bash
# Stage all changes
git add .

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
feat(phase-3): add --raw flag for unmodified API responses

Implements raw output mode for transcripts analyze command:
- Returns unmodified API response when --raw flag is used
- Bypasses enrichment logic (no restructuring)
- Works seamlessly with --fields for filtering
- Backward compatible (no breaking changes)

Features:
- Useful for debugging (compare raw vs enriched)
- API schema alignment for tools expecting Retell structure
- Future-proofing (access new fields before enrichment)
- Token efficiency when combined with --fields

Tests:
- All existing tests passing (46/46)
- Manual testing completed for all use cases
- Backward compatibility verified

Updates:
- README.md with "Raw Output Mode" section
- CHANGELOG.md with Phase 3 additions
- Help text includes --raw examples

Relates to: v1.0.1 Phase 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 5. Push Branch
```bash
git push -u origin feature/phase-3-raw-output
```

### 6. Open Pull Request to Develop
```bash
gh pr create --title "Phase 3: Raw Output Mode" --base develop --body "$(cat <<'EOF'
## Phase 3: Raw Output Mode

Adds `--raw` flag to `transcripts analyze` command for returning unmodified API responses.

### Changes
- ✅ Added `--raw` option to `transcripts analyze` command
- ✅ Returns exact API response when flag is used (no enrichment)
- ✅ Works seamlessly with `--fields` for filtering raw responses
- ✅ Backward compatible (no breaking changes)
- ✅ Documentation updated (README, CHANGELOG)

### Features
- **Debugging:** Compare raw vs enriched output
- **API Schema Alignment:** Tools expecting official Retell structure
- **Future-proofing:** Access new API fields before CLI enrichment
- **Token Efficiency:** Combine with `--fields` for precise extraction

### Testing
- [x] All existing tests passing (46/46)
- [x] Manual testing completed
- [x] Raw mode returns unmodified API response
- [x] Default behavior unchanged (backward compatible)
- [x] Works correctly with `--fields` flag
- [x] Error handling verified
- [x] Build successful

### Examples
\`\`\`bash
# Get raw API response
retell transcripts analyze abc123 --raw

# Raw response with field filtering
retell transcripts analyze abc123 --raw --fields call_id,transcript_object

# Default enriched output (backward compatible)
retell transcripts analyze abc123
\`\`\`

### Use Cases
1. **Debugging:** Compare raw API data to enriched output for validation
2. **Schema Alignment:** Integrate with tools expecting official Retell API schema
3. **Future-proofing:** Access new API fields before CLI adds enrichment support
4. **Token Control:** Combine `--raw` and `--fields` for precise data extraction

### Checklist
- [x] Code complete
- [x] Tests passing
- [x] Documentation updated (README.md, CHANGELOG.md)
- [x] No breaking changes
- [x] Ready for review

Relates to: v1.0.1 development plan, Phase 3

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

3. **Proceed to Phase 4 or Phase 5**
   - **Phase 4:** Hotspots Detection (can run in parallel with Phase 5)
   - **Phase 5:** Search Command
   - See `localdocs/phase-4-hotspots-detection.md` or `localdocs/phase-5-search-command.md`

---

## Support Files Reference

- **Implementation Guide:** `localdocs/phase-3-raw-output.md` (this file's source)
- **Overall Plan:** `localdocs/v1.0.1-development-plan.md`
- **Phase 1 Completed:** PR #14 (merged) - Foundation utilities
- **Phase 2 Completed:** PR #15 (merged) - Field selection
- **Current File to Modify:** `src/commands/transcripts/analyze.ts`
- **CLI Registration:** `src/index.ts`

---

## Questions or Issues?

If you encounter any issues:

1. **Verify Phase 1 & 2 utilities are working:**
   ```bash
   npm test
   # Should show 46 tests passing
   ```

2. **Check the existing analyze command structure:**
   - Review `src/commands/transcripts/analyze.ts` (current implementation)
   - Review `src/commands/transcripts/get.ts` (simpler example without enrichment)

3. **Consult the planning docs:**
   - `localdocs/phase-3-raw-output.md` - Detailed requirements
   - `localdocs/v1.0.1-development-plan.md` - Big picture context

4. **Test with real API:**
   - Ensure you have `RETELL_API_KEY` set in environment
   - Use a real call ID from `retell transcripts list`

---

## Key Implementation Notes

### Why Early Return?
The early return pattern (`if (options.raw) { ... return; }`) is used to:
1. Keep the code simple and readable
2. Avoid nested conditionals
3. Clearly separate raw mode from enriched mode logic
4. Make it easy to add more modes in the future (e.g., `--compact`, `--verbose`)

### Why Still Support --fields with --raw?
Combining `--raw` and `--fields` provides maximum flexibility:
- Users can get the raw schema structure they need
- AND reduce token usage by filtering to specific fields
- Example: `--raw --fields call_id,transcript_object` gives you exactly those raw fields

This combination is powerful for AI workflows that need both schema accuracy and token efficiency.

---

## Ready to Start?

```bash
# 1. Checkout new branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/phase-3-raw-output

# 2. Verify tests pass
npm test

# 3. Start implementing!
# Open src/commands/transcripts/analyze.ts and begin adding --raw option

# Good luck! 🚀
```

---

## Estimated Time Breakdown

- **Implementation:** 30 minutes (straightforward code changes)
- **Testing:** 20 minutes (manual testing with real API)
- **Documentation:** 20 minutes (README, CHANGELOG updates)
- **Review & QA:** 10 minutes (double-check all requirements)

**Total:** ~1.5 hours for a complete, well-tested implementation

This is a simple phase but provides significant value for debugging and API schema alignment use cases!
