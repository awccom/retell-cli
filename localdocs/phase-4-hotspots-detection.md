# Phase 4: Hotspots Detection

**Duration:** 2 days
**Dependencies:** Phase 1 (requires type definitions)

---

## Objective

Add `--hotspots-only` view to identify conversation issues using Retell API metrics, enabling focused troubleshooting and prompt iteration.

---

## Command to Modify

**File:** `src/commands/transcripts/analyze.ts`

---

## Hotspot Detection Strategy

Use metrics available in Retell API response:

1. **Latency Spikes**
   - Source: `latency_p50`, `latency_p90` from performance metrics
   - Threshold: p90 > 2000ms (configurable)

2. **Interruptions**
   - Source: Transcript metadata or conversation flow
   - Look for overlapping speech or interruption markers

3. **Long Silences**
   - Source: Timestamp gaps in transcript
   - Threshold: > 5 seconds between turns

4. **User Sentiment** (if available)
   - Source: Sentiment markers in API response
   - Look for negative sentiment indicators

---

## Research Phase (Day 1 Morning)

Before implementing, research the Retell API response structure:

### Tasks:
1. Examine real API responses from `client.call.retrieve()`
2. Document available metrics:
   - Performance metrics (latency, etc.)
   - Transcript structure (timestamps, turns)
   - Interruption data
   - Sentiment data (if exists)
3. Identify what's available vs what requires calculation
4. Define detection thresholds

### Create Reference Document:
`localdocs/retell-api-metrics-reference.md` with findings

---

## Implementation

### 1. Add Hotspot Detection Functions

Create helper functions in `analyze.ts`:

```typescript
interface HotspotIssue {
  turn_index: number;
  timestamp: string;
  issue_type: 'latency_spike' | 'interruption' | 'long_silence' | 'sentiment';
  user_utterance?: string;
  agent_utterance?: string;
  metrics?: Record<string, number>;
  suggested_prompt_fix?: string;
}

function detectLatencySpikes(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];

  // Check p90 latency for e2e, llm, tts
  if (call.latency_p90_e2e > 2000) {
    hotspots.push({
      turn_index: -1, // Overall call metric
      timestamp: 'N/A',
      issue_type: 'latency_spike',
      metrics: {
        latency_p90_e2e: call.latency_p90_e2e
      }
    });
  }

  // Check per-turn latency if available
  // ...

  return hotspots;
}

function detectInterruptions(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];

  // Look for interruption markers in transcript
  transcript.forEach((turn, index) => {
    if (turn.interrupted || turn.overlap) {
      hotspots.push({
        turn_index: index,
        timestamp: formatTimestamp(turn.timestamp),
        issue_type: 'interruption',
        user_utterance: turn.role === 'user' ? turn.content : transcript[index-1]?.content,
        agent_utterance: turn.role === 'agent' ? turn.content : null
      });
    }
  });

  return hotspots;
}

function detectLongSilences(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];
  const SILENCE_THRESHOLD = 5000; // 5 seconds in ms

  for (let i = 1; i < transcript.length; i++) {
    const gap = transcript[i].timestamp - transcript[i-1].timestamp;
    if (gap > SILENCE_THRESHOLD) {
      hotspots.push({
        turn_index: i,
        timestamp: formatTimestamp(transcript[i].timestamp),
        issue_type: 'long_silence',
        metrics: { silence_duration_ms: gap },
        user_utterance: transcript[i-1]?.content,
        agent_utterance: transcript[i]?.content
      });
    }
  }

  return hotspots;
}

function detectAllHotspots(call: any): HotspotIssue[] {
  return [
    ...detectLatencySpikes(call),
    ...detectInterruptions(call),
    ...detectLongSilences(call)
  ].sort((a, b) => a.turn_index - b.turn_index);
}
```

---

### 2. Add --hotspots-only Flag

```typescript
.option('--hotspots-only', 'Return only conversation hotspots/issues')

// In handler:
const call = await client.call.retrieve(callId);

if (options.hotspotsOnly) {
  const hotspots = detectAllHotspots(call);

  const result = {
    call_id: call.call_id,
    hotspots: hotspots
  };

  const output = options.fields
    ? filterFields(result, options.fields.split(',').map(f => f.trim()))
    : result;

  outputJson(output);
  return;
}

// Continue with normal analysis...
```

---

### 3. Configurable Thresholds (Optional)

Consider adding threshold options:

```typescript
.option('--latency-threshold <ms>', 'Latency threshold in ms (default: 2000)', '2000')
.option('--silence-threshold <ms>', 'Silence threshold in ms (default: 5000)', '5000')
```

---

## Deliverables

- [ ] `localdocs/retell-api-metrics-reference.md` - API research findings
- [ ] Hotspot detection functions in `analyze.ts`
- [ ] `--hotspots-only` flag implementation
- [ ] Updated help text with examples
- [ ] Type definitions for `HotspotIssue`

---

## Testing Requirements

### Detection Tests

- [ ] **Detect latency spikes** (p90 > 2000ms)
  ```bash
  retell transcripts analyze <call-with-high-latency> --hotspots-only
  # Expected: Hotspot with type='latency_spike' and metrics
  ```

- [ ] **Detect interruptions**
  - Test with call containing interruptions
  - Verify turn_index, utterances captured

- [ ] **Detect long silences** (> 5s gaps)
  - Test with call containing long pauses
  - Verify silence duration calculated correctly

- [ ] **Return empty hotspots** if none found
  ```bash
  retell transcripts analyze <perfect-call> --hotspots-only
  # Expected: {"call_id": "...", "hotspots": []}
  ```

---

### Integration Tests

- [ ] **Hotspots include correct turn_index and timestamps**
  - Verify timestamps are human-readable (HH:MM:SS format)
  - Verify turn_index matches transcript position

- [ ] **Works with --fields**
  ```bash
  retell transcripts analyze <id> --hotspots-only --fields call_id,hotspots
  # Expected: Only call_id and hotspots array
  ```

- [ ] **Works with --raw** (should this be allowed?)
  - Decision: Probably mutually exclusive
  - Either show error or prioritize one flag

---

### Edge Cases

- [ ] **Missing metrics** (call without latency data)
  - Gracefully skip latency detection
  - Don't fail entire command

- [ ] **Empty transcript**
  - Return empty hotspots array
  - No errors

- [ ] **Various call scenarios:**
  - Normal call (no issues)
  - Problematic call (multiple issues)
  - Very short call
  - Very long call

---

## Example Output

### Hotspots Detected:
```bash
$ retell transcripts analyze abc123 --hotspots-only
{
  "call_id": "abc123",
  "hotspots": [
    {
      "turn_index": 5,
      "timestamp": "00:42",
      "issue_type": "long_silence",
      "user_utterance": "Can you help me with my account?",
      "agent_utterance": "Of course! Let me look that up for you.",
      "metrics": {
        "silence_duration_ms": 6200
      }
    },
    {
      "turn_index": 12,
      "timestamp": "01:38",
      "issue_type": "interruption",
      "user_utterance": "I need to speak to—",
      "agent_utterance": "I can help you with that right now."
    },
    {
      "turn_index": -1,
      "timestamp": "N/A",
      "issue_type": "latency_spike",
      "metrics": {
        "latency_p90_e2e": 2450,
        "latency_p90_llm": 1800
      }
    }
  ]
}
```

### No Hotspots:
```bash
$ retell transcripts analyze abc123 --hotspots-only
{
  "call_id": "abc123",
  "hotspots": []
}
```

---

## Use Cases

1. **Rapid Troubleshooting:** Quickly identify problem areas in failed calls
2. **Prompt Iteration:** See exactly where agent responses failed
3. **Performance Monitoring:** Track latency issues across calls
4. **AI Agent Workflows:** Feed hotspots directly into prompt refinement loop

---

## Future Enhancements

### Suggested Prompt Fixes (Phase 2 of hotspots)

Add AI-powered suggestions:

```typescript
{
  "turn_index": 12,
  "issue_type": "interruption",
  "suggested_prompt_fix": "Add instruction: 'Wait for user to finish speaking before responding.'"
}
```

Could use:
- Simple rule-based suggestions
- LLM analysis (Claude/GPT) for context-aware fixes
- Pattern matching against known issues

**Decision:** Save for v1.1.0 or later

---

## Documentation Updates

Add to README.md:

```markdown
### Hotspot Detection

Identify conversation issues for focused troubleshooting:

\`\`\`bash
# Find all issues in a call
retell transcripts analyze abc123 --hotspots-only

# Combine with field selection
retell transcripts analyze abc123 --hotspots-only --fields hotspots

# Set custom thresholds
retell transcripts analyze abc123 --hotspots-only --latency-threshold 1500
\`\`\`

**Detected issues:**
- Latency spikes (p90 > 2000ms)
- Interruptions
- Long silences (> 5s)
- Negative sentiment (if available)
```

---

## Success Criteria

- [ ] Detects latency spikes, interruptions, long silences
- [ ] Returns structured hotspots array
- [ ] Empty array when no issues found
- [ ] Works with --fields for token efficiency
- [ ] All detection logic is accurate
- [ ] Tests cover normal, problematic, and edge cases
- [ ] Documentation updated

---

## Next Phase

After completion, can proceed to **Phase 5: Search Command** in parallel with other phases.
