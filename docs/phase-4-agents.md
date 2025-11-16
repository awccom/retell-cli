# Phase 4: Agent Commands

**Total Tasks:** 2
**Estimated Time:** 1-1.5 hours
**Status:** ✅ Complete

## Overview

This phase implements commands for working with Retell AI agents. Users can list all agents and retrieve detailed information about specific agents, including their configuration and response engine settings.

## Prerequisites

- ✅ Phase 1 completed (Tasks 1.2, 1.4, 1.5, 1.6 required)
- ✅ Phase 2 completed (for authentication)

## Progress Checklist

- [x] Task 4.1: List Agents Command (30-40 min)
- [x] Task 4.2: Agent Info Command (30-40 min)

---

## Task 4.1: List Agents Command

**Estimated Time:** 30-40 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Status:** [x] Complete

### Deliverables

- [ ] Implement `retell agents list` in `src/commands/agents/list.ts`
- [ ] Support pagination (--limit, --after)
- [ ] Show: agent_id, name, version, is_published, response_engine type
- [ ] Format as JSON array

### Command

```bash
retell agents list [options]
  --limit <n>       Max results (default: 100)
  --after <id>      Pagination: agents after this ID
  --json            JSON output (default)
```

### SDK Call

```typescript
import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

export async function listAgentsCommand(options: any) {
  try {
    const client = getRetellClient();

    const response = await client.agent.list({
      limit: options.limit || 100,
      pagination_key: options.after,
    });

    // Format for cleaner output
    const formatted = response.map(agent => ({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      version: agent.version,
      is_published: agent.is_published,
      response_engine_type: agent.response_engine.type,
      response_engine_id:
        agent.response_engine.llm_id ||
        agent.response_engine.conversation_flow_id ||
        agent.response_engine.llm_websocket_url,
    }));

    outputJson(formatted);
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Acceptance Criteria

- [x] Returns array of agents
- [x] Shows response_engine type clearly (retell-llm, conversation-flow, custom-llm)
- [x] Pagination works correctly with --after
- [x] Indicates published vs draft status
- [x] Uses SDK types throughout
- [x] Help text includes examples
- [x] Handles empty agent list gracefully

### Testing Checklist

- [ ] Test without options (default limit 100)
- [ ] Test with --limit=10
- [ ] Test with --after for pagination
- [ ] Test with no agents (new account)
- [ ] Test with >100 agents (multiple pages)
- [ ] Verify all three response_engine types display correctly

---

## Task 4.2: Agent Info Command

**Estimated Time:** 30-40 minutes
**Dependencies:** Tasks 1.2, 1.4, 1.5, 1.6
**Status:** [x] Complete

### Deliverables

- [ ] Implement `retell agents info <agent_id>` in `src/commands/agents/info.ts`
- [ ] Fetch and display full agent configuration
- [ ] Clearly show response_engine type and ID
- [ ] Display voice settings, language, webhooks

### Command

```bash
retell agents info <agent_id> [options]
  --version <n>     Specific version (default: latest)
  --json            JSON output (default)
```

### SDK Call

```typescript
import { getRetellClient } from '../../services/retell-client';
import { outputJson, handleSdkError } from '../../services/output-formatter';

export async function agentInfoCommand(agentId: string, options: any) {
  try {
    const client = getRetellClient();

    const agent = await client.agent.retrieve(agentId, {
      version: options.version,
    });

    // Full agent object with all SDK types
    outputJson(agent);
  } catch (error) {
    handleSdkError(error);
  }
}
```

### Enhanced Output (Optional)

```typescript
// Optionally format for better readability
const formatted = {
  // Core info
  agent_id: agent.agent_id,
  agent_name: agent.agent_name,
  version: agent.version,
  is_published: agent.is_published,

  // Response engine
  response_engine: {
    type: agent.response_engine.type,
    id: agent.response_engine.llm_id || agent.response_engine.conversation_flow_id,
  },

  // Voice settings
  voice: {
    voice_id: agent.voice_id,
    voice_model: agent.voice_model,
    language: agent.language,
    speed: agent.voice_speed,
    temperature: agent.voice_temperature,
  },

  // Behavior
  behavior: {
    responsiveness: agent.responsiveness,
    interruption_sensitivity: agent.interruption_sensitivity,
    enable_backchannel: agent.enable_backchannel,
  },

  // Integrations
  webhook_url: agent.webhook_url,
  ambient_sound: agent.ambient_sound,

  // Raw data (for completeness)
  _raw: agent,
};
```

### Acceptance Criteria

- [x] Shows all agent configuration fields
- [x] Highlights key fields (name, engine type, voice)
- [x] Includes LLM ID or Flow ID if applicable
- [x] Handles agent not found (SDK NotFoundError)
- [x] All TypeScript types from SDK preserved
- [x] --version flag works for retrieving specific versions
- [x] Help text is clear

### Testing Checklist

- [ ] Test with valid agent_id
- [ ] Test with invalid agent_id (404)
- [ ] Test with --version=1 (specific version)
- [ ] Test with --version=latest (explicitly)
- [ ] Test agent with retell-llm engine
- [ ] Test agent with conversation-flow engine
- [ ] Test agent with custom-llm engine
- [ ] Verify all fields are present in output

---

## Phase Completion

Once all tasks are complete:
- [x] All 2 tasks checked off
- [x] All acceptance criteria met
- [x] Unit tests written and passing (130 total tests)
- [x] Integration tests for all commands
- [x] Ready to proceed to Phase 5

## Next Phase

→ [Phase 5: Prompt Management](./phase-5-prompts.md) ⚠️ **Most Complex Phase**
