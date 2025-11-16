📋 PHASE 4 HANDOFF: Agent Commands Implementation

═══════════════════════════════════════════════════════════════════════════════

  Project Context

  Repository: https://github.com/awccom/retell-cli.git
  Project: Retell AI CLI - Command-line tool for transcript analysis and prompt management
  Current Status: Phase 3 Complete ✅ - All transcript commands working
  Progress: 10/24 tasks complete (42%)

  ---
  Your Mission

  Implement Phase 4: Agent Commands for the Retell CLI project.

  This phase adds two commands that allow users to list agents and retrieve detailed
  agent information from their Retell AI account.

  ---
  Phase 4 Overview

  Total Tasks: 2
  Estimated Time: 1-1.5 hours
  Prerequisites: Phase 3 complete ✅

  What You're Building:

  1. retell agents list - List all agents with pagination
  2. retell agents info <agent_id> - Get detailed agent configuration

  ---
  Setup Instructions

  1. Start Fresh Session

  cd /home/devon/claude/retell-cli

  # Create new branch for Phase 4
  git checkout -b phase-4-agents

  # Verify you're on the right branch
  git branch --show-current
  # Should output: phase-4-agents

  # Verify Phase 3 is complete
  npm run test:run
  # Should show: 109 tests passing

  npm run build
  # Should build successfully

  2. Read Required Documentation

  CRITICAL - Read these files in order:

  1. @docs/phase-4-agents.md ⭐ PRIMARY GUIDE
    - Contains both task specifications
    - Complete implementation code examples
    - Acceptance criteria for each task
    - Testing checklists
  2. @docs/sdk-investigation-results.md ⭐ CRITICAL SDK REFERENCE
    - Section 2: Agent Methods (client.agent.*)
    - Agent response structure with all fields
    - Section 7: Error Handling patterns
  3. Existing Services (Phase 1 work):
    - @src/services/retell-client.ts - Use getRetellClient() to get SDK client
    - @src/services/output-formatter.ts - Use outputJson() and handleSdkError()
    - @src/services/config.ts - Config already loaded by client service
  4. @src/index.ts - Update placeholder commands to use real implementations

  ---
  Phase 4 Tasks Breakdown

  Task 4.1: List Agents Command (30-40 min)

  File to create: src/commands/agents/list.ts

  Deliverables:
  - Implement retell agents list command
  - Use client.agent.list({ limit: options.limit || 100 })
  - Support --limit <number> option (default: 100)
  - Format output to show key fields clearly
  - Error handling with handleSdkError()
  - Unit tests in tests/unit/agents/list.test.ts

  Key SDK Method:
  const client = getRetellClient();
  const agents = await client.agent.list({ limit: 100 });

  Output Format - Format the response for clarity:
  const formatted = agents.map(agent => ({
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

  Command signature:
  retell agents list [--limit <number>]

  ---
  Task 4.2: Agent Info Command (30-40 min)

  File to create: src/commands/agents/info.ts

  Deliverables:
  - Implement retell agents info <agent_id> command
  - Use client.agent.retrieve(agentId)
  - Output complete agent object with all fields
  - Handle NotFoundError for invalid agent IDs
  - Error handling with handleSdkError()
  - Unit tests in tests/unit/agents/info.test.ts

  Key SDK Method:
  const client = getRetellClient();
  const agent = await client.agent.retrieve(agentId);
  outputJson(agent); // Full agent object

  Command signature:
  retell agents info <agent_id>

  Note: The --version flag is optional for this phase. You can implement it
  if time permits, but it's not required for phase completion.

  ---
  Critical SDK Reference

  From @docs/sdk-investigation-results.md:

  Available Agent Methods

  client.agent.list(params)          // List all agents
  client.agent.retrieve(agentId)     // Get single agent
  client.agent.create(params)        // Create agent
  client.agent.update(agentId, params) // Update agent
  client.agent.delete(agentId)       // Delete agent
  client.agent.publish(agentId)      // Publish agent draft

  Agent Response Fields (Most Important)

  {
    agent_id: string,
    agent_name: string,
    channel: string,
    version: number,
    is_published: boolean,
    version_title: string,
    last_modification_timestamp: number,

    // Response Engine - CRITICAL FIELD
    response_engine: {
      type: 'retell-llm' | 'conversation-flow' | 'custom-llm',
      llm_id?: string,              // if type === 'retell-llm'
      conversation_flow_id?: string, // if type === 'conversation-flow'
      llm_websocket_url?: string,   // if type === 'custom-llm'
    },

    // Voice Configuration
    voice_id: string,
    voice_temperature: number,
    voice_speed: number,
    voice_model: string,
    language: string,

    // Behavior Settings
    responsiveness: number,
    interruption_sensitivity: number,
    enable_backchannel: boolean,
    backchannel_frequency: number,
    backchannel_words: string[],
    reminder_trigger_ms: number,
    reminder_max_count: number,

    // Integration
    webhook_url: string,
    boosted_keywords: string[],
    ambient_sound: string,
    ambient_sound_volume: number,

    // ... many more fields
  }

  ---
  Implementation Template

  Directory Structure to Create

  src/commands/agents/
  ├── list.ts
  └── info.ts

  tests/unit/agents/
  ├── list.test.ts
  └── info.test.ts

  Example: list.ts

  import { getRetellClient } from '../../services/retell-client';
  import { outputJson, handleSdkError } from '../../services/output-formatter';

  interface ListAgentsOptions {
    limit?: number;
  }

  export async function listAgentsCommand(options: ListAgentsOptions) {
    try {
      const client = getRetellClient();
      const agents = await client.agent.list({
        limit: options.limit || 100,
      });

      // Format for cleaner output
      const formatted = agents.map(agent => ({
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

  Example: info.ts

  import { getRetellClient } from '../../services/retell-client';
  import { outputJson, handleSdkError } from '../../services/output-formatter';

  export async function agentInfoCommand(agentId: string) {
    try {
      const client = getRetellClient();
      const agent = await client.agent.retrieve(agentId);

      // Output full agent object
      outputJson(agent);
    } catch (error) {
      handleSdkError(error);
    }
  }

  Update src/index.ts

  Replace the placeholder agent commands with real implementations:

  import { listAgentsCommand } from './commands/agents/list';
  import { agentInfoCommand } from './commands/agents/info';

  // Update agents list
  agents
    .command('list')
    .description('List all agents')
    .option('-l, --limit <number>', 'Maximum number of agents to return', '100')
    .action(async (options) => {
      await listAgentsCommand({
        limit: parseInt(options.limit, 10),
      });
    });

  // Update agents info
  agents
    .command('info <agent_id>')
    .description('Get agent information')
    .action(async (agentId) => {
      await agentInfoCommand(agentId);
    });

  ---
  Testing Requirements

  Unit Tests for Each Command

  Test Coverage Required:
  1. list.test.ts:
    - Successful list with default limit
    - List with custom limit
    - List with no results (empty array)
    - Verify formatted output structure
    - Test all three response_engine types
    - SDK error handling (auth, network, etc.)
  2. info.test.ts:
    - Successful agent retrieval
    - Agent not found (NotFoundError)
    - Invalid agent ID
    - Verify all fields present in output
    - Test different response_engine types
    - SDK error handling

  Testing Pattern (same as Phase 3):

  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
  import { listAgentsCommand } from '../../../src/commands/agents/list';
  import * as retellClient from '../../../src/services/retell-client';
  import * as outputFormatter from '../../../src/services/output-formatter';
  import Retell from 'retell-sdk';

  // Mock modules
  vi.mock('../../../src/services/retell-client');
  vi.mock('../../../src/services/output-formatter');

  describe('List Agents Command', () => {
    let mockClient: any;
    let mockAgentList: any;
    let exitSpy: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockAgentList = vi.fn();
      mockClient = {
        agent: {
          list: mockAgentList,
        },
      };

      vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient as any);
      vi.mocked(outputFormatter.outputJson).mockImplementation(() => {});
      vi.mocked(outputFormatter.handleSdkError).mockImplementation((() => {
        process.exit(1);
      }) as any);

      // Mock process.exit
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      exitSpy.mockRestore();
    });

    it('should list agents with default limit', async () => {
      const mockAgents = [
        {
          agent_id: 'agent-1',
          agent_name: 'Test Agent',
          version: 1,
          is_published: true,
          response_engine: {
            type: 'retell-llm',
            llm_id: 'llm-123',
          },
        },
      ];

      mockAgentList.mockResolvedValue(mockAgents);

      await listAgentsCommand({});

      expect(mockAgentList).toHaveBeenCalledWith({ limit: 100 });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith([
        {
          agent_id: 'agent-1',
          agent_name: 'Test Agent',
          version: 1,
          is_published: true,
          response_engine_type: 'retell-llm',
          response_engine_id: 'llm-123',
        },
      ]);
    });

    // Add more tests...
  });

  Manual Testing Checklist

  # Build
  npm run build

  # Test list (requires login first)
  ./dist/index.js agents list
  ./dist/index.js agents list --limit 10

  # Test info (replace with real agent_id from list output)
  ./dist/index.js agents info <agent_id>

  # Test errors
  ./dist/index.js agents info invalid-id
  # Should show NotFoundError

  ---
  Success Criteria

  Before marking Phase 4 complete, verify:

  - npm run build compiles successfully
  - npm run test:run passes all tests (should have 120+ tests total)
  - retell agents list returns array of formatted agents
  - retell agents list --limit 10 respects limit option
  - retell agents info <agent_id> returns full agent object
  - retell agents info invalid-id shows helpful NotFoundError
  - Both commands handle authentication errors gracefully
  - Output clearly shows response_engine type and ID
  - Phase 4 marked complete in @docs/phase-4-agents.md
  - Phase 4 marked complete in @docs/PHASES-INDEX.md
  - All unit tests passing (aim for ~15-20 new tests)

  ---
  Committing & Creating Pull Request

  As You Work (Incremental Commits)

  # After completing Task 4.1 (list command)
  git add src/commands/agents/list.ts tests/unit/agents/list.test.ts src/index.ts
  git commit -m "feat: implement agents list command

  - Add list.ts with client.agent.list() integration
  - Support --limit option (default: 100)
  - Format output to show key agent fields
  - Add unit tests with full coverage
  - Update src/index.ts to use real command

  Part of Phase 4 - Task 4.1 complete

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"

  # After completing Task 4.2 (info command)
  git add src/commands/agents/info.ts tests/unit/agents/info.test.ts src/index.ts
  git commit -m "feat: implement agents info command

  - Add info.ts with client.agent.retrieve() integration
  - Handle NotFoundError for invalid agent IDs
  - Output complete agent configuration
  - Add unit tests with error handling
  - Update src/index.ts to use real command

  Part of Phase 4 - Task 4.2 complete

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"

  Final Phase 4 Completion

  # Update documentation
  git add docs/phase-4-agents.md docs/PHASES-INDEX.md

  git commit -m "docs: Phase 4 complete - agent commands

  Both agent commands implemented and tested:
  - agents list (with --limit option)
  - agents info <agent_id>

  Testing:
  - 15-20 new unit tests covering all flows
  - All 120+ tests passing
  - Manual testing completed

  Updated documentation:
  - phase-4-agents.md marked complete
  - PHASES-INDEX.md updated to 50% progress (12/24 tasks)

  Ready for Phase 5: Prompt Management

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"

  # Push branch to remote
  git push -u origin phase-4-agents

  # Open Pull Request
  gh pr create \
    --title "Phase 4: Agent Commands Implementation" \
    --body "$(cat <<'PRBODY'
  ## Phase 4: Agent Commands

  This PR implements both agent-related commands for the Retell CLI.

  ### Commands Implemented

  1. **`retell agents list [--limit <n>]`**
     - Lists all agents with formatted output
     - Supports optional limit parameter (default: 100)
     - Shows response_engine type and ID clearly
     - Returns formatted array of agent objects

  2. **`retell agents info <agent_id>`**
     - Retrieves detailed configuration for specific agent
     - Returns complete agent object with all fields
     - Handles NotFoundError for invalid IDs

  ### Testing

  - **Unit Tests:** 15-20 new tests added
  - **Total Tests:** 120+ passing
  - **Coverage:** All commands, error handling, edge cases
  - **Manual Testing:** All commands verified with real API

  ### Files Added

  src/commands/agents/
  ├── list.ts
  └── info.ts

  tests/unit/agents/
  ├── list.test.ts
  └── info.test.ts

  ### Files Modified

  - `src/index.ts` - Integrated both agent commands
  - `docs/phase-4-agents.md` - Marked phase complete
  - `docs/PHASES-INDEX.md` - Updated progress (50% complete)

  ### Success Criteria

  - [x] Both commands implemented
  - [x] Unit tests passing (120+/120+)
  - [x] Manual testing completed
  - [x] Error handling verified
  - [x] Documentation updated

  ### Next Steps

  Ready to proceed to **Phase 5: Prompt Management** (most complex phase)

  ---

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  PRBODY
  )" \
    --base main \
    --head phase-4-agents

  If gh CLI is not available:
  # Push branch
  git push -u origin phase-4-agents

  # Then manually create PR at:
  # https://github.com/awccom/retell-cli/compare/main...phase-4-agents

  ---
  Important Notes & Tips

  SDK Usage Patterns

  - Always use getRetellClient() to get the SDK client
  - Always use handleSdkError() for error handling
  - Always use outputJson() for output
  - The client will automatically handle authentication via config service

  Response Engine Types

  The response_engine field is CRITICAL and has three possible types:

  1. 'retell-llm' - Uses Retell's built-in LLM
     - Has llm_id field
  2. 'conversation-flow' - Uses conversation flow
     - Has conversation_flow_id field
  3. 'custom-llm' - Uses custom WebSocket LLM
     - Has llm_websocket_url field

  Make sure your formatted output shows the type AND the corresponding ID clearly.

  Error Handling

  - NotFoundError → "Resource not found"
  - AuthenticationError → "Invalid API key. Run retell login"
  - APIError → Generic API error with message
  - All errors exit with code 1

  Testing Best Practices

  - Mock getRetellClient() to return mock SDK client
  - Mock client.agent.list() and client.agent.retrieve()
  - Mock outputJson() and handleSdkError()
  - Add exitSpy to prevent actual process.exit() in tests
  - Test happy path AND all error scenarios
  - Verify exact calls to SDK methods
  - Test all three response_engine types

  Common Pitfalls to Avoid

  - ❌ Don't call SDK methods directly - use the client service
  - ❌ Don't use console.log() - use outputJson()
  - ❌ Don't implement custom error formatting - use handleSdkError()
  - ❌ Don't forget to handle NotFoundError for info command
  - ❌ Don't forget to add process.exit spy in tests
  - ❌ Don't skip testing different response_engine types

  ---
  Reference: SDK Investigation Results

  Key sections from @docs/sdk-investigation-results.md:

  Section 2: Agent Methods (Lines 41-91)
  - All available client.agent.* methods
  - Agent list response structure
  - Field descriptions

  Section 7: Error Handling (Lines 307-365)
  - Error class hierarchy
  - How to catch specific errors
  - Error response structure

  ---
  Getting Started

  # 1. Checkout new branch
  git checkout -b phase-4-agents

  # 2. Verify tests pass
  npm run test:run

  # 3. Read documentation
  cat docs/phase-4-agents.md
  cat docs/sdk-investigation-results.md

  # 4. Start with Task 4.1 (list command)
  # Create src/commands/agents/list.ts
  # Create tests/unit/agents/list.test.ts
  # Update src/index.ts

  # 5. Test, commit, then move to Task 4.2

  ---
  Expected Deliverables

  By the end of Phase 4, you should have:
  - ✅ 2 new command files in src/commands/agents/
  - ✅ 2 new test files in tests/unit/agents/
  - ✅ src/index.ts updated with both commands
  - ✅ 15-20 new unit tests passing
  - ✅ Documentation updated (phase-4-agents.md, PHASES-INDEX.md)
  - ✅ All code committed to phase-4-agents branch
  - ✅ Pull request opened to merge into main
  - ✅ Ready to proceed to Phase 5 (Prompt Management - most complex!)

  ---
  Start now with Task 4.1 in @docs/phase-4-agents.md

  Good luck! 🚀

  ═══════════════════════════════════════════════════════════════════════════════
