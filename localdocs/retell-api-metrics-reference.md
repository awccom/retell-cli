# Retell API Metrics Reference for Hotspot Detection

## Research Overview

This document captures the Retell API response structure relevant to hotspot detection, based on:
1. Official Retell API documentation (docs.retellai.com)
2. Existing implementation in `src/commands/transcripts/analyze.ts`
3. Phase 3 raw output testing capabilities

**Last Updated:** 2025-11-16

---

## API Response Structure

### Latency Metrics

**Field:** `latency` object
**Format:** Nested object with subcategories and percentile distributions

**Available Subcategories:**
- `e2e` - End-to-end latency (user silence to agent speech start)
- `llm` - LLM processing time (issue of LLM call to first speakable chunk)
- `tts` - Text-to-speech processing time
- `llm_websocket_network_rtt` - Network roundtrip between servers
- `knowledge_base` - Knowledge retrieval latency (conditional, only if KB used)
- `s2s` - Speech-to-speech model response time (conditional)

**Metrics per Subcategory:**
- `p50` - 50th percentile (median) in milliseconds
- `p90` - 90th percentile in milliseconds
- `p95` - 95th percentile in milliseconds
- `p99` - 99th percentile in milliseconds
- `min` - Minimum latency value
- `max` - Maximum latency value
- `num` - Count of data points tracked
- `values` - Complete array of all latency measurements

**Example Structure:**
```json
{
  "latency": {
    "e2e": {
      "p50": 800,
      "p90": 1200,
      "p95": 1500,
      "p99": 2000,
      "min": 500,
      "max": 2500,
      "num": 45,
      "values": [800, 850, 900, ...]
    },
    "llm": {
      "p50": 300,
      "p90": 600,
      ...
    },
    "tts": {
      "p50": 200,
      "p90": 400,
      ...
    }
  }
}
```

---

### Transcript Object

**Field:** `transcript_object`
**Format:** Array of Utterance objects

**Utterance Structure:**
- `role` - `"agent"`, `"user"`, or `"transfer_target"`
- `content` - Transcribed speech text (string)
- `words` - Array of word-level objects with detailed timing

**Word-Level Timing Structure:**
- `word` - Individual word text
- `start` - Start time in **seconds** (relative audio time from call start)
- `end` - End time in **seconds** (relative audio time from call start)

**Example Structure:**
```json
{
  "transcript_object": [
    {
      "role": "user",
      "content": "Hello, I need help with my account",
      "words": [
        {"word": "Hello", "start": 0.5, "end": 0.8},
        {"word": "I", "start": 1.2, "end": 1.25},
        {"word": "need", "start": 1.3, "end": 1.5},
        {"word": "help", "start": 1.55, "end": 1.8},
        ...
      ]
    },
    {
      "role": "agent",
      "content": "Of course! I'd be happy to help.",
      "words": [
        {"word": "Of", "start": 2.5, "end": 2.65},
        {"word": "course", "start": 2.7, "end": 3.0},
        ...
      ]
    }
  ]
}
```

**Important Notes:**
- Word timestamps are in **seconds** (not milliseconds)
- Timestamps are **relative to call start** (not absolute Unix timestamps)
- To calculate silence gaps: Compare `end` time of previous turn's last word with `start` time of next turn's first word

---

### Call Analysis Data

**Field:** `call_analysis` object
**Format:** Nested object with multiple analysis fields

**Available Fields:**
- `call_summary` - String narrative overview of conversation
- `user_sentiment` - Enum: `"Positive"`, `"Negative"`, `"Neutral"`, or `"Unknown"`
- `call_successful` - Boolean indicating task completion
- `in_voicemail` - Boolean indicating voicemail interaction
- `custom_analysis_data` - Agent-specific extracted fields (optional)

**Example Structure:**
```json
{
  "call_analysis": {
    "call_summary": "Customer inquired about account balance and recent transactions",
    "user_sentiment": "Positive",
    "call_successful": true,
    "in_voicemail": false,
    "custom_analysis_data": {
      "resolved_issue": true,
      "topic": "account_inquiry"
    }
  }
}
```

---

### Interruption Data

**Status:** **NOT EXPLICITLY PROVIDED by API**

**Detection Strategy:**
Since the API doesn't provide explicit interruption markers (like `interrupted: true` or `overlap: true`), we need to **infer** interruptions from available data:

**Method 1: Word-Level Timestamp Overlap**
- Check if word timestamps from consecutive turns overlap
- Example: If user's last word ends at 5.8s and agent's first word starts at 5.6s, there's overlap
- **Limitation:** Requires parsing `words` array, which may be computationally expensive

**Method 2: Quick Back-to-Back Same-Role Turns**
- If two consecutive turns have the same `role`, one was likely interrupted
- Example: `[{role: "agent", ...}, {role: "agent", ...}]` suggests first turn was cut off
- **Limitation:** May produce false positives for multi-turn responses

**Method 3: Very Short Turn Duration**
- If a turn's word array spans < 1 second, it may have been interrupted
- Calculate: `last_word.end - first_word.start < 1.0`
- **Limitation:** Some legitimate short responses ("Yes", "Okay") would trigger this

**Recommendation for Phase 4:**
- **Skip interruption detection initially** if word-level parsing is too complex
- Focus on latency and silence detection (more reliable)
- Add interruption detection in a future phase if needed

---

### Call Metadata

**Other Useful Fields:**
- `call_status` - `"registered"`, `"not_connected"`, `"ongoing"`, `"ended"`, or `"error"`
- `duration_ms` - Total call duration in milliseconds
- `start_timestamp` - Milliseconds since epoch (Unix timestamp)
- `end_timestamp` - Milliseconds since epoch (Unix timestamp)
- `disconnection_reason` - 30+ enumerated reasons (useful for error detection)

---

## Detection Strategy

Based on available data, Phase 4 can reliably detect the following hotspots:

### 1. Latency Spikes ✅ (High Confidence)

**Detection Logic:**
- Check `call.latency.e2e.p90 > threshold`
- Default threshold: `2000ms`
- Configurable via `--latency-threshold` flag

**Example Implementation:**
```typescript
if (call.latency?.e2e?.p90 && call.latency.e2e.p90 > config.latencyThreshold) {
  hotspots.push({
    turn_index: -1,  // Overall metric, not tied to specific turn
    timestamp: 'N/A',
    issue_type: 'latency_spike',
    metrics: {
      latency_p90_e2e: call.latency.e2e.p90,
      latency_p90_llm: call.latency?.llm?.p90 || 0,
      latency_p90_tts: call.latency?.tts?.p90 || 0,
    }
  });
}
```

**Why p90?**
- More representative than p50 (median) for detecting issues
- Catches performance degradation affecting 10% of responses
- Industry standard for SLA monitoring

---

### 2. Long Silences ✅ (High Confidence)

**Detection Logic:**
- Calculate gap between consecutive turns using word-level timestamps
- Gap = `current_turn.words[0].start - previous_turn.words[last].end`
- Default threshold: `5000ms` (5 seconds)
- Configurable via `--silence-threshold` flag

**Important Conversion:**
- Word timestamps are in **seconds**, threshold is in **milliseconds**
- Must convert: `gap_seconds * 1000 > silenceThreshold`

**Example Implementation:**
```typescript
function detectLongSilences(call: any, config: HotspotConfig): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];

  for (let i = 1; i < transcript.length; i++) {
    const prevTurn = transcript[i - 1];
    const currTurn = transcript[i];

    // Get last word of previous turn and first word of current turn
    const prevWords = prevTurn.words || [];
    const currWords = currTurn.words || [];

    if (prevWords.length === 0 || currWords.length === 0) continue;

    const prevEnd = prevWords[prevWords.length - 1].end;  // in seconds
    const currStart = currWords[0].start;  // in seconds
    const gapMs = (currStart - prevEnd) * 1000;  // convert to ms

    if (gapMs > config.silenceThreshold) {
      hotspots.push({
        turn_index: i,
        timestamp: formatTimestamp(currStart),
        issue_type: 'long_silence',
        user_utterance: prevTurn.role === 'user' ? prevTurn.content : currTurn.content,
        agent_utterance: currTurn.role === 'agent' ? currTurn.content : prevTurn.content,
        metrics: {
          silence_duration_ms: gapMs
        }
      });
    }
  }

  return hotspots;
}
```

---

### 3. Sentiment Issues ✅ (Medium Confidence)

**Detection Logic:**
- Check `call.call_analysis.user_sentiment === 'Negative'`
- Only flag negative sentiment (positive/neutral/unknown are not issues)

**Example Implementation:**
```typescript
function detectSentimentIssues(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];

  if (call.call_analysis?.user_sentiment === 'Negative') {
    hotspots.push({
      turn_index: -1,  // Overall call metric
      timestamp: 'N/A',
      issue_type: 'sentiment',
      metrics: {
        sentiment: call.call_analysis.user_sentiment
      }
    });
  }

  return hotspots;
}
```

**Limitation:**
- Sentiment is call-level, not turn-level
- Cannot pinpoint exact moment sentiment turned negative
- Still useful for filtering problematic calls

---

### 4. Interruptions ⚠️ (Low Confidence - Optional)

**Status:** **DEFER TO FUTURE PHASE**

**Reasoning:**
- No explicit interruption markers in API
- Word-level overlap detection adds complexity
- Silence and latency detection cover 80% of conversation issues
- Can be added in Phase 5+ if needed

**If implementing:**
```typescript
function detectInterruptions(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];

  // Simple heuristic: Same role appearing consecutively
  for (let i = 1; i < transcript.length; i++) {
    if (transcript[i].role === transcript[i - 1].role && transcript[i].role === 'agent') {
      // Agent speaking twice in a row suggests interruption/restart
      hotspots.push({
        turn_index: i,
        timestamp: formatTimestamp(transcript[i].words?.[0]?.start || 0),
        issue_type: 'interruption',
        agent_utterance: transcript[i].content
      });
    }
  }

  return hotspots;
}
```

---

## Thresholds and Defaults

### Latency Spike Detection
- **Default:** `2000ms` (2 seconds)
- **Rationale:**
  - < 1000ms: Feels instant to users
  - 1000-2000ms: Noticeable but acceptable
  - > 2000ms: Frustrating, breaks conversation flow
- **Recommended Range:** `1500-3000ms` depending on use case

### Long Silence Detection
- **Default:** `5000ms` (5 seconds)
- **Rationale:**
  - < 3000ms: Normal thinking/processing time
  - 3000-5000ms: Awkward but not critical
  - > 5000ms: Dead air, user likely confused
- **Recommended Range:** `3000-8000ms` depending on use case

### Sentiment Detection
- **Default:** Flag only `"Negative"` sentiment
- **Rationale:**
  - Positive/Neutral indicate successful interactions
  - Unknown is inconclusive
  - Negative suggests user frustration or dissatisfaction

---

## Timestamp Formatting

**Input:** Seconds (float) from word-level timestamps
**Output:** Human-readable `HH:MM:SS` or `MM:SS` format

**Implementation:**
```typescript
function formatTimestamp(seconds: number): string {
  if (!seconds || seconds < 0) return 'N/A';

  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const hrs = Math.floor(mins / 60);
  const displayMins = mins % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

**Examples:**
- `45.5` seconds → `"00:45"`
- `125.8` seconds → `"02:05"`
- `3725.3` seconds → `"01:02:05"`

---

## Testing Recommendations

### Manual Testing with Real API

Use the Phase 3 `--raw` flag to examine real call data:

```bash
# Examine a normal call
retell transcripts analyze call_abc123 --raw

# Focus on specific fields
retell transcripts analyze call_abc123 --raw --fields latency,transcript_object,call_analysis

# Test with problematic calls (high latency, negative sentiment)
retell transcripts analyze call_with_issues --raw
```

**What to verify:**
1. ✅ `latency.e2e.p90` exists and is a number
2. ✅ `transcript_object` is an array with `role`, `content`, `words`
3. ✅ `words[].start` and `words[].end` are in seconds (not ms)
4. ✅ `call_analysis.user_sentiment` is one of: Positive, Negative, Neutral, Unknown
5. ⚠️ Check if any calls have interruption markers (unlikely based on docs)

---

## Phase 4 Implementation Scope

### ✅ Implement (High Priority)
1. **Latency Spike Detection** - Reliable, uses `latency.e2e.p90`
2. **Long Silence Detection** - Reliable, uses word-level timestamps
3. **Sentiment Detection** - Simple, uses `call_analysis.user_sentiment`

### ⏸️ Defer (Future Phase)
1. **Interruption Detection** - Complex, no explicit API support, lower value

### 🎯 Success Criteria
- Detects 3 out of 4 hotspot types reliably
- Returns empty array when no issues found (not null/undefined)
- Works seamlessly with `--fields` for token efficiency
- Configurable thresholds via CLI flags
- Backward compatible (no breaking changes)

---

## References

- **Retell API Docs:** https://docs.retellai.com/api-references/list-calls
- **Phase 4 Handoff:** `PHASE-4-HANDOFF.md`
- **Current Implementation:** `src/commands/transcripts/analyze.ts`
- **Phase 1 Utilities:** `src/services/output-formatter.ts` (filterFields)
