# Retell AI CLI - Detailed Planning & Task Breakdown

## Project Overview

**Goal:** Build a cross-shell, AI-agent-friendly CLI tool for interacting with Retell AI's API to analyze call transcripts and manage agent prompts.

**Scope:** Transcripts → Analysis → Prompt Refinement → Prompt Update

**Distribution:** Global NPM package (`retell-cli`)

---

## Architecture Decisions

### 1. Tech Stack
- **Runtime:** Node.js 18+ (LTS)
- **Language:** TypeScript 4.5+
- **SDK:** `retell-sdk` (official, includes TypeScript types)
- **CLI Framework:** `commander` (mature, stable)
- **Build Tool:** `esbuild` (fast, simple)
- **Testing:** `vitest` (fast, modern)
- **Validation:** `zod` (runtime type validation for user inputs)

### 2. Dependencies

```json
{
  "dependencies": {
    "retell-sdk": "^latest",
    "commander": "^11.0.0",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "esbuild": "^0.19.0",
    "vitest": "^1.0.0",
    "chalk": "^5.0.0",
    "ora": "^7.0.0"
  }
}
```

**Note:** `chalk` and `ora` are optional for better UX but not required for core functionality.

### 3. Project Structure

```
retell-cli/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── commands/
│   │   ├── login.ts                # Auth setup
│   │   ├── transcripts/
│   │   │   ├── list.ts             # List calls
│   │   │   ├── get.ts              # Get single call
│   │   │   └── analyze.ts          # Analyze transcript
│   │   ├── agents/
│   │   │   ├── list.ts             # List agents
│   │   │   └── info.ts             # Get agent details
│   │   ├── prompts/
│   │   │   ├── pull.ts             # Smart prompt puller
│   │   │   └── update.ts           # Smart prompt updater
│   │   └── publish.ts              # Publish agent
│   ├── services/
│   │   ├── config.ts               # Config file management
│   │   ├── retell-client.ts        # SDK wrapper/singleton
│   │   ├── prompt-resolver.ts      # Multi-type prompt handler
│   │   └── output-formatter.ts     # JSON/text formatting
│   ├── types/
│   │   ├── cli.ts                  # CLI-specific types
│   │   ├── config.ts               # Config types
│   │   └── prompts.ts              # Prompt structure types
│   └── utils/
│       ├── errors.ts               # Error handling
│       └── validators.ts           # Input validation
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   └── detailed-plan.md            # This document
├── package.json
├── tsconfig.json
├── README.md
└── .npmignore
```

---

## Detailed Task Breakdown

### **Phase 1: Foundation & Setup**

#### Task 1.1: Project Initialization
**Estimated Time:** 15-20 minutes
**Dependencies:** None
**Deliverables:**
- [ ] Initialize git repository
- [ ] Create `package.json` with proper metadata
- [ ] Set up TypeScript configuration (`tsconfig.json`)
- [ ] Configure esbuild for compilation
- [ ] Add `.gitignore` and `.npmignore`
- [ ] Create basic folder structure
- [ ] Install `retell-sdk` and core dependencies

**Package.json bin configuration:**
```json
{
  "name": "retell-cli",
  "version": "0.1.0",
  "bin": {
    "retell": "./dist/index.js"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js",
    "dev": "npm run build -- --watch",
    "test": "vitest"
  }
}
```

**Acceptance Criteria:**
- `npm install` runs without errors
- `npm run build` compiles TypeScript successfully
- Package has proper name, version, description, author
- TypeScript strict mode enabled

---

#### Task 1.2: Investigate retell-sdk API Methods
**Estimated Time:** 30-45 minutes
**Dependencies:** Task 1.1
**Deliverables:**
- [ ] Document available SDK methods (agent, call, llm, flow namespaces)
- [ ] Test SDK client initialization
- [ ] Map SDK methods to CLI commands
- [ ] Document TypeScript types available
- [ ] Create test script to explore API responses

**Investigation Script:**
```typescript
// scripts/explore-sdk.ts
import Retell from 'retell-sdk';

const client = new Retell({ apiKey: process.env.RETELL_API_KEY });

// Test what methods are available
console.log('Agent methods:', Object.keys(client.agent));
console.log('Call methods:', Object.keys(client.call));
// ... explore other namespaces
```

**Key Questions to Answer:**
- What are the exact method names? (e.g., `client.call.list()`, `client.agent.retrieve()`)
- Do pagination helpers exist?
- What do the TypeScript types look like?
- Are there methods for LLM and ConversationFlow?

**Acceptance Criteria:**
- Complete mapping document of SDK methods → CLI commands
- Tested authentication works
- All TypeScript types documented
- Example responses captured for each endpoint

---

#### Task 1.3: Config File Management System
**Estimated Time:** 30-40 minutes
**Dependencies:** Task 1.1
**Deliverables:**
- [ ] Implement `.retellrc.json` read/write in `src/services/config.ts`
- [ ] Support environment variable `RETELL_API_KEY` override
- [ ] Handle missing config gracefully (prompt user)
- [ ] Implement config validation with zod
- [ ] Add security: proper file permissions (0600)

**Config Schema (Zod):**
```typescript
import { z } from 'zod';

export const ConfigSchema = z.object({
  apiKey: z.string().min(1),
  defaultFormat: z.enum(['json', 'text']).default('json'),
});

export type Config = z.infer<typeof ConfigSchema>;
```

**File Format:**
```json
{
  "apiKey": "key_...",
  "defaultFormat": "json"
}
```

**Priority Order:**
1. Environment variable `RETELL_API_KEY`
2. `.retellrc.json` in current directory
3. Prompt user to run `retell login`

**Acceptance Criteria:**
- Config loads from current directory `.retellrc.json`
- Env var `RETELL_API_KEY` takes precedence
- Config file created with restricted permissions (chmod 600)
- Clear error messages when config missing
- Validates API key format before saving
- Unit tests for all config scenarios

---

#### Task 1.4: Retell Client Service (SDK Wrapper)
**Estimated Time:** 25-35 minutes
**Dependencies:** Tasks 1.2, 1.3
**Deliverables:**
- [ ] Create `src/services/retell-client.ts`
- [ ] Implement singleton pattern for Retell client
- [ ] Load API key from config service
- [ ] Wrap SDK errors in user-friendly messages
- [ ] Export typed client instance

**Service Structure:**
```typescript
import Retell from 'retell-sdk';
import { getConfig } from './config';

let clientInstance: Retell | null = null;

export function getRetellClient(): Retell {
  if (!clientInstance) {
    const config = getConfig();
    clientInstance = new Retell({
      apiKey: config.apiKey,
      maxRetries: 2,
      timeout: 60000, // 1 minute
    });
  }
  return clientInstance;
}

export function resetClient() {
  clientInstance = null;
}
```

**Acceptance Criteria:**
- Singleton pattern prevents multiple client instances
- Uses config service for API key
- Handles SDK errors gracefully
- Type-safe exports
- Testable (can reset for tests)

---

#### Task 1.5: CLI Framework & Base Commands
**Estimated Time:** 30 minutes
**Dependencies:** Task 1.1
**Deliverables:**
- [ ] Set up `commander` in `src/index.ts`
- [ ] Implement global `--json` flag
- [ ] Create command structure (subcommands)
- [ ] Add version (`-v`, `--version`)
- [ ] Add help text (`-h`, `--help`)
- [ ] Configure executable permissions in package.json
- [ ] Add shebang to compiled output

**Command Structure:**
```bash
retell [command] [subcommand] [options]
```

**Example Implementation:**
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const program = new Command();

program
  .name('retell')
  .description('Retell AI CLI - Manage transcripts and prompts')
  .version(pkg.version)
  .option('--json', 'Output as JSON (default)', true);

// Add subcommands
program
  .command('login')
  .description('Authenticate with Retell AI');

program
  .command('transcripts')
  .description('Manage call transcripts')
  .addCommand(/* ... */);

program.parse();
```

**Acceptance Criteria:**
- `retell --help` shows all commands
- `retell --version` shows package version
- Subcommands are properly namespaced
- Global flags work across all commands
- Executable works after `npm link`
- Shebang included in build output

---

#### Task 1.6: Output Formatting Service
**Estimated Time:** 20-30 minutes
**Dependencies:** Task 1.1
**Deliverables:**
- [ ] Create `src/services/output-formatter.ts`
- [ ] Implement JSON output formatter
- [ ] Implement error formatter
- [ ] Support `--json` flag override
- [ ] Ensure no mixed output (console.log isolation)

**Service Interface:**
```typescript
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error: Error | string, code?: string): void {
  const errorObj = {
    error: typeof error === 'string' ? error : error.message,
    code: code || 'UNKNOWN_ERROR',
  };
  console.error(JSON.stringify(errorObj, null, 2));
  process.exit(1);
}

export function handleSdkError(error: unknown): never {
  if (error instanceof Retell.APIError) {
    outputError(error.message, error.name);
  }
  outputError('An unexpected error occurred', 'UNKNOWN_ERROR');
}
```

**Acceptance Criteria:**
- JSON output is valid, pretty-printed
- Consistent error format: `{"error": "...", "code": "..."}`
- No mixed output (no console.log leaks)
- Works in piped contexts (`retell ... | jq`)
- Proper exit codes (0 success, 1 error)

---

### **Phase 2: Authentication**

#### Task 2.1: Login Command
**Estimated Time:** 25-35 minutes
**Dependencies:** Tasks 1.3, 1.4, 1.5
**Deliverables:**
- [ ] Implement `retell login` command
- [ ] Interactive API key prompt (use `readline`)
- [ ] Validate API key by testing API call (list agents)
- [ ] Save to `.retellrc.json`
- [ ] Success confirmation message

**Command:**
```bash
retell login
# Prompts: Enter your Retell API key:
# Validates by calling client.agent.list({ limit: 1 })
# Saves to .retellrc.json
```

**Implementation:**
```typescript
import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';

export async function loginCommand() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  const apiKey = await rl.question('Enter your Retell API key: ');
  rl.close();

  // Validate by testing API call
  const testClient = new Retell({ apiKey });
  await testClient.agent.list({ limit: 1 }); // Throws if invalid

  // Save to config
  saveConfig({ apiKey, defaultFormat: 'json' });

  outputJson({ message: 'Successfully authenticated!', configPath: './.retellrc.json' });
}
```

**Acceptance Criteria:**
- Prompts are clear and user-friendly
- Invalid keys show helpful error from SDK
- Valid keys are saved successfully
- Confirmation includes next steps
- Handles overwriting existing config (asks for confirmation)

---

### **Phase 3: Transcript Commands**

#### Task 3.1: List Calls Command
**Estimated Time:** 40-50 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Deliverables:**
- [ ] Implement `retell transcripts list` in `src/commands/transcripts/list.ts`
- [ ] Support filtering options (agent_id, status, date range)
- [ ] Handle pagination (--limit, --after-call-id)
- [ ] Format output as JSON array
- [ ] Map SDK method (determine exact name from Task 1.2)

**Command:**
```bash
retell transcripts list [options]
  --agent-id <id>        Filter by agent
  --status <status>      Filter by status (ended, ongoing, error)
  --limit <n>            Max results (default: 50, max: 1000)
  --after <call-id>      Pagination: calls after this ID
  --json                 JSON output (default)
```

**SDK Call (based on API docs):**
```typescript
const response = await client.call.list({
  filter_criteria: {
    agent_id: options.agentId,
    call_status: options.status,
  },
  limit: options.limit || 50,
  pagination_key: options.after,
});
```

**Acceptance Criteria:**
- Returns array of call objects
- Pagination works for >50 results
- Filters are applied correctly
- Empty results handled gracefully
- Output includes: call_id, start_timestamp, duration_ms, call_status, agent_id
- Types are inferred from SDK

---

#### Task 3.2: Get Call Command
**Estimated Time:** 30-40 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Deliverables:**
- [ ] Implement `retell transcripts get <call_id>`
- [ ] Fetch full call details from API
- [ ] Support output formats: full, transcript-only, analysis-only
- [ ] Handle call not found errors (SDK throws NotFoundError)

**Command:**
```bash
retell transcripts get <call_id> [options]
  --format <type>   Output format: full, transcript, analysis
  --json            JSON output (default)
```

**SDK Call:**
```typescript
const call = await client.call.retrieve(callId);

if (format === 'transcript') {
  outputJson({ transcript: call.transcript });
} else if (format === 'analysis') {
  outputJson(call.call_analysis);
} else {
  outputJson(call); // Full object
}
```

**Acceptance Criteria:**
- Returns complete call object
- --format=transcript shows only transcript text
- --format=analysis shows only call_analysis
- SDK NotFoundError handled gracefully
- Timestamps are formatted clearly
- TypeScript types from SDK used

---

#### Task 3.3: Analyze Transcript Command
**Estimated Time:** 45-60 minutes
**Dependencies:** Task 3.2
**Deliverables:**
- [ ] Implement `retell transcripts analyze <call_id>`
- [ ] Extract call_analysis from API response
- [ ] Parse transcript_object for timing
- [ ] Identify conversation issues (from analysis)
- [ ] Generate structured output with recommendations

**Command:**
```bash
retell transcripts analyze <call_id> --json
```

**Analysis Logic:**
```typescript
const call = await client.call.retrieve(callId);

const analysis = {
  call_id: callId,
  summary: call.call_analysis?.summary,
  sentiment: call.call_analysis?.user_sentiment,
  call_successful: call.call_analysis?.call_successful,
  issues_detected: parseIssues(call.transcript_object),
  metrics: {
    duration_ms: call.duration_ms,
    e2e_latency_p50: call.e2e_latency?.p50,
    llm_latency_p50: call.llm_latency?.p50,
  },
  recommendations: generateRecommendations(call.call_analysis),
};

outputJson(analysis);
```

**Acceptance Criteria:**
- Parses existing call_analysis field
- Extracts timestamp markers from transcript_object
- Provides actionable recommendations
- Handles calls without analysis gracefully (null checks)
- Output is AI-agent friendly
- All data types match SDK types

---

### **Phase 4: Agent Commands**

#### Task 4.1: List Agents Command
**Estimated Time:** 30-40 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Deliverables:**
- [ ] Implement `retell agents list`
- [ ] Support pagination (--limit, --after)
- [ ] Show: agent_id, name, version, is_published, response_engine type
- [ ] Format as JSON array

**Command:**
```bash
retell agents list [options]
  --limit <n>       Max results (default: 100)
  --after <id>      Pagination: agents after this ID
  --json            JSON output (default)
```

**SDK Call:**
```typescript
const response = await client.agent.list({
  limit: options.limit || 100,
  pagination_key: options.after,
});

const formatted = response.map(agent => ({
  agent_id: agent.agent_id,
  agent_name: agent.agent_name,
  version: agent.version,
  is_published: agent.is_published,
  response_engine_type: agent.response_engine.type,
  response_engine_id: agent.response_engine.llm_id || agent.response_engine.conversation_flow_id,
}));

outputJson(formatted);
```

**Acceptance Criteria:**
- Returns array of agents
- Shows response_engine type clearly
- Pagination works correctly
- Indicates published vs draft status
- Uses SDK types throughout

---

#### Task 4.2: Agent Info Command
**Estimated Time:** 30-40 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Deliverables:**
- [ ] Implement `retell agents info <agent_id>`
- [ ] Fetch and display full agent configuration
- [ ] Clearly show response_engine type and ID
- [ ] Display voice settings, language, webhooks

**Command:**
```bash
retell agents info <agent_id> [options]
  --version <n>     Specific version (default: latest)
  --json            JSON output (default)
```

**SDK Call:**
```typescript
const agent = await client.agent.retrieve(agentId, {
  version: options.version,
});

outputJson(agent); // Full agent object with all SDK types
```

**Acceptance Criteria:**
- Shows all agent configuration
- Highlights key fields (name, engine type, voice)
- Includes LLM ID or Flow ID if applicable
- Handles agent not found (SDK NotFoundError)
- All TypeScript types from SDK

---

### **Phase 5: Prompt Management (Complex)**

#### Task 5.1: Prompt Type Resolution Service
**Estimated Time:** 60-90 minutes
**Dependencies:** Task 1.2
**Deliverables:**
- [ ] Create `src/services/prompt-resolver.ts`
- [ ] Implement `resolvePromptSource(agentId)` function
- [ ] Handle three engine types:
  - `retell-llm`: Fetch LLM, extract general_prompt + states
  - `conversation-flow`: Fetch flow, extract global_prompt + nodes
  - `custom-llm`: Return error (not manageable)
- [ ] Define TypeScript types for each prompt structure
- [ ] Add comprehensive error handling
- [ ] Use SDK methods (e.g., `client.llm.retrieve()`, `client.conversationFlow.retrieve()`)

**Function Signature:**
```typescript
type RetellLlmPrompts = {
  llm_id: string;
  version: number;
  general_prompt: string;
  begin_message?: string;
  states?: Array<{
    name: string;
    state_prompt: string;
    edges?: unknown[];
  }>;
};

type FlowPrompts = {
  conversation_flow_id: string;
  version: number;
  global_prompt: string;
  nodes: unknown[]; // Use SDK type
};

type PromptSource =
  | { type: 'retell-llm', llmId: string, prompts: RetellLlmPrompts }
  | { type: 'conversation-flow', flowId: string, prompts: FlowPrompts }
  | { type: 'custom-llm', error: string };

async function resolvePromptSource(agentId: string): Promise<PromptSource> {
  const client = getRetellClient();
  const agent = await client.agent.retrieve(agentId);

  if (agent.response_engine.type === 'retell-llm') {
    const llm = await client.llm.retrieve(agent.response_engine.llm_id);
    return { type: 'retell-llm', llmId: llm.llm_id, prompts: llm };
  }

  if (agent.response_engine.type === 'conversation-flow') {
    const flow = await client.conversationFlow.retrieve(agent.response_engine.conversation_flow_id);
    return { type: 'conversation-flow', flowId: flow.conversation_flow_id, prompts: flow };
  }

  return { type: 'custom-llm', error: 'Custom LLM agents cannot be managed via API' };
}
```

**Note:** Exact method names need to be confirmed in Task 1.2 (might be `client.retellLlm.retrieve()` or similar).

**Acceptance Criteria:**
- Correctly identifies engine type from agent
- Fetches appropriate resource (LLM or Flow)
- Returns structured, type-safe prompt data
- Handles all error cases (not found, auth, network)
- Unit tests for all three engine types
- Uses SDK TypeScript types throughout

---

#### Task 5.2: Prompts Pull Command
**Estimated Time:** 45-60 minutes
**Dependencies:** Task 5.1
**Deliverables:**
- [ ] Implement `retell prompts pull <agent_id>`
- [ ] Use prompt-resolver service
- [ ] Format output based on prompt type
- [ ] Support saving to file (`--output <file>`)

**Command:**
```bash
retell prompts pull <agent_id> [options]
  --output <file>   Save to file
  --json            JSON output (default)
```

**Implementation:**
```typescript
const promptSource = await resolvePromptSource(agentId);

if (promptSource.type === 'custom-llm') {
  outputError(promptSource.error, 'CUSTOM_LLM_ERROR');
}

const output = {
  type: promptSource.type,
  agent_id: agentId,
  ...promptSource.prompts,
};

if (options.output) {
  writeFileSync(options.output, JSON.stringify(output, null, 2));
  outputJson({ message: 'Prompts saved', file: options.output });
} else {
  outputJson(output);
}
```

**Acceptance Criteria:**
- Correctly pulls all prompt types
- --output saves valid JSON file
- Custom LLM shows helpful error message
- Clear indication of prompt type in output
- All SDK types preserved

---

#### Task 5.3: Prompts Update Command
**Estimated Time:** 60-90 minutes
**Dependencies:** Task 5.1, 5.2
**Deliverables:**
- [ ] Implement `retell prompts update <agent_id> --file <file>`
- [ ] Load and validate JSON file with zod
- [ ] Use prompt-resolver to determine type
- [ ] PATCH appropriate endpoint (LLM or Flow) using SDK
- [ ] Support `--publish` flag to auto-publish after update
- [ ] Dry-run mode (`--dry-run`) to validate without updating

**Command:**
```bash
retell prompts update <agent_id> [options]
  --file <path>     JSON file with prompts (required)
  --publish         Publish agent after update
  --dry-run         Validate without updating
  --json            JSON output (default)
```

**Validation Schemas:**
```typescript
const RetellLlmUpdateSchema = z.object({
  type: z.literal('retell-llm'),
  general_prompt: z.string(),
  begin_message: z.string().optional(),
  states: z.array(z.object({
    name: z.string(),
    state_prompt: z.string(),
  })).optional(),
});

const FlowUpdateSchema = z.object({
  type: z.literal('conversation-flow'),
  global_prompt: z.string(),
  nodes: z.array(z.unknown()),
});
```

**Implementation:**
```typescript
const fileContent = JSON.parse(readFileSync(options.file, 'utf-8'));
const promptSource = await resolvePromptSource(agentId);

// Validate type matches
if (fileContent.type !== promptSource.type) {
  outputError(`Type mismatch: agent uses ${promptSource.type}, file contains ${fileContent.type}`);
}

if (options.dryRun) {
  outputJson({ message: 'Dry run: validation passed', changes: fileContent });
  return;
}

// Update using SDK
if (promptSource.type === 'retell-llm') {
  await client.llm.update(promptSource.llmId, {
    general_prompt: fileContent.general_prompt,
    states: fileContent.states,
  });
}

if (options.publish) {
  await client.agent.publish(agentId);
  outputJson({ message: 'Updated and published', agent_id: agentId });
} else {
  outputJson({ message: 'Updated (draft)', agent_id: agentId });
}
```

**Acceptance Criteria:**
- Validates input file structure with zod
- Updates correct resource (LLM or Flow)
- --publish works correctly
- --dry-run shows what would change
- Clear success/error messages
- Handles version conflicts (SDK error handling)
- All SDK types used

---

#### Task 5.4: Publish Agent Command
**Estimated Time:** 20-30 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Deliverables:**
- [ ] Implement `retell agent publish <agent_id>`
- [ ] Call SDK publish method
- [ ] Show confirmation of publish
- [ ] Display new version number

**Command:**
```bash
retell agent publish <agent_id> --json
```

**Implementation:**
```typescript
const result = await client.agent.publish(agentId);

outputJson({
  message: 'Agent published successfully',
  agent_id: agentId,
  new_version: result.version,
  is_published: true,
});
```

**Acceptance Criteria:**
- Successfully publishes agent
- Shows version incremented
- Explains draft vs published concept in output
- Handles errors gracefully (SDK error handling)

---

### **Phase 6: Testing & Quality**

#### Task 6.1: Unit Tests
**Estimated Time:** 60-90 minutes
**Dependencies:** All implementation tasks
**Deliverables:**
- [ ] Test config service (read/write/validation)
- [ ] Test prompt-resolver (mock SDK responses)
- [ ] Test output formatter (JSON/text)
- [ ] Test error handling
- [ ] Mock SDK client for tests (use vitest mock utilities)
- [ ] Achieve >80% code coverage

**Test Structure:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import Retell from 'retell-sdk';

vi.mock('retell-sdk');

describe('prompt-resolver', () => {
  it('should resolve retell-llm prompts', async () => {
    const mockClient = {
      agent: { retrieve: vi.fn().mockResolvedValue({ response_engine: { type: 'retell-llm', llm_id: '123' }})},
      llm: { retrieve: vi.fn().mockResolvedValue({ llm_id: '123', general_prompt: 'test' })},
    };

    // ... test logic
  });
});
```

**Acceptance Criteria:**
- All tests pass with `npm test`
- Tests run in CI/CD
- Mock API responses properly
- No actual API calls in unit tests
- Coverage >80%

---

#### Task 6.2: Integration Tests
**Estimated Time:** 45-60 minutes
**Dependencies:** Task 6.1
**Deliverables:**
- [ ] Test full command flows (login → list → get)
- [ ] Test error scenarios (invalid keys, 404s)
- [ ] Test pagination edge cases
- [ ] Test file I/O (config, prompt files)
- [ ] Optional: Test with real API in separate env

**Acceptance Criteria:**
- E2E flows work correctly
- File operations don't corrupt data
- Errors are user-friendly
- Tests clean up after themselves (temp files, configs)

---

#### Task 6.3: Shell Compatibility Testing
**Estimated Time:** 30-40 minutes
**Dependencies:** All implementation tasks
**Deliverables:**
- [ ] Test in bash (Ubuntu/Debian)
- [ ] Test in fish shell (CachyOS)
- [ ] Test in zsh (macOS)
- [ ] Test with `bash -lc` invocation (AI agent mode)
- [ ] Document any shell-specific quirks

**Test Commands:**
```bash
# bash
bash -c "retell --version"
bash -lc "retell transcripts list --json"

# fish
fish -c "retell --version"

# zsh
zsh -c "retell --version"
```

**Acceptance Criteria:**
- All commands work identically across shells
- No shell-specific errors
- Output is consistent
- Environment variables work in all shells
- Shebang (`#!/usr/bin/env node`) works correctly

---

### **Phase 7: Documentation & Polish**

#### Task 7.1: README Documentation
**Estimated Time:** 45-60 minutes
**Dependencies:** All implementation tasks
**Deliverables:**
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Command reference
- [ ] Example workflows
- [ ] Troubleshooting section
- [ ] AI agent usage guide

**Sections:**
1. **Installation:** `npm install -g retell-cli`
2. **Authentication:** `retell login`
3. **Basic Usage Examples**
4. **Command Reference** (all commands with examples)
5. **JSON Output Schemas** for AI agents
6. **Environment Variables**
7. **Troubleshooting** (common errors)
8. **Contributing Guide**

**AI Agent Section:**
```markdown
## For AI Agents

All commands output JSON by default. Example usage:

\`\`\`bash
retell transcripts list --agent-id abc123 --json
retell transcripts analyze call_xyz --json
retell prompts pull agent_123 --output prompts.json
retell prompts update agent_123 --file updated-prompts.json --publish
\`\`\`

Output is always valid JSON. Errors are returned as:
\`\`\`json
{"error": "...", "code": "ERROR_CODE"}
\`\`\`
```

**Acceptance Criteria:**
- Clear, concise, accurate
- Code examples are tested
- Covers all commands
- AI-friendly formatting
- Includes TypeScript usage examples

---

#### Task 7.2: CLI Help Text Polish
**Estimated Time:** 20-30 minutes
**Dependencies:** All command implementations
**Deliverables:**
- [ ] Review all command help text
- [ ] Ensure consistency in style
- [ ] Add examples to help output
- [ ] Fix typos and grammar

**Commander Help Examples:**
```typescript
program
  .command('transcripts list')
  .description('List all call transcripts')
  .option('--agent-id <id>', 'Filter by agent ID')
  .option('--limit <n>', 'Max results (default: 50, max: 1000)', '50')
  .addHelpText('after', `
Examples:
  $ retell transcripts list
  $ retell transcripts list --agent-id agent_123
  $ retell transcripts list --limit 100 --json
  `);
```

**Acceptance Criteria:**
- `retell <cmd> --help` is helpful
- Examples are accurate
- Consistent formatting across all commands
- No jargon without explanation

---

#### Task 7.3: NPM Package Preparation
**Estimated Time:** 30-45 minutes
**Dependencies:** Tasks 7.1, 7.2
**Deliverables:**
- [ ] Configure package.json for publishing
- [ ] Add `.npmignore` (exclude tests, src, tsconfig)
- [ ] Include only dist/ in package
- [ ] Add repository, bugs, homepage links
- [ ] Choose license (MIT recommended)
- [ ] Add keywords for discoverability
- [ ] Test local install with `npm pack`
- [ ] Ensure shebang in dist/index.js

**package.json fields:**
```json
{
  "name": "retell-cli",
  "version": "1.0.0",
  "description": "Official CLI tool for Retell AI - analyze transcripts and manage agent prompts",
  "bin": {
    "retell": "./dist/index.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "keywords": ["retell", "retell-ai", "ai", "voice", "cli", "transcript", "agent", "llm"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/retell-cli"
  },
  "bugs": "https://github.com/YOUR_USERNAME/retell-cli/issues",
  "homepage": "https://github.com/YOUR_USERNAME/retell-cli#readme",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**.npmignore:**
```
src/
tests/
docs/
tsconfig.json
*.test.ts
.git
.github
```

**Acceptance Criteria:**
- `npm pack` creates valid tarball
- `npm install -g ./retell-cli-1.0.0.tgz` works
- Executable is in PATH after install
- No unnecessary files included (check tarball with `tar -tzf`)
- Shebang present in dist/index.js

---

#### Task 7.4: NPM Publishing
**Estimated Time:** 15-20 minutes
**Dependencies:** Task 7.3
**Deliverables:**
- [ ] Create NPM account (if needed)
- [ ] Run `npm publish --access public`
- [ ] Verify installation: `npm install -g retell-cli`
- [ ] Test published version on clean system
- [ ] Add npm badge to README

**Publishing Steps:**
```bash
npm login
npm publish --access public --dry-run  # Test first
npm publish --access public
```

**README Badge:**
```markdown
[![npm version](https://badge.fury.io/js/retell-cli.svg)](https://www.npmjs.com/package/retell-cli)
```

**Acceptance Criteria:**
- Package available on npmjs.com
- Global install works: `npm i -g retell-cli`
- Command runs: `retell --version`
- README renders correctly on npm
- All links work

---

### **Phase 8: Future Enhancements (Optional)**

#### Task 8.1: Advanced Analysis Features
**Estimated Time:** 90-120 minutes
**Deliverables:**
- [ ] Implement AI-based transcript analysis (Claude API)
- [ ] Identify conversation patterns
- [ ] Suggest specific prompt improvements
- [ ] Compare transcripts across calls

---

#### Task 8.2: Batch Operations
**Estimated Time:** 60-90 minutes
**Deliverables:**
- [ ] Bulk download transcripts
- [ ] Batch analyze multiple calls
- [ ] Export to CSV/Excel

---

#### Task 8.3: Configuration Enhancements
**Estimated Time:** 30-45 minutes
**Deliverables:**
- [ ] Global config in `~/.retell/config.json`
- [ ] Project-level overrides
- [ ] Config encryption for API keys (keytar)

---

## Task Dependency Graph

```
Phase 1 (Foundation)
├── 1.1 Project Init
├── 1.2 SDK Investigation ← 1.1
├── 1.3 Config System ← 1.1
├── 1.4 Retell Client ← 1.2, 1.3
├── 1.5 CLI Framework ← 1.1
└── 1.6 Output Formatter ← 1.1

Phase 2 (Auth)
└── 2.1 Login Command ← 1.3, 1.4, 1.5

Phase 3 (Transcripts)
├── 3.1 List Calls ← 1.2, 1.4, 1.5, 1.6
├── 3.2 Get Call ← 1.2, 1.4, 1.5, 1.6
└── 3.3 Analyze ← 3.2

Phase 4 (Agents)
├── 4.1 List Agents ← 1.2, 1.4, 1.5, 1.6
└── 4.2 Agent Info ← 1.2, 1.4, 1.5, 1.6

Phase 5 (Prompts) - Most Complex
├── 5.1 Prompt Resolver ← 1.2, 1.4
├── 5.2 Pull Command ← 5.1, 1.5, 1.6
├── 5.3 Update Command ← 5.1, 5.2
└── 5.4 Publish Command ← 1.2, 1.4, 1.5, 1.6

Phase 6 (Testing)
├── 6.1 Unit Tests ← All implementation
├── 6.2 Integration Tests ← 6.1
└── 6.3 Shell Tests ← All implementation

Phase 7 (Documentation)
├── 7.1 README ← All implementation
├── 7.2 Help Text ← All commands
├── 7.3 Package Prep ← 7.1, 7.2
└── 7.4 Publish ← 7.3
```

---

## Recommended Implementation Order

1. **Week 1:** Phase 1 (Foundation) - Days 1-3
   - Complete tasks 1.1-1.6
   - **CRITICAL:** Task 1.2 must be completed first to understand SDK API
2. **Week 1:** Phase 2 (Auth) + Start Phase 3 - Days 4-5
   - Task 2.1 (login)
   - Tasks 3.1, 3.2 (list, get calls)
3. **Week 2:** Complete Phase 3-4 - Days 1-3
   - Task 3.3 (analyze)
   - Tasks 4.1, 4.2 (agents)
4. **Week 2:** Phase 5 (Prompts) - Days 4-5
   - Tasks 5.1-5.4 (the complex part)
5. **Week 3:** Phase 6-7 (Testing & Documentation) - Days 1-5
   - All testing
   - Documentation
   - Publishing

---

## Critical Success Factors

1. **SDK First:** Task 1.2 is CRITICAL - must understand SDK API before proceeding
2. **Type Safety:** Use TypeScript strictly, leverage SDK types, no `any`
3. **Error Handling:** SDK provides error classes, use them consistently
4. **Testing:** Write tests alongside implementation, not after
5. **AI-Friendly Output:** JSON by default, stable schema, no surprises
6. **Shell Compatibility:** Test in fish and bash regularly during development
7. **SDK Error Handling:** Leverage built-in `Retell.APIError` classes

---

## Key SDK Advantages (from docs/retell-sdk.md)

1. **Built-in TypeScript types** - All request/response types included
2. **Automatic retries** - 2 retries with exponential backoff (408, 429, 5xx)
3. **Error handling** - Specific error classes (BadRequestError, AuthenticationError, etc.)
4. **Timeout management** - 1 minute default, configurable
5. **No manual HTTP** - No need for axios/fetch
6. **Type safety** - `Retell.AgentCreateParams`, `Retell.AgentResponse`, etc.

---

## Open Questions to Resolve in Task 1.2

1. What are the exact SDK method names?
   - `client.call.list()` or `client.calls.list()`?
   - `client.llm.retrieve()` or `client.retellLlm.get()`?
   - `client.conversationFlow.retrieve()` or different name?
2. Do pagination helpers exist in SDK responses?
3. What TypeScript types are exported? (e.g., `Retell.Call`, `Retell.Agent`)
4. Are there utility methods for common operations?

---

**Total Estimated Time:** 25-35 hours of focused development time

**First Priority:** Complete Task 1.2 (SDK Investigation) to answer all open questions before proceeding with implementation.
