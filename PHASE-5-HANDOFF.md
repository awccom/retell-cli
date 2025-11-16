📋 PHASE 5 HANDOFF: Prompt Management Implementation

═══════════════════════════════════════════════════════════════════════════════

🎯 Project Context

Repository: https://github.com/awccom/retell-cli.git
Project: Retell AI CLI - Command-line tool for transcript analysis and prompt management
Current Status: Phase 4 Complete ✅ - Agent commands working
Progress: 12/24 tasks complete (50%)
Branch: main (start from here)

---

📌 Your Mission

Implement Phase 5: Prompt Management Commands for the Retell CLI project.

This is the MOST COMPLEX phase of the project. You'll be implementing a sophisticated
prompt resolution system that handles three different agent response engine types,
plus commands to pull, update, and publish agent prompts.

---

🔍 Phase 5 Overview

Total Tasks: 4
Estimated Time: 3.5-5 hours
Prerequisites: Phases 1-4 complete ✅

What You're Building:

1. Prompt Type Resolution Service - Determines how to fetch/update prompts based on agent type
2. `retell prompts pull <agent_id>` - Download prompts to local files
3. `retell prompts update <agent_id>` - Upload local prompt changes
4. `retell agent-publish <agent_id>` - Publish agent draft to production

---

🚀 Setup Instructions

1. Start Fresh Session

```bash
cd /home/devon/claude/retell-cli

# Verify you're on main branch
git checkout main
git pull origin main

# Verify Phase 4 is complete
npm run test:run
# Should show: 130 tests passing

npm run build
# Should build successfully

# Create new branch for Phase 5
git checkout -b phase-5-prompts

# Verify you're on the right branch
git branch --show-current
# Should output: phase-5-prompts
```

2. Read Required Documentation

CRITICAL - Read these files in order:

1. **@docs/phase-5-prompts.md** ⭐ PRIMARY GUIDE
   - Contains all 4 task specifications
   - Complete implementation code examples
   - Acceptance criteria for each task
   - Testing checklists

2. **@docs/sdk-investigation-results.md** ⭐ CRITICAL SDK REFERENCE
   - Section 2: Agent Methods (client.agent.*)
   - Section 4: LLM Methods (client.llm.*)
   - Section 5: Conversation Flow Methods (client.conversationFlow.*)
   - Section 7: Error Handling patterns

3. **Existing Services** (Phase 1 work):
   - @src/services/retell-client.ts - Use getRetellClient() to get SDK client
   - @src/services/output-formatter.ts - Use outputJson() and handleSdkError()
   - @src/services/config.ts - Config already loaded by client service

4. **Existing Agent Commands** (Phase 4 work):
   - @src/commands/agents/list.ts - Example of SDK usage
   - @src/commands/agents/info.ts - Example of error handling

5. **@src/index.ts** - Update placeholder prompts commands to use real implementations

---

📋 Phase 5 Tasks Breakdown

═══════════════════════════════════════════════════════════════════════════════

Task 5.1: Prompt Type Resolution Service (60-90 min) ⚠️ MOST CRITICAL

File to create: src/services/prompt-resolver.ts

Deliverables:
- Implement service that resolves agent → prompt source
- Handle 3 response engine types: retell-llm, conversation-flow, custom-llm
- Extract prompts from LLM config or conversation flow
- Return standardized prompt structure
- Error handling for unsupported types
- Unit tests in tests/unit/prompt-resolver.test.ts

Key Logic Flow:

```typescript
async function resolvePromptSource(agentId: string) {
  // 1. Get agent details
  const agent = await client.agent.retrieve(agentId);

  // 2. Check response engine type
  if (agent.response_engine.type === 'retell-llm') {
    // 3a. Fetch LLM config
    const llm = await client.llm.retrieve(agent.response_engine.llm_id);
    return {
      type: 'retell-llm',
      llmId: llm.llm_id,
      agentName: agent.agent_name,
      prompts: {
        general_prompt: llm.general_prompt,
        begin_message: llm.begin_message,
        states: llm.states,
      }
    };
  }

  if (agent.response_engine.type === 'conversation-flow') {
    // 3b. Fetch conversation flow
    const flow = await client.conversationFlow.retrieve(
      agent.response_engine.conversation_flow_id
    );
    return {
      type: 'conversation-flow',
      flowId: flow.conversation_flow_id,
      agentName: agent.agent_name,
      prompts: {
        global_prompt: flow.global_prompt,
        nodes: flow.nodes,
      }
    };
  }

  if (agent.response_engine.type === 'custom-llm') {
    // 3c. Custom LLM not supported
    throw new Error('Custom LLM agents do not support prompt management');
  }
}
```

Response Engine Types:
- **retell-llm**: Uses Retell's built-in LLM (has llm_id)
- **conversation-flow**: Uses conversation flow (has conversation_flow_id)
- **custom-llm**: Uses custom WebSocket (NOT SUPPORTED for prompt management)

---

Task 5.2: Prompts Pull Command (45-60 min)

File to create: src/commands/prompts/pull.ts

Deliverables:
- Implement `retell prompts pull <agent_id>` command
- Use prompt-resolver service to get prompts
- Save prompts to local files (.retell-prompts/<agent_id>/)
- Create different file structures for retell-llm vs conversation-flow
- Handle agent not found errors
- Unit tests in tests/unit/prompts/pull.test.ts

File Structure for retell-llm:
```
.retell-prompts/<agent_id>/
├── metadata.json          # Agent info + type
├── general_prompt.md      # Main system prompt
├── begin_message.txt      # Initial greeting
└── states/                # State-specific prompts (if any)
    ├── state1.md
    └── state2.md
```

File Structure for conversation-flow:
```
.retell-prompts/<agent_id>/
├── metadata.json          # Agent info + type
├── global_prompt.md       # Global instructions
└── nodes.json             # Flow nodes structure
```

Command signature:
```bash
retell prompts pull <agent_id> [--output <dir>]
```

---

Task 5.3: Prompts Update Command (60-90 min) ⚠️ COMPLEX

File to create: src/commands/prompts/update.ts

Deliverables:
- Implement `retell prompts update <agent_id>` command
- Read prompts from local files (.retell-prompts/<agent_id>/)
- Use prompt-resolver to determine update method
- Call client.llm.update() for retell-llm
- Call client.conversationFlow.update() for conversation-flow
- Handle validation errors from API
- Show diff summary before/after update
- Unit tests in tests/unit/prompts/update.test.ts

Update Logic:

```typescript
// For retell-llm agents
const resolved = await resolvePromptSource(agentId);
if (resolved.type === 'retell-llm') {
  const updatedPrompts = readLocalPrompts(agentId);
  await client.llm.update(resolved.llmId, {
    general_prompt: updatedPrompts.general_prompt,
    begin_message: updatedPrompts.begin_message,
    states: updatedPrompts.states,
  });
}

// For conversation-flow agents
if (resolved.type === 'conversation-flow') {
  const updatedPrompts = readLocalPrompts(agentId);
  await client.conversationFlow.update(resolved.flowId, {
    global_prompt: updatedPrompts.global_prompt,
    nodes: updatedPrompts.nodes,
  });
}
```

Command signature:
```bash
retell prompts update <agent_id> [--source <dir>]
```

---

Task 5.4: Agent Publish Command (30-45 min)

File to create: src/commands/agent/publish.ts

Deliverables:
- Implement `retell agent-publish <agent_id>` command
- Use client.agent.publish(agentId)
- Show success message with new version number
- Handle errors (agent not found, already published, etc.)
- Unit tests in tests/unit/agent/publish.test.ts

SDK Call:
```typescript
const client = getRetellClient();
const publishedAgent = await client.agent.publish(agentId);

outputJson({
  message: 'Agent published successfully',
  agent_id: publishedAgent.agent_id,
  version: publishedAgent.version,
  is_published: publishedAgent.is_published,
});
```

Command signature:
```bash
retell agent-publish <agent_id>
```

---

📚 Critical SDK Reference

From @docs/sdk-investigation-results.md:

Agent Methods:
```typescript
client.agent.retrieve(agentId)        // Get agent details
client.agent.publish(agentId)         // Publish draft agent
```

LLM Methods (for retell-llm agents):
```typescript
client.llm.retrieve(llmId)            // Get LLM config
client.llm.update(llmId, {            // Update LLM config
  general_prompt: string,
  begin_message: string,
  states: array,
})
```

Conversation Flow Methods (for conversation-flow agents):
```typescript
client.conversationFlow.retrieve(flowId)  // Get flow config
client.conversationFlow.update(flowId, {  // Update flow config
  global_prompt: string,
  nodes: array,
})
```

Response Engine Structure:
```typescript
agent.response_engine = {
  type: 'retell-llm' | 'conversation-flow' | 'custom-llm',
  llm_id?: string,                    // if type === 'retell-llm'
  conversation_flow_id?: string,      // if type === 'conversation-flow'
  llm_websocket_url?: string,         // if type === 'custom-llm'
}
```

---

🧪 Testing Requirements

Unit Tests for Each Component:

1. **tests/unit/prompt-resolver.test.ts** (~15-20 tests):
   - Resolve retell-llm agent successfully
   - Resolve conversation-flow agent successfully
   - Handle custom-llm (should error)
   - Handle agent not found
   - Handle LLM/flow not found
   - Verify correct SDK calls
   - Test all error scenarios

2. **tests/unit/prompts/pull.test.ts** (~12-15 tests):
   - Pull retell-llm prompts successfully
   - Pull conversation-flow prompts successfully
   - Create correct file structure
   - Handle agent not found
   - Handle custom-llm error
   - Verify file contents
   - Test output directory option

3. **tests/unit/prompts/update.test.ts** (~15-20 tests):
   - Update retell-llm prompts successfully
   - Update conversation-flow prompts successfully
   - Read local files correctly
   - Handle validation errors
   - Handle missing local files
   - Handle custom-llm error
   - Verify correct SDK update calls

4. **tests/unit/agent/publish.test.ts** (~8-10 tests):
   - Publish agent successfully
   - Handle agent not found
   - Handle already published
   - Handle validation errors
   - Verify output format

Testing Pattern (same as Phases 3-4):
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import Retell from 'retell-sdk';

vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');

describe('Prompt Resolver Service', () => {
  let mockClient: any;
  let exitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { agent: {}, llm: {}, conversationFlow: {} };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient as any);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  // Tests here...
});
```

---

📁 Directory Structure to Create

```
src/
├── services/
│   └── prompt-resolver.ts          # NEW - Task 5.1
├── commands/
│   ├── prompts/
│   │   ├── pull.ts                 # NEW - Task 5.2
│   │   └── update.ts               # NEW - Task 5.3
│   └── agent/
│       └── publish.ts              # NEW - Task 5.4

tests/unit/
├── prompt-resolver.test.ts         # NEW - Task 5.1
├── prompts/
│   ├── pull.test.ts                # NEW - Task 5.2
│   └── update.test.ts              # NEW - Task 5.3
└── agent/
    └── publish.test.ts             # NEW - Task 5.4
```

---

🔄 Update src/index.ts

Replace the placeholder prompts commands with real implementations:

```typescript
import { pullPromptsCommand } from './commands/prompts/pull';
import { updatePromptsCommand } from './commands/prompts/update';
import { publishAgentCommand } from './commands/agent/publish';

// Update prompts pull (currently lines 98-103)
prompts
  .command('pull <agent_id>')
  .description('Pull prompts for an agent')
  .option('-o, --output <dir>', 'Output directory', '.retell-prompts')
  .action(async (agentId, options) => {
    await pullPromptsCommand(agentId, options);
  });

// Update prompts update (currently lines 105-111)
prompts
  .command('update <agent_id>')
  .description('Update prompts for an agent')
  .option('-s, --source <dir>', 'Source directory', '.retell-prompts')
  .action(async (agentId, options) => {
    await updatePromptsCommand(agentId, options);
  });

// Update agent publish (currently lines 114-120)
program
  .command('agent-publish <agent_id>')
  .description('Publish an agent')
  .action(async (agentId) => {
    await publishAgentCommand(agentId);
  });
```

---

✅ Success Criteria

Before marking Phase 5 complete, verify:

Build & Tests:
- [ ] npm run build compiles successfully
- [ ] npm run test:run passes all tests (should have 180+ tests total)
- [ ] All 4 tasks implemented with full unit test coverage

Prompt Resolver Service:
- [ ] Resolves retell-llm agents correctly
- [ ] Resolves conversation-flow agents correctly
- [ ] Rejects custom-llm agents with clear error
- [ ] Handles all error cases (not found, auth, etc.)

Prompts Pull Command:
- [ ] retell prompts pull <agent_id> creates correct file structure
- [ ] Works for both retell-llm and conversation-flow agents
- [ ] Saves prompts to .retell-prompts/<agent_id>/
- [ ] Creates readable markdown/json files
- [ ] Handles errors gracefully

Prompts Update Command:
- [ ] retell prompts update <agent_id> reads local files
- [ ] Updates retell-llm agents via client.llm.update()
- [ ] Updates conversation-flow agents via client.conversationFlow.update()
- [ ] Shows success message with details
- [ ] Handles validation errors from API

Agent Publish Command:
- [ ] retell agent-publish <agent_id> publishes agent
- [ ] Shows new version number
- [ ] Handles already-published agents
- [ ] Clear error messages

Documentation:
- [ ] Phase 5 marked complete in @docs/phase-5-prompts.md
- [ ] Phase 5 marked complete in @docs/PHASES-INDEX.md
- [ ] All task checkboxes checked off

---

🔀 Committing & Creating Pull Request

As You Work (Incremental Commits):

```bash
# After completing Task 5.1 (prompt resolver)
git add src/services/prompt-resolver.ts tests/unit/prompt-resolver.test.ts
git commit -m "feat: implement prompt type resolution service

- Add prompt-resolver.ts to handle agent → prompt source resolution
- Support retell-llm agents (client.llm.retrieve)
- Support conversation-flow agents (client.conversationFlow.retrieve)
- Reject custom-llm agents with helpful error
- Add comprehensive unit tests (15-20 tests)
- Handle all error scenarios

Part of Phase 5 - Task 5.1 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# After completing Task 5.2 (pull command)
git add src/commands/prompts/pull.ts tests/unit/prompts/pull.test.ts src/index.ts
git commit -m "feat: implement prompts pull command

- Add pull.ts to download prompts to local files
- Create .retell-prompts/<agent_id>/ directory structure
- Support retell-llm and conversation-flow file formats
- Save prompts as readable markdown/json files
- Add unit tests with full coverage (12-15 tests)
- Update src/index.ts to use real command

Part of Phase 5 - Task 5.2 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# After completing Task 5.3 (update command)
git add src/commands/prompts/update.ts tests/unit/prompts/update.test.ts src/index.ts
git commit -m "feat: implement prompts update command

- Add update.ts to upload local prompt changes
- Read prompts from .retell-prompts/<agent_id>/
- Update retell-llm via client.llm.update()
- Update conversation-flow via client.conversationFlow.update()
- Handle validation errors from API
- Add unit tests with full coverage (15-20 tests)
- Update src/index.ts to use real command

Part of Phase 5 - Task 5.3 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# After completing Task 5.4 (publish command)
git add src/commands/agent/publish.ts tests/unit/agent/publish.test.ts src/index.ts
git commit -m "feat: implement agent publish command

- Add publish.ts with client.agent.publish() integration
- Show success message with version number
- Handle errors (not found, already published)
- Add unit tests with full coverage (8-10 tests)
- Update src/index.ts to use real command

Part of Phase 5 - Task 5.4 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Final Phase 5 Completion:

```bash
# Update documentation
git add docs/phase-5-prompts.md docs/PHASES-INDEX.md

git commit -m "docs: Phase 5 complete - prompt management

All prompt management commands implemented and tested:
- Prompt type resolution service
- prompts pull <agent_id>
- prompts update <agent_id>
- agent-publish <agent_id>

Testing:
- 50+ new unit tests covering all flows
- All 180+ tests passing
- Manual testing completed

Updated documentation:
- phase-5-prompts.md marked complete
- PHASES-INDEX.md updated to 67% progress (16/24 tasks)

Ready for Phase 6: Testing & Quality

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch to remote
git push -u origin phase-5-prompts

# Create Pull Request
gh pr create \
  --title "Phase 5: Prompt Management Implementation" \
  --body "$(cat <<'PRBODY'
## Phase 5: Prompt Management

This PR implements the complete prompt management system for the Retell CLI.

### Components Implemented

1. **Prompt Type Resolution Service**
   - Determines agent response engine type
   - Resolves agent → LLM config or conversation flow
   - Handles retell-llm, conversation-flow, and custom-llm types
   - Returns standardized prompt structure

2. **`retell prompts pull <agent_id> [--output <dir>]`**
   - Downloads agent prompts to local files
   - Creates `.retell-prompts/<agent_id>/` directory
   - Different file structures for LLM vs flow agents
   - Saves prompts as readable markdown/json

3. **`retell prompts update <agent_id> [--source <dir>]`**
   - Uploads local prompt changes to Retell
   - Reads from `.retell-prompts/<agent_id>/`
   - Updates via `client.llm.update()` or `client.conversationFlow.update()`
   - Handles validation errors gracefully

4. **`retell agent-publish <agent_id>`**
   - Publishes agent draft to production
   - Shows new version number on success
   - Handles already-published agents

### Testing

- **Unit Tests:** 50+ new tests added
- **Total Tests:** 180+ passing
- **Coverage:** All services, commands, error handling, edge cases
- **Manual Testing:** All commands verified with real API

### Files Added

```
src/
├── services/
│   └── prompt-resolver.ts
├── commands/
│   ├── prompts/
│   │   ├── pull.ts
│   │   └── update.ts
│   └── agent/
│       └── publish.ts

tests/unit/
├── prompt-resolver.test.ts
├── prompts/
│   ├── pull.test.ts
│   └── update.test.ts
└── agent/
    └── publish.test.ts
```

### Files Modified

- `src/index.ts` - Integrated all prompt commands
- `docs/phase-5-prompts.md` - Marked phase complete
- `docs/PHASES-INDEX.md` - Updated progress (67% complete)

### Success Criteria

- [x] All 4 tasks implemented
- [x] Unit tests passing (180+/180+)
- [x] Handles all 3 response engine types
- [x] File I/O working correctly
- [x] Manual testing completed
- [x] Error handling verified
- [x] Documentation updated

### Next Steps

Ready to proceed to **Phase 6: Testing & Quality**

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)" \
  --base main \
  --head phase-5-prompts
```

If gh CLI is not available:
```bash
# Push branch
git push -u origin phase-5-prompts

# Then manually create PR at:
# https://github.com/awccom/retell-cli/compare/main...phase-5-prompts
```

---

⚠️ Important Notes & Tips

Prompt Resolution Complexity:

The prompt resolver is the most critical piece. It must:
1. Fetch agent details
2. Determine response engine type
3. Fetch the correct config (LLM or flow)
4. Extract prompts in the right format
5. Handle all error cases

Response Engine Type Handling:

```typescript
// retell-llm agents have:
agent.response_engine.llm_id → use client.llm.retrieve(llm_id)

// conversation-flow agents have:
agent.response_engine.conversation_flow_id → use client.conversationFlow.retrieve(flow_id)

// custom-llm agents have:
agent.response_engine.llm_websocket_url → NOT SUPPORTED (throw error)
```

File I/O Best Practices:

- Use Node.js `fs` module with async methods
- Create directories with `fs.mkdir(path, { recursive: true })`
- Write readable files (markdown for prompts, JSON for metadata)
- Handle file not found errors gracefully
- Validate JSON structure before parsing

Error Handling Patterns:

```typescript
// Use existing handleSdkError for SDK errors
try {
  const agent = await client.agent.retrieve(agentId);
} catch (error) {
  handleSdkError(error);  // Handles NotFoundError, AuthError, etc.
}

// For custom errors (file I/O, validation)
if (!fs.existsSync(promptFile)) {
  outputError(`Prompts not found. Run 'retell prompts pull ${agentId}' first`, 'FILE_NOT_FOUND');
}
```

Testing File I/O:

- Mock `fs` module in tests
- Verify correct file paths
- Verify correct file contents
- Test directory creation
- Test missing file scenarios

Common Pitfalls to Avoid:

- ❌ Don't forget to handle all 3 response engine types
- ❌ Don't use synchronous fs methods (use async/promises)
- ❌ Don't hardcode file paths (use path.join())
- ❌ Don't forget to create directories before writing files
- ❌ Don't skip validation of local prompt files
- ❌ Don't forget to update src/index.ts with all commands

---

📖 Reference: Key Documentation Sections

**SDK Investigation Results (docs/sdk-investigation-results.md):**
- Lines 41-91: Agent Methods
- Lines 178-217: LLM Methods ⭐ CRITICAL
- Lines 219-254: Conversation Flow Methods ⭐ CRITICAL
- Lines 307-365: Error Handling

**Phase 5 Guide (docs/phase-5-prompts.md):**
- Complete task specifications
- Code examples for each task
- Acceptance criteria
- Testing checklists

**Existing Code Examples:**
- src/commands/agents/list.ts - SDK usage pattern
- src/commands/agents/info.ts - Error handling pattern
- tests/unit/agents/list.test.ts - Testing pattern

---

🚀 Getting Started Checklist

Before you begin coding:

1. [ ] Checked out `main` branch and pulled latest
2. [ ] Verified 130 tests passing
3. [ ] Created `phase-5-prompts` branch
4. [ ] Read docs/phase-5-prompts.md completely
5. [ ] Read SDK sections on LLM and ConversationFlow
6. [ ] Understand the 3 response engine types
7. [ ] Ready to start with Task 5.1 (prompt resolver)

Start with Task 5.1 - it's the foundation for all other tasks!

---

📊 Expected Deliverables

By the end of Phase 5, you should have:

- ✅ 1 new service file (prompt-resolver.ts)
- ✅ 4 new command files (pull.ts, update.ts, publish.ts, and their directories)
- ✅ 4 new test files (matching each component)
- ✅ src/index.ts updated with all 3 commands
- ✅ 50+ new unit tests passing
- ✅ All 180+ total tests passing
- ✅ Documentation updated (phase-5-prompts.md, PHASES-INDEX.md)
- ✅ All code committed to phase-5-prompts branch
- ✅ Pull request opened to merge into main
- ✅ Ready to proceed to Phase 6 (Testing & Quality)

---

🎯 Start Task 5.1: Prompt Type Resolution Service

This is the foundation. Get this right and the rest will flow smoothly!

Good luck! 🚀

═══════════════════════════════════════════════════════════════════════════════
