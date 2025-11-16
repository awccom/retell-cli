# Phase 8: Future Enhancements (Optional)

**Total Tasks:** 3
**Estimated Time:** 3-4.5 hours
**Status:** Not Started

## Overview

⚠️ **This phase is optional.** These are enhancement ideas that can be implemented after the core CLI is complete and published. They add nice-to-have features that improve usability but aren't required for the initial release.

## Prerequisites

- ✅ Phases 1-7 completed and published to NPM

## Progress Checklist

- [ ] Task 8.1: Advanced Analysis Features (90-120 min)
- [ ] Task 8.2: Batch Operations (60-90 min)
- [ ] Task 8.3: Configuration Enhancements (30-45 min)

---

## Task 8.1: Advanced Analysis Features

**Estimated Time:** 90-120 minutes
**Dependencies:** None (uses existing infrastructure)
**Status:** [ ] Not Started

### Overview

Enhance the `transcripts analyze` command with AI-powered analysis using Claude API. This provides deeper insights beyond what Retell's built-in analysis offers.

### Deliverables

- [ ] Implement AI-based transcript analysis (Claude API)
- [ ] Identify conversation patterns
- [ ] Suggest specific prompt improvements
- [ ] Compare transcripts across calls

### Implementation

#### Add Claude API Integration

```typescript
// src/services/claude-analyzer.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeTranscriptWithClaude(
  transcript: string,
  currentPrompt: string
): Promise<{
  issues: string[];
  patterns: string[];
  recommendations: string[];
  suggestedPromptChanges: string;
}> {
  const prompt = `Analyze this voice AI conversation transcript and the agent's prompt.

Current Agent Prompt:
${currentPrompt}

Conversation Transcript:
${transcript}

Please analyze:
1. What went well
2. Where the conversation went off track
3. Patterns in user behavior
4. Specific improvements to the agent prompt

Respond in JSON format.`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse response and return structured data
  const content = message.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }

  throw new Error('Unexpected response format');
}
```

#### Enhanced Analyze Command

```bash
retell transcripts analyze <call_id> [options]
  --ai               Use AI-powered analysis (requires ANTHROPIC_API_KEY)
  --compare <id>     Compare with another call
  --pattern          Identify conversation patterns
```

#### Pattern Detection

```typescript
// Detect common patterns across multiple transcripts
export function detectPatterns(transcripts: any[]): {
  commonIssues: string[];
  successPatterns: string[];
  userIntentions: string[];
} {
  // Analyze multiple transcripts to find patterns
  // E.g., "Users often ask for X but agent doesn't handle it"

  return {
    commonIssues: [],
    successPatterns: [],
    userIntentions: [],
  };
}
```

### Acceptance Criteria

- [x] Claude API integration works
- [x] AI analysis provides actionable insights
- [x] Pattern detection identifies trends
- [x] Comparison feature works
- [x] Results are JSON-formatted
- [x] Graceful fallback if ANTHROPIC_API_KEY not set

### New Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.17.0"
  }
}
```

---

## Task 8.2: Batch Operations

**Estimated Time:** 60-90 minutes
**Dependencies:** None
**Status:** [ ] Not Started

### Overview

Add commands for bulk operations on transcripts and agents. Useful for analyzing many calls at once or updating multiple agents.

### Deliverables

- [ ] Bulk download transcripts
- [ ] Batch analyze multiple calls
- [ ] Export to CSV/Excel

### Implementation

#### Bulk Download

```bash
retell transcripts download [options]
  --agent-id <id>    Download all calls for this agent
  --status <status>  Filter by status
  --since <date>     Calls since this date
  --format <format>  Output format (json, csv, xlsx)
  --output <dir>     Output directory
```

```typescript
// src/commands/transcripts/download.ts
export async function downloadTranscripts(options: any) {
  const client = getRetellClient();
  const allCalls = [];

  let paginationKey = null;

  // Fetch all pages
  do {
    const response = await client.call.list({
      filter_criteria: {
        agent_id: options.agentId,
        call_status: options.status,
      },
      limit: 1000,
      pagination_key: paginationKey,
    });

    allCalls.push(...response);
    paginationKey = response.length === 1000 ? response[response.length - 1].call_id : null;
  } while (paginationKey);

  // Export to specified format
  if (options.format === 'csv') {
    exportToCsv(allCalls, options.output);
  } else if (options.format === 'xlsx') {
    exportToExcel(allCalls, options.output);
  } else {
    exportToJson(allCalls, options.output);
  }
}
```

#### Batch Analysis

```bash
retell transcripts batch-analyze [options]
  --agent-id <id>    Analyze all calls for this agent
  --output <file>    Save aggregated results
```

```typescript
export async function batchAnalyze(options: any) {
  const calls = await getAllCalls(options.agentId);

  const analyses = await Promise.all(
    calls.map(call => analyzeCall(call.call_id))
  );

  // Aggregate results
  const aggregated = {
    total_calls: calls.length,
    success_rate: calculateSuccessRate(analyses),
    common_issues: findCommonIssues(analyses),
    recommendations: generateBulkRecommendations(analyses),
  };

  if (options.output) {
    writeFileSync(options.output, JSON.stringify(aggregated, null, 2));
  } else {
    outputJson(aggregated);
  }
}
```

#### CSV Export

```typescript
import { stringify } from 'csv-stringify/sync';

function exportToCsv(calls: any[], outputPath: string) {
  const records = calls.map(call => ({
    call_id: call.call_id,
    start_time: call.start_timestamp,
    duration_s: call.duration_ms / 1000,
    status: call.call_status,
    sentiment: call.call_analysis?.user_sentiment,
    successful: call.call_analysis?.call_successful,
  }));

  const csv = stringify(records, { header: true });
  writeFileSync(outputPath, csv);
}
```

### Acceptance Criteria

- [x] Can download all calls for an agent
- [x] CSV export works correctly
- [x] Batch analysis aggregates results
- [x] Progress indicators for long operations
- [x] Error handling for partial failures
- [x] Rate limiting respected

### New Dependencies

```json
{
  "dependencies": {
    "csv-stringify": "^6.4.0",
    "xlsx": "^0.18.0"
  }
}
```

---

## Task 8.3: Configuration Enhancements

**Estimated Time:** 30-45 minutes
**Dependencies:** None
**Status:** [ ] Not Started

### Overview

Improve configuration management with global config support, project-level overrides, and optional API key encryption.

### Deliverables

- [ ] Global config in `~/.retell/config.json`
- [ ] Project-level overrides
- [ ] Config encryption for API keys (optional)

### Implementation

#### Global Config

```typescript
// src/services/config.ts
import { homedir } from 'os';
import { join } from 'path';

const GLOBAL_CONFIG_PATH = join(homedir(), '.retell', 'config.json');
const LOCAL_CONFIG_PATH = './.retellrc.json';

export function getConfig(): Config {
  // Priority:
  // 1. Environment variable
  if (process.env.RETELL_API_KEY) {
    return {
      apiKey: process.env.RETELL_API_KEY,
      defaultFormat: 'json',
    };
  }

  // 2. Local config
  if (existsSync(LOCAL_CONFIG_PATH)) {
    return loadConfig(LOCAL_CONFIG_PATH);
  }

  // 3. Global config
  if (existsSync(GLOBAL_CONFIG_PATH)) {
    return loadConfig(GLOBAL_CONFIG_PATH);
  }

  throw new Error('No API key found. Run `retell login` or set RETELL_API_KEY.');
}
```

#### Login with Scope

```bash
retell login [options]
  --global    Save to global config (~/.retell/config.json)
  --local     Save to local config (./.retellrc.json) [default]
```

#### Config Management Commands

```bash
retell config list                # Show current config
retell config set <key> <value>   # Set a config value
retell config get <key>           # Get a config value
retell config delete <key>        # Delete a config value
```

#### Optional: Encryption (Advanced)

```typescript
import keytar from 'keytar';

const SERVICE_NAME = 'retell-cli';
const ACCOUNT_NAME = 'api-key';

export async function saveApiKeySecurely(apiKey: string) {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
}

export async function getApiKeySecurely(): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
}
```

**Note:** Encryption requires native dependencies and may not work on all platforms. Only implement if there's strong user demand.

### Acceptance Criteria

- [x] Global config works
- [x] Local config overrides global
- [x] Env var overrides both
- [x] Config commands work
- [x] Migration from old format (if needed)
- [x] Encryption is optional and platform-aware

### New Dependencies (Optional)

```json
{
  "optionalDependencies": {
    "keytar": "^7.9.0"
  }
}
```

---

## Phase Completion

Once desired tasks are complete:
- [ ] Selected tasks implemented
- [ ] Tests written for new features
- [ ] Documentation updated
- [ ] Version bumped (minor or patch)
- [ ] Published to NPM

## Versioning Strategy

- **1.1.0:** Add Task 8.1 (AI analysis)
- **1.2.0:** Add Task 8.2 (batch operations)
- **1.3.0:** Add Task 8.3 (config enhancements)

Or release all together as **2.0.0** with breaking changes notification.

---

**Remember:** These enhancements are optional. The CLI is fully functional and publishable after Phase 7!
