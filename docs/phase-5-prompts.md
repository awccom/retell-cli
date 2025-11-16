# Phase 5: Prompt Management (Complex)

**Total Tasks:** 4
**Estimated Time:** 3.5-5 hours
**Status:** ✅ Complete

## Overview

⚠️ **This is the most complex phase of the project.** It implements intelligent prompt management that handles three different agent types (Retell LLM, Conversation Flow, Custom LLM). The prompt resolver service is the core complexity, as it must determine the agent type and fetch the appropriate resource.

## Prerequisites

- ✅ Phase 1 completed (Tasks 1.2, 1.4, 1.5, 1.6 required)
- ✅ Phase 2 completed (for authentication)
- ✅ **Task 1.2 findings are critical** - must know exact SDK method names

## Progress Checklist

- [x] Task 5.1: Prompt Type Resolution Service (60-90 min) ⚠️ **Core Complexity**
- [x] Task 5.2: Prompts Pull Command (45-60 min)
- [x] Task 5.3: Prompts Update Command (60-90 min)
- [x] Task 5.4: Publish Agent Command (20-30 min)

---

## Task 5.1: Prompt Type Resolution Service ⚠️ **Core Complexity**

**Estimated Time:** 60-90 minutes
**Dependencies:** Tasks 1.2, 1.4
**Status:** [x] Complete

### Why This Is Complex

This service must:
1. Fetch the agent to determine its response_engine type
2. Based on type, fetch the appropriate resource (LLM or Flow)
3. Handle three different response structures
4. Provide type-safe interfaces for all three cases

### Deliverables

- [ ] Create `src/services/prompt-resolver.ts`
- [ ] Implement `resolvePromptSource(agentId)` function
- [ ] Handle three engine types:
  - `retell-llm`: Fetch LLM, extract general_prompt + states
  - `conversation-flow`: Fetch flow, extract global_prompt + nodes
  - `custom-llm`: Return error (not manageable)
- [ ] Define TypeScript types for each prompt structure
- [ ] Add comprehensive error handling
- [ ] Use SDK methods (confirmed from Task 1.2)

### Type Definitions

```typescript
// src/types/prompts.ts
export type RetellLlmPrompts = {
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

export type FlowPrompts = {
  conversation_flow_id: string;
  version: number;
  global_prompt: string;
  nodes: unknown[]; // Use SDK type
};

export type PromptSource =
  | { type: 'retell-llm'; llmId: string; prompts: RetellLlmPrompts }
  | { type: 'conversation-flow'; flowId: string; prompts: FlowPrompts }
  | { type: 'custom-llm'; error: string };
```

### Implementation

```typescript
// src/services/prompt-resolver.ts
import { getRetellClient } from './retell-client';
import type { PromptSource } from '../types/prompts';

export async function resolvePromptSource(agentId: string): Promise<PromptSource> {
  const client = getRetellClient();

  // Step 1: Get agent to determine response_engine type
  const agent = await client.agent.retrieve(agentId);

  // Step 2: Branch based on type
  if (agent.response_engine.type === 'retell-llm') {
    // Fetch Retell LLM
    const llm = await client.llm.retrieve(agent.response_engine.llm_id);
    return {
      type: 'retell-llm',
      llmId: llm.llm_id,
      prompts: llm,
    };
  }

  if (agent.response_engine.type === 'conversation-flow') {
    // Fetch Conversation Flow
    const flow = await client.conversationFlow.retrieve(
      agent.response_engine.conversation_flow_id
    );
    return {
      type: 'conversation-flow',
      flowId: flow.conversation_flow_id,
      prompts: flow,
    };
  }

  // Custom LLM cannot be managed
  return {
    type: 'custom-llm',
    error: 'Custom LLM agents cannot be managed via API. Use the Retell dashboard.',
  };
}
```

### Error Handling

```typescript
import { handleSdkError } from './output-formatter';

export async function resolvePromptSource(agentId: string): Promise<PromptSource> {
  try {
    const client = getRetellClient();
    const agent = await client.agent.retrieve(agentId);

    // ... implementation
  } catch (error) {
    // Let SDK errors bubble up to be handled by commands
    throw error;
  }
}
```

### Acceptance Criteria

- [x] Correctly identifies engine type from agent
- [x] Fetches appropriate resource (LLM or Flow)
- [x] Returns structured, type-safe prompt data
- [x] Handles all error cases (not found, auth, network)
- [x] Unit tests for all three engine types
- [x] Uses SDK TypeScript types throughout
- [x] Custom LLM returns helpful error message

### Testing Checklist

- [ ] Test with agent using retell-llm
- [ ] Test with agent using conversation-flow
- [ ] Test with agent using custom-llm
- [ ] Test with non-existent agent (404)
- [ ] Test with invalid agent_id format
- [ ] Mock SDK responses for unit tests
- [ ] Verify TypeScript types are correct

---

## Task 5.2: Prompts Pull Command

**Estimated Time:** 45-60 minutes
**Dependencies:** Task 5.1
**Status:** [x] Complete

### Deliverables

- [ ] Implement `retell prompts pull <agent_id>` in `src/commands/prompts/pull.ts`
- [ ] Use prompt-resolver service
- [ ] Format output based on prompt type
- [ ] Support saving to file (`--output <file>`)

### Command

```bash
retell prompts pull <agent_id> [options]
  --output <file>   Save to file
  --json            JSON output (default)
```

### Implementation

```typescript
import { writeFileSync } from 'fs';
import { resolvePromptSource } from '../../services/prompt-resolver';
import { outputJson, outputError, handleSdkError } from '../../services/output-formatter';

export async function pullPromptsCommand(agentId: string, options: any) {
  try {
    const promptSource = await resolvePromptSource(agentId);

    // Handle custom LLM (error case)
    if (promptSource.type === 'custom-llm') {
      outputError(promptSource.error, 'CUSTOM_LLM_ERROR');
      return;
    }

    // Build output object
    const output = {
      type: promptSource.type,
      agent_id: agentId,
      ...promptSource.prompts,
    };

    // Save to file or output to console
    if (options.output) {
      writeFileSync(options.output, JSON.stringify(output, null, 2));
      outputJson({
        message: 'Prompts saved successfully',
        file: options.output,
        type: promptSource.type,
      });
    } else {
      outputJson(output);
    }
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Example Output (Retell LLM)

```json
{
  "type": "retell-llm",
  "agent_id": "agent_abc123",
  "llm_id": "llm_xyz789",
  "version": 2,
  "general_prompt": "You are a helpful assistant...",
  "begin_message": "Hello! How can I help you today?",
  "states": [
    {
      "name": "greeting",
      "state_prompt": "Greet the user warmly..."
    }
  ]
}
```

### Example Output (Conversation Flow)

```json
{
  "type": "conversation-flow",
  "agent_id": "agent_abc123",
  "conversation_flow_id": "flow_xyz789",
  "version": 1,
  "global_prompt": "You are a helpful assistant...",
  "nodes": [...]
}
```

### Acceptance Criteria

- [x] Correctly pulls all prompt types
- [x] --output saves valid JSON file
- [x] Custom LLM shows helpful error message
- [x] Clear indication of prompt type in output
- [x] All SDK types preserved
- [x] File I/O errors handled gracefully
- [x] Help text includes examples

### Testing Checklist

- [ ] Test pull for retell-llm agent
- [ ] Test pull for conversation-flow agent
- [ ] Test pull for custom-llm agent (should error)
- [ ] Test with --output flag (file creation)
- [ ] Test with invalid file path for --output
- [ ] Test overwriting existing file
- [ ] Verify JSON structure matches expected format

---

## Task 5.3: Prompts Update Command

**Estimated Time:** 60-90 minutes
**Dependencies:** Tasks 5.1, 5.2
**Status:** [x] Complete

### Deliverables

- [ ] Implement `retell prompts update <agent_id> --file <file>` in `src/commands/prompts/update.ts`
- [ ] Load and validate JSON file with zod
- [ ] Use prompt-resolver to determine type
- [ ] PATCH appropriate endpoint (LLM or Flow) using SDK
- [ ] Support `--publish` flag to auto-publish after update
- [ ] Dry-run mode (`--dry-run`) to validate without updating

### Command

```bash
retell prompts update <agent_id> [options]
  --file <path>     JSON file with prompts (required)
  --publish         Publish agent after update
  --dry-run         Validate without updating
  --json            JSON output (default)
```

### Validation Schemas

```typescript
// src/utils/validators.ts
import { z } from 'zod';

export const RetellLlmUpdateSchema = z.object({
  type: z.literal('retell-llm'),
  general_prompt: z.string().min(1),
  begin_message: z.string().optional(),
  states: z.array(z.object({
    name: z.string(),
    state_prompt: z.string(),
  })).optional(),
});

export const FlowUpdateSchema = z.object({
  type: z.literal('conversation-flow'),
  global_prompt: z.string().min(1),
  nodes: z.array(z.unknown()),
});

export function validatePromptUpdate(data: unknown) {
  // Try both schemas
  const llmResult = RetellLlmUpdateSchema.safeParse(data);
  if (llmResult.success) return llmResult.data;

  const flowResult = FlowUpdateSchema.safeParse(data);
  if (flowResult.success) return flowResult.data;

  throw new Error('Invalid prompt file format');
}
```

### Implementation

```typescript
import { readFileSync } from 'fs';
import { resolvePromptSource } from '../../services/prompt-resolver';
import { validatePromptUpdate } from '../../utils/validators';
import { getRetellClient } from '../../services/retell-client';
import { outputJson, outputError, handleSdkError } from '../../services/output-formatter';

export async function updatePromptsCommand(agentId: string, options: any) {
  try {
    // Load and parse file
    const fileContent = JSON.parse(readFileSync(options.file, 'utf-8'));

    // Validate structure
    const validated = validatePromptUpdate(fileContent);

    // Get current agent type
    const promptSource = await resolvePromptSource(agentId);

    // Validate type matches
    if (fileContent.type !== promptSource.type) {
      outputError(
        `Type mismatch: agent uses ${promptSource.type}, file contains ${fileContent.type}`,
        'TYPE_MISMATCH'
      );
      return;
    }

    // Custom LLM cannot be updated
    if (promptSource.type === 'custom-llm') {
      outputError(promptSource.error, 'CUSTOM_LLM_ERROR');
      return;
    }

    // Dry run - just validate and show changes
    if (options.dryRun) {
      outputJson({
        message: 'Dry run: validation passed',
        changes: validated,
        will_publish: !!options.publish,
      });
      return;
    }

    // Update using SDK
    const client = getRetellClient();

    if (promptSource.type === 'retell-llm') {
      await client.llm.update(promptSource.llmId, {
        general_prompt: fileContent.general_prompt,
        begin_message: fileContent.begin_message,
        states: fileContent.states,
      });
    } else if (promptSource.type === 'conversation-flow') {
      await client.conversationFlow.update(promptSource.flowId, {
        global_prompt: fileContent.global_prompt,
        nodes: fileContent.nodes,
      });
    }

    // Publish if requested
    if (options.publish) {
      await client.agent.publish(agentId);
      outputJson({
        message: 'Prompts updated and agent published',
        agent_id: agentId,
        type: promptSource.type,
      });
    } else {
      outputJson({
        message: 'Prompts updated (draft version)',
        agent_id: agentId,
        type: promptSource.type,
        note: 'Run `retell agent publish <agent_id>` to publish changes',
      });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      outputError('Invalid JSON in file', 'INVALID_JSON');
    } else {
      handleSdkError(error);
    }
  }
}
```

### Acceptance Criteria

- [x] Validates input file structure with zod
- [x] Updates correct resource (LLM or Flow)
- [x] --publish works correctly
- [x] --dry-run shows what would change without updating
- [x] Clear success/error messages
- [x] Handles version conflicts (SDK error handling)
- [x] All SDK types used
- [x] File not found errors handled gracefully
- [x] Invalid JSON errors handled gracefully

### Testing Checklist

- [ ] Test update for retell-llm (valid file)
- [ ] Test update for conversation-flow (valid file)
- [ ] Test with type mismatch (llm file, flow agent)
- [ ] Test with --dry-run flag
- [ ] Test with --publish flag
- [ ] Test with invalid JSON file
- [ ] Test with missing required fields
- [ ] Test with non-existent file
- [ ] Test with custom-llm agent (should error)

---

## Task 5.4: Publish Agent Command

**Estimated Time:** 20-30 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Status:** [x] Complete

### Deliverables

- [ ] Implement `retell agent publish <agent_id>` in `src/commands/publish.ts`
- [ ] Call SDK publish method
- [ ] Show confirmation of publish
- [ ] Display new version number

### Command

```bash
retell agent publish <agent_id> --json
```

### Implementation

```typescript
import { getRetellClient } from '../services/retell-client';
import { outputJson, handleSdkError } from '../services/output-formatter';

export async function publishAgentCommand(agentId: string) {
  try {
    const client = getRetellClient();
    const result = await client.agent.publish(agentId);

    outputJson({
      message: 'Agent published successfully',
      agent_id: agentId,
      new_version: result.version,
      is_published: true,
      note: 'Draft version incremented and ready for new changes',
    });
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Acceptance Criteria

- [x] Successfully publishes agent
- [x] Shows version incremented
- [x] Explains draft vs published concept in output
- [x] Handles errors gracefully (SDK error handling)
- [x] Handles agent not found
- [x] Help text is clear

### Testing Checklist

- [ ] Test publishing agent with unpublished changes
- [ ] Test publishing agent with no changes (still increments)
- [ ] Test with invalid agent_id
- [ ] Verify version number increments

---

## Phase Completion

Once all tasks are complete:
- [x] All 4 tasks checked off
- [x] All acceptance criteria met
- [x] Unit tests written and passing (especially for prompt-resolver)
- [x] Integration tests for full prompt workflow:
  - [x] pull → edit → update → publish
- [x] All three agent types tested thoroughly
- [x] Ready to proceed to Phase 6

## Next Phase

→ [Phase 6: Testing & Quality](./phase-6-testing.md)
