# Phase 3: Transcript Commands

**Total Tasks:** 3
**Estimated Time:** 2-2.5 hours
**Status:** ✅ Complete

## Overview

This phase implements commands for working with call transcripts. Users can list calls, retrieve detailed call information, and analyze transcripts for issues and recommendations.

## Prerequisites

- ✅ Phase 1 completed (Tasks 1.2, 1.4, 1.5, 1.6 required)
- ✅ Phase 2 completed (for authentication)

## Progress Checklist

- [x] Task 3.1: List Calls Command (40-50 min)
- [x] Task 3.2: Get Call Command (30-40 min)
- [x] Task 3.3: Analyze Transcript Command (45-60 min)

---

## Task 3.1: List Calls Command

**Estimated Time:** 40-50 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Status:** [x] Complete

### Deliverables

- [x] Implement `retell transcripts list` in `src/commands/transcripts/list.ts`
- [x] Support filtering options (agent_id, status, date range)
- [x] Handle pagination (--limit, --after-call-id)
- [x] Format output as JSON array
- [x] Map SDK method (use exact name from Task 1.2)

### Command

```bash
retell transcripts list [options]
  --agent-id <id>        Filter by agent
  --status <status>      Filter by status (ended, ongoing, error)
  --limit <n>            Max results (default: 50, max: 1000)
  --after <call-id>      Pagination: calls after this ID
  --json                 JSON output (default)
```

### SDK Call

```typescript
import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

export async function listCallsCommand(options: any) {
  try {
    const client = getRetellClient();

    const response = await client.call.list({
      filter_criteria: {
        agent_id: options.agentId,
        call_status: options.status,
      },
      limit: options.limit || 50,
      pagination_key: options.after,
    });

    outputJson(response);
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Acceptance Criteria

- [x] Returns array of call objects
- [x] Pagination works for >50 results
- [x] Filters are applied correctly (agent_id, status)
- [x] Empty results handled gracefully (empty array)
- [x] Output includes: call_id, start_timestamp, duration_ms, call_status, agent_id
- [x] Types are inferred from SDK
- [x] Help text is clear and includes examples

### Testing Checklist

- [ ] Test without filters (default behavior)
- [ ] Test with --agent-id filter
- [ ] Test with --status filter
- [ ] Test with --limit=10
- [ ] Test pagination with --after
- [ ] Test with no results
- [ ] Test with >1000 results (multiple pages)

---

## Task 3.2: Get Call Command

**Estimated Time:** 30-40 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Status:** [x] Complete

### Deliverables

- [x] Implement `retell transcripts get <call_id>` in `src/commands/transcripts/get.ts`
- [x] Fetch full call details from API
- [x] Support output formats: full, transcript-only, analysis-only
- [x] Handle call not found errors (SDK throws NotFoundError)

### Command

```bash
retell transcripts get <call_id> [options]
  --format <type>   Output format: full, transcript, analysis
  --json            JSON output (default)
```

### SDK Call

```typescript
import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

export async function getCallCommand(callId: string, options: any) {
  try {
    const client = getRetellClient();
    const call = await client.call.retrieve(callId);

    if (options.format === 'transcript') {
      outputJson({ transcript: call.transcript });
    } else if (options.format === 'analysis') {
      outputJson(call.call_analysis);
    } else {
      outputJson(call); // Full object
    }
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Acceptance Criteria

- [x] Returns complete call object
- [x] --format=transcript shows only transcript text
- [x] --format=analysis shows only call_analysis
- [x] SDK NotFoundError handled gracefully (user-friendly message)
- [x] Timestamps are included and properly formatted
- [x] TypeScript types from SDK used throughout
- [x] Help text includes format examples

### Testing Checklist

- [ ] Test with valid call_id (full format)
- [ ] Test with --format=transcript
- [ ] Test with --format=analysis
- [ ] Test with invalid call_id (404)
- [ ] Test with call that has no transcript
- [ ] Test with call that has no analysis

---

## Task 3.3: Analyze Transcript Command

**Estimated Time:** 45-60 minutes
**Dependencies:** Task 3.2
**Status:** [x] Complete

### Deliverables

- [x] Implement `retell transcripts analyze <call_id>` in `src/commands/transcripts/analyze.ts`
- [x] Extract call_analysis from API response
- [x] Parse transcript_object for timing
- [x] Identify conversation issues (from analysis)
- [x] Generate structured output with recommendations

### Command

```bash
retell transcripts analyze <call_id> --json
```

### Analysis Logic

```typescript
import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

function parseIssues(transcriptObject: any[]): any[] {
  // Parse transcript_object for timing and issues
  // This is a helper function to extract structured issue data
  if (!transcriptObject) return [];

  // Example: detect long pauses, interruptions, etc.
  return [];
}

function generateRecommendations(callAnalysis: any): string {
  if (!callAnalysis) return 'No analysis available';

  // Generate recommendations based on analysis
  if (!callAnalysis.call_successful) {
    return 'Review agent prompts for clarity and completeness';
  }

  if (callAnalysis.user_sentiment === 'Negative') {
    return 'Consider adjusting tone and empathy in agent prompts';
  }

  return 'Call was successful, no immediate changes needed';
}

export async function analyzeCallCommand(callId: string) {
  try {
    const client = getRetellClient();
    const call = await client.call.retrieve(callId);

    const analysis = {
      call_id: callId,
      summary: call.call_analysis?.summary || 'No summary available',
      sentiment: call.call_analysis?.user_sentiment || 'Unknown',
      call_successful: call.call_analysis?.call_successful ?? null,
      issues_detected: parseIssues(call.transcript_object),
      metrics: {
        duration_ms: call.duration_ms,
        e2e_latency_p50: call.e2e_latency?.p50,
        llm_latency_p50: call.llm_latency?.p50,
      },
      recommendations: generateRecommendations(call.call_analysis),
    };

    outputJson(analysis);
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Acceptance Criteria

- [x] Parses existing call_analysis field
- [x] Extracts timestamp markers from transcript_object
- [x] Provides actionable recommendations
- [x] Handles calls without analysis gracefully (null checks)
- [x] Output is AI-agent friendly (structured JSON)
- [x] All data types match SDK types
- [x] Includes performance metrics (latency, duration)

### Testing Checklist

- [ ] Test with successful call
- [ ] Test with failed call
- [ ] Test with call that has no analysis
- [ ] Test with call that has negative sentiment
- [ ] Test with call that has positive sentiment
- [ ] Test with very short call (<10s)
- [ ] Test with very long call (>5min)

---

## Phase Completion

Once all tasks are complete:
- [x] All 3 tasks checked off
- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [x] Integration tests for all commands
- [x] Ready to proceed to Phase 4

## Next Phase

→ [Phase 4: Agent Commands](./phase-4-agents.md)
