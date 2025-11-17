# Phase 3: Raw Output Mode

**Duration:** 1 day
**Dependencies:** Phase 1 (optional: Phase 2 for --fields compatibility)

---

## Objective

Add `--raw` flag to return unmodified API responses, useful for debugging and when tools expect the official Retell API schema.

---

## Primary Command

**File:** `src/commands/transcripts/analyze.ts`

This command currently enriches/restructures the API response. The `--raw` flag will bypass this enrichment.

---

## Implementation

### Current Behavior (Enriched)

```typescript
// analyze.ts currently does:
const call = await client.call.retrieve(callId);
const enrichedAnalysis = {
  metadata: extractMetadata(call),
  transcript: extractTranscriptTurns(call),
  analysis: generateAnalysis(call),
  performance: extractPerformance(call),
  cost: extractCost(call)
};
outputJson(enrichedAnalysis);
```

### New Behavior (with --raw)

```typescript
.option('--raw', 'Return unmodified API response instead of enriched analysis')

// In handler:
const call = await client.call.retrieve(callId);

if (options.raw) {
  // Return API response directly
  const output = options.fields
    ? filterFields(call, options.fields.split(',').map(f => f.trim()))
    : call;
  outputJson(output);
  return;
}

// Otherwise, continue with enrichment...
const enrichedAnalysis = { ... };
```

---

## Task Breakdown

### 1. Modify analyze.ts

- [ ] Add `--raw` boolean option
- [ ] Add conditional logic to skip enrichment
- [ ] Ensure --raw works with --fields
- [ ] Update help text

### 2. Consider Extension to Other Commands (Optional)

Evaluate if `--raw` would be beneficial for:
- `transcripts get` (probably not needed, already returns raw)
- `agents info` (already returns raw)
- `agents list` (currently applies formatting - could add --raw)

**Decision:** Start with `analyze` only, extend later if needed.

---

## Deliverables

- [ ] `src/commands/transcripts/analyze.ts` with --raw support
- [ ] Updated help text
- [ ] Works correctly with --fields

---

## Testing Requirements

### Functional Tests

- [ ] **Raw mode returns unmodified API response**
  ```bash
  retell transcripts analyze <id> --raw
  # Expected: Exact API response from client.call.retrieve()
  ```

- [ ] **Default behavior unchanged** (no --raw)
  ```bash
  retell transcripts analyze <id>
  # Expected: Enriched analysis (current behavior)
  ```

- [ ] **Raw works with fields**
  ```bash
  retell transcripts analyze <id> --raw --fields call_id,transcript
  # Expected: Raw API response, filtered to specified fields
  ```

- [ ] **Raw response matches Retell API schema**
  - Compare output to Retell API documentation
  - Verify no transformation or enrichment applied

---

### Error Handling

- [ ] **Error when API returns error**
  ```bash
  retell transcripts analyze invalid_id --raw
  # Expected: Proper error handling via handleSdkError()
  ```

- [ ] **Network timeout**
  - Test with slow connection
  - Verify timeout error handled gracefully

---

## Example Usage

### Enriched Analysis (default):
```bash
$ retell transcripts analyze abc123
{
  "metadata": {
    "call_id": "abc123",
    "call_status": "ended",
    "duration_seconds": 120,
    ...
  },
  "transcript": [
    {"role": "user", "message": "...", "word_count": 5},
    {"role": "agent", "message": "...", "word_count": 12}
  ],
  "analysis": {
    "summary": "...",
    "sentiment": "positive",
    ...
  },
  ...
}
```

### Raw API Response:
```bash
$ retell transcripts analyze abc123 --raw
{
  "call_id": "abc123",
  "from_number": "+1234567890",
  "to_number": "+0987654321",
  "direction": "inbound",
  "call_status": "ended",
  "start_timestamp": 1700000000000,
  "end_timestamp": 1700000120000,
  "transcript": "...",
  "transcript_object": [...],
  "recording_url": "...",
  ...
  // Exact Retell API structure
}
```

### Raw + Fields (minimal output):
```bash
$ retell transcripts analyze abc123 --raw --fields call_id,transcript_object
{
  "call_id": "abc123",
  "transcript_object": [...]
}
```

---

## Use Cases

1. **Debugging:** Compare raw API response to enriched output
2. **API Schema Alignment:** Tools expecting official Retell schema
3. **Future-proofing:** Access new API fields before CLI enriches them
4. **Token Efficiency:** Combine with --fields for precise data extraction

---

## Documentation Updates

Add to README.md:

```markdown
### Raw Output Mode

Get the unmodified API response instead of enriched analysis:

\`\`\`bash
# Raw API response (useful for debugging)
retell transcripts analyze abc123 --raw

# Combine with field selection for minimal output
retell transcripts analyze abc123 --raw --fields call_id,transcript_object
\`\`\`

**When to use:**
- Debugging issues with API responses
- When tools expect the official Retell API schema
- Accessing new API fields before CLI enrichment support
```

---

## Success Criteria

- [ ] --raw flag implemented on analyze command
- [ ] Returns exact API response (no transformation)
- [ ] Works correctly with --fields
- [ ] Backward compatible (no --raw = enriched output)
- [ ] All tests passing
- [ ] Documentation updated

---

## Future Enhancements

Consider for future versions:
- Add --raw to `agents list` to get unformatted agent objects
- Global --raw flag affecting all commands
- --format option (raw, enriched, compact) for more control

---

## Next Phase

After completion, proceed to **Phase 4: Hotspots Detection** or work in parallel with Phase 2.
