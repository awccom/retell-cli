# API Reference

Internal API documentation for Retell AI CLI services and utilities.

## Table of Contents

- [Services](#services)
  - [Config Service](#config-service)
  - [Retell Client Service](#retell-client-service)
  - [Output Formatter](#output-formatter)
  - [Prompt Resolver](#prompt-resolver)
- [Commands](#commands)
  - [Authentication](#authentication)
  - [Transcripts](#transcripts)
  - [Agents](#agents)
  - [Prompts](#prompts)
- [Type Definitions](#type-definitions)

## Services

### Config Service

**Module:** `src/services/config.ts`

Manages API key storage and retrieval.

#### `getApiKey(): string | null`

Retrieves the Retell API key from environment or config file.

**Returns:**
- `string`: API key if found
- `null`: No API key found

**Precedence:**
1. `RETELL_API_KEY` environment variable
2. `.retellrc.json` config file in current directory

**Example:**
```typescript
import { getApiKey } from './services/config';

const apiKey = getApiKey();
if (!apiKey) {
  console.error('No API key found');
  process.exit(1);
}
```

#### `saveApiKey(apiKey: string): string`

Saves API key to local config file.

**Parameters:**
- `apiKey: string` - The API key to save

**Returns:**
- `string`: Path to the config file

**Side Effects:**
- Creates `.retellrc.json` in current directory
- Sets file permissions to 0600 (owner read/write only)

**Throws:**
- `Error`: If unable to write config file

**Example:**
```typescript
import { saveApiKey } from './services/config';

try {
  const path = saveApiKey('your_api_key_here');
  console.log(`Saved to ${path}`);
} catch (error) {
  console.error('Failed to save API key', error);
}
```

---

### Retell Client Service

**Module:** `src/services/retell-client.ts`

Provides a singleton Retell SDK client instance.

#### `getRetellClient(): RetellClient`

Returns the initialized Retell SDK client.

**Returns:**
- `RetellClient`: Initialized SDK client instance

**Throws:**
- `Error`: If API key is missing

**Example:**
```typescript
import { getRetellClient } from './services/retell-client';

const client = getRetellClient();
const calls = await client.call.list({ limit: 10 });
```

**Implementation Details:**
- Lazy initialization (creates client on first call)
- Singleton pattern (one instance per process)
- Automatically configures API key from config service

---

### Output Formatter

**Module:** `src/services/output-formatter.ts`

Handles JSON output and error formatting.

#### `outputJson(data: unknown): void`

Outputs data as formatted JSON to stdout.

**Parameters:**
- `data: unknown` - Data to output (will be JSON.stringify'd)

**Side Effects:**
- Writes to stdout

**Example:**
```typescript
import { outputJson } from './services/output-formatter';

const result = { call_id: 'call_123', status: 'ended' };
outputJson(result);
// Output: {"call_id":"call_123","status":"ended"}
```

#### `handleSdkError(error: unknown): never`

Handles Retell SDK errors and outputs user-friendly messages.

**Parameters:**
- `error: unknown` - Error object (typically from SDK)

**Returns:**
- `never` - This function always exits the process

**Side Effects:**
- Writes error to stderr as JSON
- Calls `process.exit(1)`

**Example:**
```typescript
import { handleSdkError } from './services/output-formatter';

try {
  const result = await client.call.retrieve('invalid_id');
} catch (error) {
  handleSdkError(error);  // Outputs error and exits
}
```

**Error Output Format:**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

**Error Codes:**
- `AUTHENTICATION_ERROR`: Invalid or missing API key
- `NOT_FOUND`: Resource not found
- `CUSTOM_LLM_ERROR`: Cannot manage custom LLM agents
- `TYPE_MISMATCH`: Prompt type doesn't match agent type
- `UNKNOWN_ERROR`: Unexpected error

---

### Prompt Resolver

**Module:** `src/services/prompt-resolver.ts`

Resolves prompt source and type based on agent configuration.

#### `resolvePromptSource(agentId: string): Promise<PromptSource>`

Determines the prompt source for an agent.

**Parameters:**
- `agentId: string` - The agent ID to resolve

**Returns:**
- `Promise<PromptSource>` - Prompt source information

**Throws:**
- `Error`: If agent not found or API error

**Example:**
```typescript
import { resolvePromptSource } from './services/prompt-resolver';

const source = await resolvePromptSource('agent_123');

if (source.type === 'retell-llm') {
  console.log('LLM ID:', source.llmId);
  console.log('Prompts:', source.prompts);
} else if (source.type === 'conversation-flow') {
  console.log('Flow ID:', source.flowId);
  console.log('Prompts:', source.prompts);
} else {
  console.error('Custom LLM agent:', source.error);
}
```

#### Type: `PromptSource`

Union type representing different prompt sources.

**Definition:**
```typescript
type PromptSource =
  | { type: 'retell-llm'; llmId: string; agentName: string; prompts: RetellLlmPrompts }
  | { type: 'conversation-flow'; flowId: string; agentName: string; prompts: FlowPrompts }
  | { type: 'custom-llm'; error: string };
```

**Variants:**

**1. Retell LLM:**
```typescript
{
  type: 'retell-llm',
  llmId: string,           // LLM ID
  agentName: string,       // Agent display name
  prompts: {
    llm_id: string,
    version: number,
    general_prompt: string,
    begin_message?: string,
    states?: Array<{
      name: string,
      state_prompt: string,
      edges?: unknown[]
    }>
  }
}
```

**2. Conversation Flow:**
```typescript
{
  type: 'conversation-flow',
  flowId: string,          // Flow ID
  agentName: string,       // Agent display name
  prompts: {
    conversation_flow_id: string,
    version: number,
    global_prompt: string,
    nodes: unknown[]
  }
}
```

**3. Custom LLM (Not Supported):**
```typescript
{
  type: 'custom-llm',
  error: string            // Error message explaining why it's not supported
}
```

#### Type: `RetellLlmPrompts`

Prompt structure for Retell LLM agents.

**Definition:**
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
```

#### Type: `FlowPrompts`

Prompt structure for Conversation Flow agents.

**Definition:**
```typescript
type FlowPrompts = {
  conversation_flow_id: string;
  version: number;
  global_prompt: string;
  nodes: unknown[];
};
```

---

## Commands

### Authentication

#### `loginCommand(): Promise<void>`

**Module:** `src/commands/login.ts`

Authenticates user by saving API key to config file.

**Process:**
1. Prompts user for API key (hidden input)
2. Validates API key format
3. Saves to `.retellrc.json`
4. Outputs success message

**Example:**
```typescript
import { loginCommand } from './commands/login';

await loginCommand();
```

**Output:**
```json
{
  "message": "API key saved to .retellrc.json",
  "path": "/current/directory/.retellrc.json"
}
```

---

### Transcripts

#### `listTranscriptsCommand(options): Promise<void>`

**Module:** `src/commands/transcripts/list.ts`

Lists call transcripts with optional filtering.

**Parameters:**
```typescript
{
  limit?: number;  // Max results (default: 50)
}
```

**Process:**
1. Get Retell client
2. Call `client.call.list()`
3. Output results as JSON

**Example:**
```typescript
import { listTranscriptsCommand } from './commands/transcripts/list';

await listTranscriptsCommand({ limit: 100 });
```

#### `getTranscriptCommand(callId: string): Promise<void>`

**Module:** `src/commands/transcripts/get.ts`

Retrieves a specific call transcript.

**Parameters:**
- `callId: string` - The call ID to retrieve

**Process:**
1. Get Retell client
2. Call `client.call.retrieve(callId)`
3. Output result as JSON

**Example:**
```typescript
import { getTranscriptCommand } from './commands/transcripts/get';

await getTranscriptCommand('call_abc123');
```

#### `analyzeTranscriptCommand(callId: string): Promise<void>`

**Module:** `src/commands/transcripts/analyze.ts`

Analyzes a call transcript with structured insights.

**Parameters:**
- `callId: string` - The call ID to analyze

**Process:**
1. Get Retell client
2. Retrieve call data
3. Extract and structure analysis data
4. Output formatted analysis

**Output Structure:**
```typescript
{
  call_id: string;
  metadata: {
    status: string;
    duration_ms: number;
    start_timestamp: number;
    end_timestamp: number;
    agent_name: string;
  };
  transcript: Array<{
    role: 'agent' | 'user';
    content: string;
    word_count: number;
  }>;
  analysis: {
    summary: string;
    sentiment: string;
    successful: boolean;
    in_voicemail: boolean;
  };
  performance: {
    latency_p50_ms: {
      e2e: number | null;
      llm: number | null;
      tts: number | null;
    };
    latency_p90_ms: {
      e2e: number | null;
      llm: number | null;
      tts: number | null;
    };
  };
  cost: {
    total: number;
    breakdown: Array<{
      product: string;
      cost: number;
    }>;
  };
}
```

---

### Agents

#### `listAgentsCommand(options): Promise<void>`

**Module:** `src/commands/agents/list.ts`

Lists all agents in the account.

**Parameters:**
```typescript
{
  limit?: number;  // Max results (default: 100)
}
```

**Process:**
1. Get Retell client
2. Call `client.agent.list()`
3. Output results as JSON

**Example:**
```typescript
import { listAgentsCommand } from './commands/agents/list';

await listAgentsCommand({ limit: 50 });
```

#### `agentInfoCommand(agentId: string): Promise<void>`

**Module:** `src/commands/agents/info.ts`

Retrieves detailed information about an agent.

**Parameters:**
- `agentId: string` - The agent ID to retrieve

**Process:**
1. Get Retell client
2. Call `client.agent.retrieve(agentId)`
3. Output result as JSON

**Example:**
```typescript
import { agentInfoCommand } from './commands/agents/info';

await agentInfoCommand('agent_123abc');
```

---

### Prompts

#### `pullPromptsCommand(agentId: string, options): Promise<void>`

**Module:** `src/commands/prompts/pull.ts`

Downloads agent prompts to a local file.

**Parameters:**
```typescript
{
  agentId: string;
  options: {
    output?: string;  // Output path (default: .retell-prompts/{agentId}.json)
  };
}
```

**Process:**
1. Resolve prompt source using `resolvePromptSource()`
2. Extract prompts based on type
3. Save to file
4. Output success message

**Example:**
```typescript
import { pullPromptsCommand } from './commands/prompts/pull';

await pullPromptsCommand('agent_123', { output: 'prompts.json' });
```

**Output:**
```json
{
  "message": "Prompts saved to prompts.json",
  "agent_id": "agent_123",
  "agent_name": "Customer Support Bot",
  "type": "retell-llm",
  "path": "prompts.json"
}
```

**File Format (Retell LLM):**
```json
{
  "type": "retell-llm",
  "begin_message": "Hello! How can I help you today?",
  "general_prompt": "You are a helpful customer support agent...",
  "general_tools": [],
  "states": []
}
```

#### `updatePromptsCommand(agentId: string, options): Promise<void>`

**Module:** `src/commands/prompts/update.ts`

Updates agent prompts from a local file.

**Parameters:**
```typescript
{
  agentId: string;
  options: {
    source?: string;    // Source file (default: .retell-prompts/{agentId}.json)
    dryRun?: boolean;   // Preview changes without applying
  };
}
```

**Process:**
1. Read prompt file
2. Validate prompt type matches agent type
3. If dry run: show diff and exit
4. If not dry run: update agent via API
5. Output success message

**Example:**
```typescript
import { updatePromptsCommand } from './commands/prompts/update';

// Dry run
await updatePromptsCommand('agent_123', {
  source: 'prompts.json',
  dryRun: true
});

// Apply changes
await updatePromptsCommand('agent_123', {
  source: 'prompts.json'
});
```

**Dry Run Output:**
```json
{
  "message": "DRY RUN - No changes made",
  "agent_id": "agent_123",
  "changes": {
    "begin_message": {
      "old": "Hello!",
      "new": "Welcome!"
    }
  }
}
```

#### `publishAgentCommand(agentId: string): Promise<void>`

**Module:** `src/commands/agent/publish.ts`

Publishes a draft agent to make changes live.

**Parameters:**
- `agentId: string` - The agent ID to publish

**Process:**
1. Get Retell client
2. Call `client.agent.update()` with published status
3. Output success message

**Example:**
```typescript
import { publishAgentCommand } from './commands/agent/publish';

await publishAgentCommand('agent_123');
```

**Output:**
```json
{
  "message": "Agent published successfully",
  "agent_id": "agent_123",
  "agent_name": "Customer Support Bot"
}
```

---

## Type Definitions

### Common Types

#### `CallStatus`

```typescript
type CallStatus = 'registered' | 'ongoing' | 'ended' | 'error';
```

#### `AgentType`

```typescript
type AgentType = 'retell-llm' | 'conversation-flow' | 'custom-llm';
```

#### `TranscriptTurn`

```typescript
interface TranscriptTurn {
  role: 'agent' | 'user';
  content: string;
  word_count: number;
}
```

#### `AnalysisOutput`

Complete analysis output structure (see `analyzeTranscriptCommand` above).

### Command Options Types

#### `ListTranscriptsOptions`

```typescript
interface ListTranscriptsOptions {
  limit?: number;
}
```

#### `ListAgentsOptions`

```typescript
interface ListAgentsOptions {
  limit?: number;
}
```

#### `PullPromptsOptions`

```typescript
interface PullPromptsOptions {
  output?: string;
}
```

#### `UpdatePromptsOptions`

```typescript
interface UpdatePromptsOptions {
  source?: string;
  dryRun?: boolean;
}
```

---

## Error Handling

All commands follow a consistent error handling pattern:

```typescript
try {
  // Command logic
} catch (error) {
  handleSdkError(error);
}
```

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Standard Error Codes

| Code | Description | Example |
|------|-------------|---------|
| `AUTHENTICATION_ERROR` | Invalid or missing API key | "API key is missing" |
| `NOT_FOUND` | Resource not found | "Call not found: call_xyz" |
| `CUSTOM_LLM_ERROR` | Cannot manage custom LLM | "Cannot manage custom LLM agents" |
| `TYPE_MISMATCH` | Prompt type mismatch | "Expected retell-llm, got conversation-flow" |
| `VALIDATION_ERROR` | Invalid input | "Invalid call ID format" |
| `UNKNOWN_ERROR` | Unexpected error | "An unexpected error occurred" |

---

## Usage Examples

### Full Workflow Example

```typescript
import { loginCommand } from './commands/login';
import { listAgentsCommand } from './commands/agents/list';
import { pullPromptsCommand } from './commands/prompts/pull';
import { updatePromptsCommand } from './commands/prompts/update';
import { publishAgentCommand } from './commands/agent/publish';

// 1. Authenticate
await loginCommand();

// 2. List agents
await listAgentsCommand({ limit: 10 });

// 3. Pull prompts
await pullPromptsCommand('agent_123', { output: 'prompts.json' });

// 4. ... edit prompts.json ...

// 5. Preview changes
await updatePromptsCommand('agent_123', {
  source: 'prompts.json',
  dryRun: true
});

// 6. Apply changes
await updatePromptsCommand('agent_123', {
  source: 'prompts.json'
});

// 7. Publish agent
await publishAgentCommand('agent_123');
```

---

## Testing Utilities

### Mocking Services

```typescript
import { vi } from 'vitest';

// Mock config service
vi.mock('./services/config', () => ({
  getApiKey: vi.fn(() => 'test_api_key'),
  saveApiKey: vi.fn(() => '/path/to/config')
}));

// Mock Retell client
const mockClient = {
  call: {
    list: vi.fn(),
    retrieve: vi.fn()
  },
  agent: {
    list: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn()
  }
};

vi.mock('./services/retell-client', () => ({
  getRetellClient: vi.fn(() => mockClient)
}));

// Mock output formatter
vi.mock('./services/output-formatter', () => ({
  outputJson: vi.fn(),
  handleSdkError: vi.fn()
}));
```

---

For more information:
- [Architecture Documentation](architecture.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [User Guide](user-guide.md)
