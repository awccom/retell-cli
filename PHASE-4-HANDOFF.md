# Phase 4: Hotspots Detection - Task Handoff

## Context

Phase 1 (Foundation & Utilities), Phase 2 (Field Selection), and Phase 3 (Raw Output Mode) have been successfully completed and merged into the `develop` branch.

✅ **Completed Phases:**
- **Phase 1:** Foundation utilities (`filterFields()`, `generateDiff()`, prototype pollution protection)
- **Phase 2:** Field selection added to 5 commands (transcripts: list, get, analyze; agents: list, info)
- **Phase 3:** Raw output mode (`--raw` flag) for transcripts analyze command

**Current State:**
- 46 unit tests passing
- `--fields` option working across all transcript and agent commands
- `--raw` flag working for transcripts analyze command
- Token reduction of 50-90% achieved with field selection
- All features backward compatible

---

## Phase 4 Objective

Add `--hotspots-only` flag to the `transcripts analyze` command to identify conversation issues using Retell API metrics. This enables:
- **Rapid Troubleshooting:** Quickly identify problem areas in failed calls
- **Prompt Iteration:** See exactly where agent responses failed
- **Performance Monitoring:** Track latency issues across calls
- **AI Agent Workflows:** Feed hotspots directly into prompt refinement loop

**Duration:** 2 days
**Dependencies:** Phase 1 ✅ (requires type definitions)

---

## Setup Instructions

### 1. Checkout New Branch from Develop

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Verify Phase 3 is merged
git log --oneline -3
# Should show: Phase 3: Raw Output Mode merge commit

# Create new feature branch for Phase 4
git checkout -b feature/phase-4-hotspots-detection

# Verify the branch
git branch --show-current
```

### 2. Verify Phase 1-3 Are Available

```bash
# Run tests to ensure utilities are working
npm test

# Expected: 46 tests passing
# - 31 tests for filterFields()
# - 15 tests for generateDiff()

# Build to verify everything compiles
npm run build
# Expected: dist/index.js  ~33kb
```

### 3. Review Documentation

Read the following files to understand the implementation requirements:
- `localdocs/phase-4-hotspots-detection.md` - Detailed implementation guide
- `localdocs/v1.0.1-development-plan.md` - Overall project roadmap
- `src/commands/transcripts/analyze.ts` - The file you'll be modifying

---

## Research Phase (IMPORTANT - Do This First!)

Before implementing, you **MUST** research the Retell API response structure to understand what metrics are available.

### Research Tasks:

1. **Examine Real API Responses**
   - Use `retell transcripts analyze <call_id> --raw` to see the full API response
   - Test with multiple calls (normal, problematic, short, long)
   - Document the structure of available data

2. **Document Available Metrics**
   - Performance metrics: `latency` object structure (e2e, llm, tts)
   - Transcript structure: `transcript_object` array format
   - Timestamps: Format and availability in transcript turns
   - Interruption data: Check for interruption markers or metadata
   - Sentiment data: Check `call_analysis.user_sentiment` or similar fields
   - Any other relevant fields for issue detection

3. **Identify What's Available vs What Requires Calculation**
   - What metrics come directly from API?
   - What needs to be calculated (e.g., timestamp gaps for silences)?
   - What detection logic is feasible with available data?

4. **Create Reference Document**
   Create `localdocs/retell-api-metrics-reference.md` with your findings:
   ```markdown
   # Retell API Metrics Reference for Hotspot Detection

   ## API Response Structure

   ### Latency Metrics
   - Field: `latency.e2e.p50`, `latency.e2e.p90`
   - Format: number (milliseconds)
   - Example: `{"e2e": {"p50": 800, "p90": 1200}, ...}`

   ### Transcript Object
   - Field: `transcript_object`
   - Format: array of turns
   - Example: `[{role: "user", content: "...", timestamp: 1234567890, ...}]`
   - Available fields per turn: [document all fields you find]

   ### Interruption Data
   - [Document if/where interruption markers exist]

   ### Sentiment Data
   - Field: `call_analysis.user_sentiment`
   - Values: [document possible values]

   ## Detection Strategy

   Based on available data, we can detect:
   1. Latency spikes: [explain approach]
   2. Long silences: [explain approach]
   3. Interruptions: [explain approach if data available]
   4. Sentiment issues: [explain approach if data available]

   ## Thresholds
   - Latency spike: p90 > 2000ms
   - Long silence: gap > 5000ms
   - [Add others as needed]
   ```

---

## Implementation Guide

### Step 1: Define TypeScript Interfaces

**Location:** `src/commands/transcripts/analyze.ts` (add before helper functions)

```typescript
/**
 * Represents a detected issue in a conversation
 */
interface HotspotIssue {
  turn_index: number;        // Position in transcript (-1 for overall metrics)
  timestamp: string;         // Human-readable timestamp (HH:MM:SS or "N/A")
  issue_type: 'latency_spike' | 'interruption' | 'long_silence' | 'sentiment';
  user_utterance?: string;   // User's text at this point
  agent_utterance?: string;  // Agent's text at this point
  metrics?: Record<string, number>;  // Relevant metrics (latency, duration, etc.)
  suggested_prompt_fix?: string;     // Optional: AI-generated fix suggestion
}

/**
 * Configuration for hotspot detection thresholds
 */
interface HotspotConfig {
  latencyThreshold: number;  // ms, default 2000
  silenceThreshold: number;  // ms, default 5000
}
```

### Step 2: Implement Detection Functions

Add these helper functions to `analyze.ts`:

```typescript
/**
 * Detect latency spikes in call performance
 */
function detectLatencySpikes(call: any, config: HotspotConfig): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];

  // Check overall p90 latency metrics
  if (call.latency?.e2e?.p90 && call.latency.e2e.p90 > config.latencyThreshold) {
    hotspots.push({
      turn_index: -1,
      timestamp: 'N/A',
      issue_type: 'latency_spike',
      metrics: {
        latency_p90_e2e: call.latency.e2e.p90,
        latency_p90_llm: call.latency?.llm?.p90 || 0,
        latency_p90_tts: call.latency?.tts?.p90 || 0,
      }
    });
  }

  return hotspots;
}

/**
 * Detect long silences between conversation turns
 */
function detectLongSilences(call: any, config: HotspotConfig): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];

  for (let i = 1; i < transcript.length; i++) {
    const prevTurn = transcript[i - 1];
    const currTurn = transcript[i];

    // Calculate gap based on available timestamp format
    // NOTE: Adjust this based on your API research findings
    const gap = currTurn.timestamp - prevTurn.timestamp;

    if (gap > config.silenceThreshold) {
      hotspots.push({
        turn_index: i,
        timestamp: formatTimestamp(currTurn.timestamp),
        issue_type: 'long_silence',
        user_utterance: prevTurn.role === 'user' ? prevTurn.content : currTurn.content,
        agent_utterance: currTurn.role === 'agent' ? currTurn.content : null,
        metrics: {
          silence_duration_ms: gap
        }
      });
    }
  }

  return hotspots;
}

/**
 * Detect interruptions in the conversation
 * NOTE: Implement based on your API research findings
 */
function detectInterruptions(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];
  const transcript = call.transcript_object || [];

  // TODO: Implement based on available interruption markers
  // This depends on what fields are available in transcript_object
  // Examples of what to look for:
  // - turn.interrupted === true
  // - turn.overlap_detected === true
  // - Quick back-to-back turns from same role

  transcript.forEach((turn, index) => {
    // Example (adjust based on actual API structure):
    if (turn.interrupted || turn.overlap) {
      hotspots.push({
        turn_index: index,
        timestamp: formatTimestamp(turn.timestamp),
        issue_type: 'interruption',
        user_utterance: turn.role === 'user' ? turn.content : transcript[index - 1]?.content,
        agent_utterance: turn.role === 'agent' ? turn.content : null
      });
    }
  });

  return hotspots;
}

/**
 * Detect sentiment issues in the conversation
 * NOTE: Implement based on your API research findings
 */
function detectSentimentIssues(call: any): HotspotIssue[] {
  const hotspots: HotspotIssue[] = [];

  // Check overall sentiment
  if (call.call_analysis?.user_sentiment === 'negative') {
    hotspots.push({
      turn_index: -1,
      timestamp: 'N/A',
      issue_type: 'sentiment',
      metrics: {
        sentiment_score: call.call_analysis?.sentiment_score || 0
      }
    });
  }

  return hotspots;
}

/**
 * Format timestamp to human-readable format (HH:MM:SS)
 */
function formatTimestamp(timestamp: number): string {
  if (!timestamp || timestamp < 0) return 'N/A';

  // Adjust based on timestamp format from API
  // If timestamp is Unix ms: new Date(timestamp)
  // If timestamp is relative ms: convert to MM:SS
  const seconds = Math.floor(timestamp / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

/**
 * Detect all hotspots in a call
 */
function detectAllHotspots(call: any, config: HotspotConfig): HotspotIssue[] {
  const hotspots = [
    ...detectLatencySpikes(call, config),
    ...detectLongSilences(call, config),
    ...detectInterruptions(call),
    ...detectSentimentIssues(call)
  ];

  // Sort by turn_index (overall metrics with -1 go first)
  return hotspots.sort((a, b) => {
    if (a.turn_index === -1) return -1;
    if (b.turn_index === -1) return 1;
    return a.turn_index - b.turn_index;
  });
}
```

### Step 3: Update Options Interface

**Location:** `src/commands/transcripts/analyze.ts`

```typescript
export interface AnalyzeTranscriptOptions {
  fields?: string;
  raw?: boolean;
  hotspotsOnly?: boolean;          // Add this
  latencyThreshold?: number;       // Add this (optional)
  silenceThreshold?: number;       // Add this (optional)
}
```

### Step 4: Add Early Return for Hotspots Mode

**Location:** `src/commands/transcripts/analyze.ts` in `analyzeTranscriptCommand()` function

Add this **after** the raw mode check (around line 97):

```typescript
// If --hotspots-only flag is set, detect and return conversation issues
if (options.hotspotsOnly) {
  const config: HotspotConfig = {
    latencyThreshold: options.latencyThreshold || 2000,
    silenceThreshold: options.silenceThreshold || 5000
  };

  const hotspots = detectAllHotspots(call, config);

  const result = {
    call_id: callId,
    hotspots: hotspots
  };

  const output = options.fields
    ? filterFields(result, options.fields.split(',').map(f => f.trim()))
    : result;

  outputJson(output);
  return;
}
```

### Step 5: Update CLI Command Registration

**Location:** `src/index.ts`

Find the `analyze` command registration and update it:

```typescript
transcripts
  .command('analyze <call_id>')
  .description('Analyze a call transcript with performance metrics and insights')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,performance,analysis.summary)')
  .option('--raw', 'Return unmodified API response instead of enriched analysis')
  .option('--hotspots-only', 'Return only conversation hotspots/issues for troubleshooting')
  .option('--latency-threshold <ms>', 'Latency threshold in ms for hotspot detection (default: 2000)', '2000')
  .option('--silence-threshold <ms>', 'Silence threshold in ms for hotspot detection (default: 5000)', '5000')
  .addHelpText('after', `
Examples:
  $ retell transcripts analyze call_abc123
  $ retell transcripts analyze call_abc123 --fields call_id,performance
  $ retell transcripts analyze call_abc123 --raw
  $ retell transcripts analyze call_abc123 --raw --fields call_id,transcript_object
  $ retell transcripts analyze call_abc123 --hotspots-only
  $ retell transcripts analyze call_abc123 --hotspots-only --latency-threshold 1500
  $ retell transcripts analyze call_abc123 | jq '.performance.latency_p50_ms'
  `)
  .action(async (callId, options) => {
    await analyzeTranscriptCommand(callId, {
      fields: options.fields,
      raw: options.raw,
      hotspotsOnly: options.hotspotsOnly,
      latencyThreshold: options.latencyThreshold ? parseInt(options.latencyThreshold) : undefined,
      silenceThreshold: options.silenceThreshold ? parseInt(options.silenceThreshold) : undefined,
    });
  });
```

---

## Complete Implementation Checklist

- [ ] **Research Phase Complete**
  - [ ] Examined real API responses with `--raw` flag
  - [ ] Created `localdocs/retell-api-metrics-reference.md`
  - [ ] Documented available metrics and detection strategy

- [ ] **Type Definitions**
  - [ ] Added `HotspotIssue` interface
  - [ ] Added `HotspotConfig` interface
  - [ ] Updated `AnalyzeTranscriptOptions` interface

- [ ] **Detection Functions**
  - [ ] Implemented `detectLatencySpikes()`
  - [ ] Implemented `detectLongSilences()`
  - [ ] Implemented `detectInterruptions()` (based on available data)
  - [ ] Implemented `detectSentimentIssues()` (based on available data)
  - [ ] Implemented `formatTimestamp()`
  - [ ] Implemented `detectAllHotspots()`

- [ ] **Command Implementation**
  - [ ] Added early return logic for `--hotspots-only` mode
  - [ ] Supports `--fields` with hotspots output
  - [ ] Supports configurable thresholds

- [ ] **CLI Registration**
  - [ ] Updated command with `--hotspots-only` option
  - [ ] Updated command with threshold options
  - [ ] Added examples to help text

- [ ] **Documentation**
  - [ ] Updated README.md with "Hotspot Detection" section
  - [ ] Updated CHANGELOG.md with Phase 4 additions

---

## Testing Requirements

### Manual Testing (Critical)

For each test case, use real Retell API call IDs.

#### Test 1: Hotspots Mode Returns Issues
```bash
retell transcripts analyze <call_id_with_issues> --hotspots-only
```
**Expected:**
- Returns `{call_id: "...", hotspots: [...]}`
- Hotspots array contains detected issues
- Each issue has correct structure (turn_index, timestamp, issue_type, etc.)

#### Test 2: No Hotspots Detected
```bash
retell transcripts analyze <perfect_call_id> --hotspots-only
```
**Expected:**
- Returns `{call_id: "...", hotspots: []}`
- Empty array, not null or undefined

#### Test 3: Latency Spike Detection
```bash
retell transcripts analyze <high_latency_call> --hotspots-only
```
**Expected:**
- Contains hotspot with `issue_type: 'latency_spike'`
- Has metrics object with latency values
- turn_index is -1 (overall metric)

#### Test 4: Long Silence Detection
```bash
retell transcripts analyze <call_with_pauses> --hotspots-only
```
**Expected:**
- Contains hotspot with `issue_type: 'long_silence'`
- Has silence_duration_ms in metrics
- Includes user_utterance and agent_utterance
- Correct turn_index

#### Test 5: Custom Thresholds
```bash
retell transcripts analyze <call_id> --hotspots-only --latency-threshold 1500 --silence-threshold 3000
```
**Expected:**
- Uses custom thresholds for detection
- May detect more/fewer issues than defaults

#### Test 6: Hotspots with Fields
```bash
retell transcripts analyze <call_id> --hotspots-only --fields hotspots
```
**Expected:**
- Returns only the hotspots array
- No call_id or other fields

#### Test 7: Default Behavior Unchanged
```bash
retell transcripts analyze <call_id>
```
**Expected:**
- Enriched analysis output (Phase 2 behavior)
- No hotspots-only output

#### Test 8: Help Text
```bash
retell transcripts analyze --help
```
**Expected:**
- Shows `--hotspots-only` option
- Shows threshold options
- Includes examples

---

## Expected Output Examples

### Example 1: Hotspots Detected
```bash
$ retell transcripts analyze call_abc123 --hotspots-only
```
```json
{
  "call_id": "call_abc123",
  "hotspots": [
    {
      "turn_index": -1,
      "timestamp": "N/A",
      "issue_type": "latency_spike",
      "metrics": {
        "latency_p90_e2e": 2450,
        "latency_p90_llm": 1800,
        "latency_p90_tts": 450
      }
    },
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
    }
  ]
}
```

### Example 2: No Hotspots
```bash
$ retell transcripts analyze call_xyz789 --hotspots-only
```
```json
{
  "call_id": "call_xyz789",
  "hotspots": []
}
```

### Example 3: With Fields Filter
```bash
$ retell transcripts analyze call_abc123 --hotspots-only --fields hotspots
```
```json
[
  {
    "turn_index": 5,
    "timestamp": "00:42",
    "issue_type": "long_silence",
    "metrics": {
      "silence_duration_ms": 6200
    }
  }
]
```

---

## Documentation Updates

### Update README.md

**Location:** Add new section after "Raw Output Mode" (around line 320)

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
retell transcripts analyze abc123 --hotspots-only --silence-threshold 3000
\`\`\`

**Detected issues:**
- **Latency spikes** - When p90 latency exceeds threshold (default: 2000ms)
- **Long silences** - Gaps between turns exceeding threshold (default: 5000ms)
- **Interruptions** - Overlapping speech or conversation flow issues
- **Sentiment** - Negative sentiment indicators (if available in API)

**Use cases:**
- Rapid troubleshooting of failed calls
- Prompt iteration and refinement
- Performance monitoring across calls
- AI agent workflow optimization

**Note:** The `--hotspots-only` flag works seamlessly with `--fields` for token efficiency.
```

---

### Update CHANGELOG.md

**Location:** Add to `CHANGELOG.md` after Phase 3 section

```markdown
### Added - Phase 4: Hotspot Detection

#### Hotspot Detection Flag (`--hotspots-only`)
- Added `--hotspots-only` option to `transcripts analyze` command:
  - `retell transcripts analyze <call_id> --hotspots-only`

**Features:**
- Detects conversation issues using Retell API metrics
- Returns structured array of hotspots with turn indices and timestamps
- Configurable thresholds for latency and silence detection
- Works seamlessly with `--fields` for token efficiency
- Fully backward compatible

**Detected Issues:**
- Latency spikes (p90 > configurable threshold, default 2000ms)
- Long silences (gaps > configurable threshold, default 5000ms)
- Interruptions (based on API metadata)
- Sentiment issues (negative sentiment indicators)

**Examples:**
\`\`\`bash
# Detect all hotspots
retell transcripts analyze abc123 --hotspots-only

# Custom thresholds
retell transcripts analyze abc123 --hotspots-only --latency-threshold 1500

# Minimal output
retell transcripts analyze abc123 --hotspots-only --fields hotspots
\`\`\`

**Use Cases:**
- Rapid troubleshooting: Identify problem areas in failed calls
- Prompt iteration: See exactly where agent responses failed
- Performance monitoring: Track latency issues across calls
- AI workflows: Feed hotspots into prompt refinement pipelines

#### Documentation
- Added `localdocs/retell-api-metrics-reference.md` - API research findings
- Updated README.md with "Hotspot Detection" section
- Updated CLI help text with examples

#### Testing
- All existing tests still passing (46/46) ✅
- Manual testing completed for all hotspot types
- Edge cases verified (empty transcripts, missing metrics)
- Backward compatibility verified
```

---

## Success Criteria

Before opening a PR, ensure:

- [ ] `--hotspots-only` flag implemented in `src/commands/transcripts/analyze.ts`
- [ ] Returns structured hotspots array with correct format
- [ ] Detects latency spikes, long silences, and other available issues
- [ ] Empty array returned when no hotspots found (not null/undefined)
- [ ] Works correctly with `--fields` (hotspots response can be filtered)
- [ ] Configurable thresholds working (`--latency-threshold`, `--silence-threshold`)
- [ ] Backward compatible: no flag = enriched output (current behavior)
- [ ] Help text updated with examples
- [ ] README.md updated with "Hotspot Detection" section
- [ ] CHANGELOG.md updated with Phase 4 additions
- [ ] `localdocs/retell-api-metrics-reference.md` created with research findings
- [ ] All existing tests still pass (`npm test` → 46 tests passing)
- [ ] Build successful (`npm run build`)
- [ ] Manual testing completed for all test cases above

---

## When Phase 4 is Complete

### 1. Run Tests
```bash
npm test
# Ensure all 46 existing tests still pass
```

### 2. Build Project
```bash
npm run build
# Verify successful build
```

### 3. Test Manually
Use a real Retell API key to test:
- Default behavior (no flags)
- Hotspots mode (`--hotspots-only`)
- Custom thresholds
- Hotspots with fields
- Error handling (invalid call ID)

### 4. Commit Changes
```bash
# Stage all changes
git add .

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
feat(phase-4): add --hotspots-only flag for conversation issue detection

Implements hotspot detection for transcripts analyze command:
- Detects latency spikes (p90 > configurable threshold)
- Detects long silences (gaps > configurable threshold)
- Detects interruptions (based on API metadata)
- Detects sentiment issues (negative indicators)
- Returns structured hotspots array with turn indices and timestamps
- Configurable thresholds via --latency-threshold and --silence-threshold
- Works seamlessly with --fields for token efficiency
- Backward compatible (no breaking changes)

Features:
- Rapid troubleshooting of failed calls
- Prompt iteration and refinement support
- Performance monitoring across calls
- AI workflow optimization

Research:
- Created retell-api-metrics-reference.md with API findings
- Documented available metrics and detection strategy
- Defined thresholds based on real-world testing

Tests:
- All existing tests passing (46/46)
- Manual testing completed for all hotspot types
- Edge cases verified (empty transcripts, missing metrics)
- Backward compatibility verified

Updates:
- README.md with "Hotspot Detection" section
- CHANGELOG.md with Phase 4 additions
- Help text includes --hotspots-only examples

Relates to: v1.0.1 Phase 4

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 5. Push Branch
```bash
git push -u origin feature/phase-4-hotspots-detection
```

### 6. Open Pull Request to Develop
```bash
gh pr create --title "Phase 4: Hotspot Detection" --base develop --body "$(cat <<'EOF'
## Phase 4: Hotspot Detection

Adds `--hotspots-only` flag to `transcripts analyze` command for identifying conversation issues using Retell API metrics.

### Changes
- ✅ Added `--hotspots-only` option to `transcripts analyze` command
- ✅ Detects latency spikes, long silences, interruptions, and sentiment issues
- ✅ Returns structured hotspots array with turn indices and timestamps
- ✅ Configurable thresholds via `--latency-threshold` and `--silence-threshold`
- ✅ Works seamlessly with `--fields` for token efficiency
- ✅ Backward compatible (no breaking changes)
- ✅ Documentation updated (README, CHANGELOG)
- ✅ API research documented in retell-api-metrics-reference.md

### Features
- **Latency Spike Detection:** Identifies when p90 latency exceeds threshold
- **Long Silence Detection:** Finds gaps between turns exceeding threshold
- **Interruption Detection:** Detects overlapping speech or flow issues
- **Sentiment Detection:** Identifies negative sentiment indicators

### Testing
- [x] All existing tests passing (46/46)
- [x] Manual testing completed for all hotspot types
- [x] Empty hotspots array returned when no issues found
- [x] Default behavior unchanged (backward compatible)
- [x] Works correctly with `--fields` flag
- [x] Custom thresholds working correctly
- [x] Error handling verified
- [x] Build successful

### Examples
```bash
# Detect all hotspots
retell transcripts analyze abc123 --hotspots-only

# Custom thresholds
retell transcripts analyze abc123 --hotspots-only --latency-threshold 1500 --silence-threshold 3000

# Minimal output with field selection
retell transcripts analyze abc123 --hotspots-only --fields hotspots

# Default enriched output (backward compatible)
retell transcripts analyze abc123
```

### Use Cases
1. **Rapid Troubleshooting:** Quickly identify problem areas in failed calls
2. **Prompt Iteration:** See exactly where agent responses failed
3. **Performance Monitoring:** Track latency issues across calls
4. **AI Workflows:** Feed hotspots into prompt refinement pipelines

### Checklist
- [x] Code complete
- [x] Tests passing
- [x] Documentation updated (README.md, CHANGELOG.md)
- [x] API research documented
- [x] No breaking changes
- [x] Ready for review

Relates to: v1.0.1 development plan, Phase 4

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

3. **Proceed to Phase 5**
   - **Phase 5:** Search Command
   - See `localdocs/phase-5-search-command.md`

---

## Support Files Reference

- **Implementation Guide:** `localdocs/phase-4-hotspots-detection.md`
- **Overall Plan:** `localdocs/v1.0.1-development-plan.md`
- **API Research:** `localdocs/retell-api-metrics-reference.md` (you will create this)
- **Current File to Modify:** `src/commands/transcripts/analyze.ts`
- **CLI Registration:** `src/index.ts`
- **Phase 1 Utilities:** `src/services/output-formatter.ts` (filterFields)

---

## Questions or Issues?

If you encounter any issues:

1. **Verify Phase 1-3 utilities are working:**
   ```bash
   npm test
   # Should show 46 tests passing
   ```

2. **Check existing analyze command structure:**
   - Review `src/commands/transcripts/analyze.ts` (current implementation)
   - Review existing detection patterns

3. **Consult the planning docs:**
   - `localdocs/phase-4-hotspots-detection.md` - Detailed requirements
   - `localdocs/v1.0.1-development-plan.md` - Big picture context

4. **Test with real API:**
   - Ensure you have `RETELL_API_KEY` set in environment
   - Use `--raw` flag to examine API response structure
   - Document findings in retell-api-metrics-reference.md

---

## Key Implementation Notes

### Why Research Phase First?

The research phase is **critical** because:
1. We need to understand what metrics are actually available in the API
2. Different Retell API versions might have different fields
3. Detection logic must be based on real data, not assumptions
4. Thresholds should be validated against real-world calls

**DO NOT SKIP THIS STEP!**

### Why Configurable Thresholds?

Different use cases have different requirements:
- Production monitoring might use stricter thresholds (1000ms)
- Development testing might use looser thresholds (3000ms)
- Different languages/regions might have different latency expectations

### Detection Priority

Focus on detection in this order:
1. **Latency spikes** - Always available in API, easy to detect
2. **Long silences** - Requires timestamp calculation, should be available
3. **Interruptions** - Depends on API providing interruption markers
4. **Sentiment** - Depends on API providing sentiment data

If interruption or sentiment data isn't available, that's OK - document it and skip those detections.

---

## Estimated Time Breakdown

- **Research Phase:** 2-3 hours (API exploration, documentation)
- **Implementation:** 3-4 hours (detection functions, CLI integration)
- **Testing:** 2-3 hours (manual testing with real API)
- **Documentation:** 1-2 hours (README, CHANGELOG updates)
- **Review & QA:** 1 hour (double-check all requirements)

**Total:** ~10-13 hours (1-2 days for a complete, well-tested implementation)

---

## Ready to Start?

```bash
# 1. Checkout new branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/phase-4-hotspots-detection

# 2. Verify tests pass
npm test

# 3. Start research phase!
# Use --raw flag to examine API responses
retell transcripts analyze <call_id> --raw

# 4. Create your research document
# Document findings in localdocs/retell-api-metrics-reference.md

# Good luck! 🚀
```

This phase provides significant value for debugging and prompt iteration workflows!
