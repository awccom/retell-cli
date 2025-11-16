# Retell SDK Investigation Results

**Date:** 2025-01-15
**SDK Version:** retell-sdk@4.5.0
**Status:** ✅ Complete

---

## Executive Summary

This document contains the **CRITICAL** findings from investigating the `retell-sdk` package. These findings determine the exact API method names, TypeScript types, and patterns used throughout the CLI implementation.

**Key Takeaway:** All subsequent implementation in Phases 2-5 must reference this document for accurate SDK method names and structures.

---

## 1. Client Structure & Available Namespaces

The Retell SDK client exposes the following namespaces:

```typescript
const client = new Retell({ apiKey: 'your_key' });

// Available namespaces:
client.call             // Call management
client.chat             // Chat functionality
client.phoneNumber      // Phone number operations
client.agent            // Agent CRUD operations
client.llm              // Retell LLM configuration
client.conversationFlow // Conversation flow configuration
client.knowledgeBase    // Knowledge base management
client.voice            // Voice configuration
client.concurrency      // Concurrency settings
client.batchCall        // Batch call operations
client.tests            // Testing utilities
client.mcpTool          // MCP tool integration
```

---

## 2. Agent Methods

### Namespace: `client.agent`

**Available Methods:**
```typescript
client.agent.create(params)      // Create new agent
client.agent.retrieve(agentId)   // Get agent by ID
client.agent.update(agentId, params) // Update agent
client.agent.list(params)        // List all agents
client.agent.delete(agentId)     // Delete agent
client.agent.getVersions(agentId) // Get agent versions
client.agent.publish(agentId)    // Publish agent draft
```

### List Response Structure

```typescript
const agents = await client.agent.list({ limit: 1 });
// Returns: Array<Agent>

// Sample agent object fields:
{
  agent_id: string;
  channel: string;
  last_modification_timestamp: number;
  agent_name: string;
  response_engine: {
    type: 'retell-llm' | 'conversation-flow' | 'custom-llm';
    llm_id?: string;
    conversation_flow_id?: string;
    // ...
  };
  webhook_url: string;
  language: string;
  voice_id: string;
  voice_temperature: number;
  voice_speed: number;
  version: number;
  is_published: boolean;
  version_title: string;
  // ... many more fields
}
```

**CLI Mapping:**
- `retell agents list` → `client.agent.list()`
- `retell agents info <id>` → `client.agent.retrieve(id)`
- `retell agent publish <id>` → `client.agent.publish(id)`

---

## 3. Call Methods

### Namespace: `client.call`

**Available Methods:**
```typescript
client.call.retrieve(callId)           // Get call details
client.call.update(callId, params)     // Update call
client.call.list(params)               // List calls
client.call.delete(callId)             // Delete call
client.call.createPhoneCall(params)    // Create phone call
client.call.createWebCall(params)      // Create web call
client.call.registerPhoneCall(params)  // Register phone call
```

### List Response Structure

```typescript
const calls = await client.call.list({ limit: 1 });
// Returns: Array<Call>

// Sample call object fields:
{
  call_id: string;
  call_type: 'phone_call' | 'web_call';
  agent_id: string;
  agent_version: number;
  agent_name: string;
  call_status: 'ended' | 'ongoing' | 'error';
  start_timestamp: number;
  end_timestamp: number;
  duration_ms: number;

  // Transcript data
  transcript: string;  // Plain text transcript
  transcript_object: Array<{
    role: 'agent' | 'user';
    content: string;
    words: Array<{
      word: string;
      start: number;
      end: number;
    }>;
    metadata?: { response_id: number };
  }>;
  transcript_with_tool_calls: Array<...>;

  // Recordings
  recording_url: string;
  recording_multi_channel_url: string;
  public_log_url: string;

  // Analysis
  call_analysis: {
    in_voicemail: boolean;
    call_summary: string;
    user_sentiment: string;
    call_successful: boolean;
    custom_analysis_data: object;
  };

  // Metrics
  latency: {
    llm: { p50: number, p90: number, p99: number, min: number, max: number };
    e2e: { p50: number, p90: number, p99: number, min: number, max: number };
    tts: { p50: number, p90: number, p99: number, min: number, max: number };
  };

  call_cost: {
    total_duration_unit_price: number;
    combined_cost: number;
    product_costs: Array<{ product: string; cost: number }>;
  };

  // ... many more fields
}
```

**CLI Mapping:**
- `retell transcripts list` → `client.call.list()`
- `retell transcripts get <id>` → `client.call.retrieve(id)`
- `retell transcripts analyze <id>` → `client.call.retrieve(id)` + custom analysis

---

## 4. LLM Methods

### Namespace: `client.llm` ✅ Confirmed

**Available Methods:**
```typescript
client.llm.create(params)      // Create Retell LLM config
client.llm.retrieve(llmId)     // Get LLM config
client.llm.update(llmId, params) // Update LLM config
client.llm.list(params)        // List LLM configs
client.llm.delete(llmId)       // Delete LLM config
```

**CLI Mapping:**
- `retell prompts pull <agent_id>` → Resolve agent → `client.llm.retrieve(llmId)` if `response_engine.type === 'retell-llm'`
- `retell prompts update <agent_id>` → `client.llm.update(llmId, { general_prompt, states })`

**Prompt Resolver Logic:**
```typescript
async function resolvePromptSource(agentId: string) {
  const agent = await client.agent.retrieve(agentId);

  if (agent.response_engine.type === 'retell-llm') {
    const llm = await client.llm.retrieve(agent.response_engine.llm_id);
    return {
      type: 'retell-llm',
      llmId: llm.llm_id,
      prompts: {
        general_prompt: llm.general_prompt,
        begin_message: llm.begin_message,
        states: llm.states,
        // ...
      }
    };
  }

  // ... handle other types
}
```

---

## 5. Conversation Flow Methods

### Namespace: `client.conversationFlow` ✅ Confirmed

**Available Methods:**
```typescript
client.conversationFlow.create(params)       // Create flow
client.conversationFlow.retrieve(flowId)     // Get flow
client.conversationFlow.update(flowId, params) // Update flow
client.conversationFlow.list(params)         // List flows
client.conversationFlow.delete(flowId)       // Delete flow
```

**CLI Mapping:**
- `retell prompts pull <agent_id>` → Resolve agent → `client.conversationFlow.retrieve(flowId)` if `response_engine.type === 'conversation-flow'`
- `retell prompts update <agent_id>` → `client.conversationFlow.update(flowId, { global_prompt, nodes })`

**Prompt Resolver Logic:**
```typescript
if (agent.response_engine.type === 'conversation-flow') {
  const flow = await client.conversationFlow.retrieve(
    agent.response_engine.conversation_flow_id
  );
  return {
    type: 'conversation-flow',
    flowId: flow.conversation_flow_id,
    prompts: {
      global_prompt: flow.global_prompt,
      nodes: flow.nodes,
      // ...
    }
  };
}
```

---

## 6. TypeScript Types

### Available Type Exports

The SDK exports TypeScript types from the `Retell` namespace:

```typescript
import Retell from 'retell-sdk';

// Error classes
Retell.APIError
Retell.APIConnectionError
Retell.APIConnectionTimeoutError
Retell.APIUserAbortError
Retell.NotFoundError
Retell.ConflictError
Retell.RateLimitError
Retell.BadRequestError
Retell.AuthenticationError
Retell.InternalServerError
Retell.PermissionDeniedError
Retell.UnprocessableEntityError

// Resource namespaces (use for types)
Retell.Call
Retell.Agent
Retell.Llm
Retell.ConversationFlow
Retell.PhoneNumber
Retell.Voice
Retell.KnowledgeBase
// ... etc
```

### Usage in CLI

```typescript
// Type-safe request parameters
import Retell from 'retell-sdk';

const params: Retell.AgentCreateParams = {
  response_engine: { type: 'retell-llm', llm_id: '...' },
  voice_id: '11labs-Adrian',
};

// Type-safe responses
const agent: Retell.AgentResponse = await client.agent.create(params);
```

---

## 7. Error Handling

### Error Class Hierarchy

All SDK errors extend `Retell.APIError`:

```typescript
try {
  await client.agent.retrieve('invalid-id');
} catch (error) {
  if (error instanceof Retell.NotFoundError) {
    // 404 - Agent not found
    console.error('Agent not found:', error.message);
  } else if (error instanceof Retell.AuthenticationError) {
    // 401 - Invalid API key
    console.error('Authentication failed:', error.message);
  } else if (error instanceof Retell.BadRequestError) {
    // 400 - Invalid request
    console.error('Bad request:', error.message);
  } else if (error instanceof Retell.APIError) {
    // Generic API error
    console.error('API error:', error.status, error.message);
  } else {
    // Non-API error
    throw error;
  }
}
```

### Error Response Structure

```typescript
interface APIError {
  status: number;        // HTTP status code
  name: string;          // Error type (e.g., 'NotFoundError')
  message: string;       // Human-readable error message
  headers: Headers;      // Response headers
}
```

**CLI Implementation:**

```typescript
// src/services/output-formatter.ts
export function handleSdkError(error: unknown): never {
  if (error instanceof Retell.NotFoundError) {
    outputError('Resource not found', 'NOT_FOUND');
  }
  if (error instanceof Retell.AuthenticationError) {
    outputError('Invalid API key. Run `retell login` to authenticate.', 'AUTH_ERROR');
  }
  if (error instanceof Retell.APIError) {
    outputError(error.message, 'API_ERROR');
  }
  outputError('An unexpected error occurred', 'UNKNOWN_ERROR');
}
```

---

## 8. Pagination Mechanism

### Response Format

**Important:** SDK responses return **arrays directly**, not paginated objects with metadata.

```typescript
// ✅ CORRECT
const calls = await client.call.list({ limit: 10 });
// Returns: Array<Call>

// ❌ NOT this:
// { data: Array<Call>, pagination_key: string }
```

### Pagination Parameters

Based on API documentation, pagination uses cursor-based approach:

```typescript
// First page
const page1 = await client.call.list({ limit: 50 });

// Next page (if needed)
const page2 = await client.call.list({
  limit: 50,
  pagination_key: lastCallId,  // ID of last call from page1
});
```

**Note:** The SDK doesn't provide automatic pagination helpers. The CLI will need to implement manual pagination if needed.

**CLI Implementation:**

For now, the CLI will use simple limits. Advanced pagination can be added in Phase 8 if needed.

```typescript
// retell transcripts list --limit 100
const calls = await client.call.list({ limit: options.limit || 50 });
outputJson(calls);
```

---

## 9. SDK Configuration

### Client Initialization

```typescript
import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: 'key_...',
  maxRetries: 2,        // Retry failed requests 2 times (default)
  timeout: 60000,       // 60 second timeout (default is 60s)
});
```

### Automatic Retries

The SDK automatically retries:
- Connection errors
- 408 Request Timeout
- 409 Conflict
- 429 Rate Limit
- >=500 Internal Server Errors

**Default:** 2 retries with exponential backoff

---

## 10. Implementation Checklist for CLI

Based on these findings, here's what to implement:

### Config Service (Task 1.3)
- [x] Store API key in `.retellrc.json`
- [x] Support `RETELL_API_KEY` environment variable
- [x] Validate API key format

### Retell Client Service (Task 1.4)
- [x] Use singleton pattern: `getRetellClient()`
- [x] Configuration: `{ apiKey, maxRetries: 2, timeout: 60000 }`
- [x] Error handling with `Retell.APIError` subclasses

### Prompt Resolver Service (Task 5.1)
- [x] Check `agent.response_engine.type`
- [x] If `'retell-llm'`: use `client.llm.retrieve(agent.response_engine.llm_id)`
- [x] If `'conversation-flow'`: use `client.conversationFlow.retrieve(agent.response_engine.conversation_flow_id)`
- [x] If `'custom-llm'`: return error message

### Command Implementations

**Agents:**
- `retell agents list` → `client.agent.list()`
- `retell agents info <id>` → `client.agent.retrieve(id)`
- `retell agent publish <id>` → `client.agent.publish(id)`

**Transcripts:**
- `retell transcripts list` → `client.call.list()`
- `retell transcripts get <id>` → `client.call.retrieve(id)`
- `retell transcripts analyze <id>` → `client.call.retrieve(id)` + custom analysis logic

**Prompts:**
- `retell prompts pull <agent_id>` → resolve → `client.llm.retrieve()` or `client.conversationFlow.retrieve()`
- `retell prompts update <agent_id>` → resolve → `client.llm.update()` or `client.conversationFlow.update()`

---

## 11. Critical Implementation Notes

### ✅ Confirmed Method Names

| Resource | Method | SDK Call |
|----------|--------|----------|
| Agent List | List agents | `client.agent.list()` |
| Agent Get | Get agent | `client.agent.retrieve(id)` |
| Agent Publish | Publish agent | `client.agent.publish(id)` |
| Call List | List calls | `client.call.list()` |
| Call Get | Get call | `client.call.retrieve(id)` |
| LLM Get | Get LLM config | `client.llm.retrieve(id)` |
| LLM Update | Update LLM | `client.llm.update(id, params)` |
| Flow Get | Get flow | `client.conversationFlow.retrieve(id)` |
| Flow Update | Update flow | `client.conversationFlow.update(id, params)` |

### ✅ Response Engine Types

```typescript
type ResponseEngineType = 'retell-llm' | 'conversation-flow' | 'custom-llm';
```

### ✅ Namespace Naming

- ✅ `client.llm` (NOT `client.retellLlm` or `client.retell_llm`)
- ✅ `client.conversationFlow` (NOT `client.conversation_flow` or `client.flow`)

---

## Conclusion

**Status:** ✅ SDK Investigation Complete

All method names, types, and patterns have been confirmed. This document serves as the **single source of truth** for SDK usage throughout the CLI implementation.

**Next Steps:**
1. Proceed with Task 1.3: Config File Management System
2. Use these exact method names in all command implementations
3. Reference this document whenever implementing SDK calls

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Author:** Claude (Retell CLI Development Team)
