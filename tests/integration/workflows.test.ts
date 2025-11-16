/**
 * Integration Tests for CLI Workflows
 *
 * These tests verify end-to-end functionality by testing complete workflows
 * involving multiple commands and services working together.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pullPromptsCommand } from '../../src/commands/prompts/pull';
import { updatePromptsCommand } from '../../src/commands/prompts/update';
import { publishAgentCommand } from '../../src/commands/agent/publish';
import * as promptResolver from '../../src/services/prompt-resolver';
import * as retellClient from '../../src/services/retell-client';
import * as outputFormatter from '../../src/services/output-formatter';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../src/services/prompt-resolver');
vi.mock('../../src/services/retell-client');
vi.mock('../../src/services/output-formatter');

describe('Integration Tests: Prompt Management Workflow', () => {
  const TEST_AGENT_ID = 'test-agent-123';
  let TEST_DIR: string;
  let mockClient: any;
  let exitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create unique temporary directory for each test
    TEST_DIR = mkdtempSync(join(tmpdir(), 'retell-test-'));

    // Setup mock client
    mockClient = {
      agent: {
        retrieve: vi.fn(),
        update: vi.fn(),
        publish: vi.fn(),
      },
      llm: {
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      conversationFlow: {
        retrieve: vi.fn(),
        update: vi.fn(),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient as any);
    vi.mocked(outputFormatter.outputJson).mockImplementation(() => {});
    vi.mocked(outputFormatter.outputError).mockImplementation((() => {
      process.exit(1);
    }) as any);
    vi.mocked(outputFormatter.handleSdkError).mockImplementation((() => {
      process.exit(1);
    }) as any);

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy?.mockRestore();

    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Global cleanup to ensure process.exit mock is always restored
    exitSpy?.mockRestore();
  });

  describe('Full Retell LLM Workflow', () => {
    it('should complete pull → edit → update → publish workflow', async () => {
      const mockAgent = {
        agent_id: TEST_AGENT_ID,
        agent_name: 'Integration Test Agent',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-test-456',
        },
        version: 1,
      };

      const mockLlm = {
        llm_id: 'llm-test-456',
        version: 1,
        general_prompt: 'You are a helpful assistant.',
        begin_message: 'Hello! How can I help you?',
        states: [
          {
            name: 'greeting',
            state_prompt: 'Greet the user warmly.',
          },
        ],
      };

      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-test-456',
        agentName: 'Integration Test Agent',
        prompts: mockLlm,
      };

      // Setup mocks for pull
      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Step 1: Pull prompts
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Verify directory structure was created
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'metadata.json'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'begin_message.txt'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'states', 'greeting.md'))).toBe(true);

      // Step 2: Verify file contents
      const generalPrompt = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        'utf-8'
      );
      expect(generalPrompt).toBe('You are a helpful assistant.');

      const beginMessage = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'begin_message.txt'),
        'utf-8'
      );
      expect(beginMessage).toBe('Hello! How can I help you?');

      const stateContent = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'states', 'greeting.md'),
        'utf-8'
      );
      expect(stateContent).toContain('# State: greeting');
      expect(stateContent).toContain('Greet the user warmly.');

      // Step 3: Edit prompts (simulate user editing files)
      writeFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        'You are an expert assistant with deep knowledge.'
      );

      writeFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'begin_message.txt'),
        'Hi there! What can I assist you with today?'
      );

      // Step 4: Update prompts (push changes back)
      mockClient.llm.update.mockResolvedValue({
        llm_id: 'llm-test-456',
        version: 2, // Version incremented
      });

      await updatePromptsCommand(TEST_AGENT_ID, { source: TEST_DIR });

      // Verify SDK update was called with modified prompts
      expect(mockClient.llm.update).toHaveBeenCalledWith(
        'llm-test-456',
        expect.objectContaining({
          general_prompt: 'You are an expert assistant with deep knowledge.',
          begin_message: 'Hi there! What can I assist you with today?',
          states: expect.arrayContaining([
            expect.objectContaining({
              name: 'greeting',
              state_prompt: 'Greet the user warmly.',
            }),
          ]),
        })
      );

      // Step 5: Publish agent
      mockClient.agent.publish.mockResolvedValue({
        agent_id: TEST_AGENT_ID,
        agent_name: 'Integration Test Agent',
        version: 2,
        is_published: true,
      });

      await publishAgentCommand(TEST_AGENT_ID);

      // Verify agent was published
      expect(mockClient.agent.publish).toHaveBeenCalledWith(TEST_AGENT_ID);

      // Verify success output was called
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Agent published successfully',
          agent_id: TEST_AGENT_ID,
          version: 2,
        })
      );
    });

    it('should handle workflow with minimal LLM (no states, no begin_message)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-minimal',
        agentName: 'Minimal Agent',
        prompts: {
          llm_id: 'llm-minimal',
          version: 1,
          general_prompt: 'Minimal prompt.',
          begin_message: undefined,
          states: undefined,
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Pull prompts
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Verify only metadata and general_prompt exist
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'metadata.json'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'begin_message.txt'))).toBe(false);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'states'))).toBe(false);

      // Edit prompt
      writeFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        'Updated minimal prompt.'
      );

      // Update prompts
      mockClient.llm.update.mockResolvedValue({ llm_id: 'llm-minimal', version: 2 });

      await updatePromptsCommand(TEST_AGENT_ID, { source: TEST_DIR });

      // Verify update was called with only general_prompt
      expect(mockClient.llm.update).toHaveBeenCalledWith(
        'llm-minimal',
        expect.objectContaining({
          general_prompt: 'Updated minimal prompt.',
        })
      );

      // Should NOT include begin_message or states
      const updateCall = mockClient.llm.update.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('begin_message');
      expect(updateCall).not.toHaveProperty('states');
    });
  });

  describe('Full Conversation Flow Workflow', () => {
    it('should complete pull → edit → update workflow for conversation-flow', async () => {
      const mockFlow = {
        conversation_flow_id: 'flow-test-789',
        version: 1,
        global_prompt: 'Follow the conversation flow.',
        nodes: [
          { id: 'node-1', type: 'start' },
          { id: 'node-2', type: 'response', text: 'Hello!' },
        ],
      };

      const mockAgent = {
        agent_id: TEST_AGENT_ID,
        agent_name: 'Flow Test Agent',
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-test-789',
        },
      };

      const mockPromptSource: promptResolver.PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow-test-789',
        agentName: 'Flow Test Agent',
        prompts: mockFlow,
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Pull prompts
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Verify files created
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'metadata.json'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'global_prompt.md'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'nodes.json'))).toBe(true);

      // Verify nodes.json content
      const nodesContent = JSON.parse(
        readFileSync(join(TEST_DIR, TEST_AGENT_ID, 'nodes.json'), 'utf-8')
      );
      expect(nodesContent).toHaveLength(2);
      expect(nodesContent[0]).toEqual({ id: 'node-1', type: 'start' });

      // Edit global prompt
      writeFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'global_prompt.md'),
        'Updated flow instructions.'
      );

      // Update conversation flow
      mockClient.conversationFlow.update.mockResolvedValue({
        conversation_flow_id: 'flow-test-789',
        version: 2,
      });

      await updatePromptsCommand(TEST_AGENT_ID, { source: TEST_DIR });

      // Verify SDK update was called
      expect(mockClient.conversationFlow.update).toHaveBeenCalledWith(
        'flow-test-789',
        expect.objectContaining({
          global_prompt: 'Updated flow instructions.',
          nodes: expect.arrayContaining([
            expect.objectContaining({ id: 'node-1', type: 'start' }),
          ]),
        })
      );
    });
  });

  describe('Error Handling Across Workflow', () => {
    it('should handle agent not found error in pull step', async () => {
      const notFoundError = new Retell.NotFoundError(
        'Agent not found',
        { status: 404, headers: new Headers() } as any
      );

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(notFoundError);

      await pullPromptsCommand('invalid-agent-id', { output: TEST_DIR });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(notFoundError);
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Verify error has correct properties
      const calledError = vi.mocked(outputFormatter.handleSdkError).mock.calls[0][0];
      expect(calledError.message).toContain('Agent not found');
      expect(calledError.message).toContain('"status":404');

      // Verify no files were created
      expect(existsSync(join(TEST_DIR, 'invalid-agent-id'))).toBe(false);
    });

    it('should handle authentication error in pull step', async () => {
      const authError = new Retell.AuthenticationError(
        'Invalid API key',
        { status: 401, headers: new Headers() } as any
      );

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(authError);

      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Verify error has correct properties
      const calledError = vi.mocked(outputFormatter.handleSdkError).mock.calls[0][0];
      expect(calledError.message).toContain('Invalid API key');
      expect(calledError.message).toContain('"status":401');
    });

    it('should handle validation error in update step', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-test',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-test',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      // Pull prompts first
      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Edit to create invalid state
      writeFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        '' // Empty prompt - might be invalid
      );

      // Mock validation error from SDK
      const validationError = new Retell.BadRequestError(
        'Prompt cannot be empty',
        { status: 400, headers: new Headers() } as any
      );

      mockClient.llm.update.mockRejectedValue(validationError);

      await updatePromptsCommand(TEST_AGENT_ID, { source: TEST_DIR });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(validationError);
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Verify error has correct properties
      const calledError = vi.mocked(outputFormatter.handleSdkError).mock.calls[0][0];
      expect(calledError.message).toContain('Prompt cannot be empty');
      expect(calledError.message).toContain('"status":400');
    });

    it('should handle rate limit error across workflow', async () => {
      const rateLimitError = new Retell.RateLimitError(
        'Too many requests',
        { status: 429, headers: new Headers() } as any
      );

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(rateLimitError);

      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Verify error has correct properties
      const calledError = vi.mocked(outputFormatter.handleSdkError).mock.calls[0][0];
      expect(calledError.message).toContain('Too many requests');
      expect(calledError.message).toContain('"status":429');
    });

    it('should handle network connection error', async () => {
      const connectionError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection refused'),
      });

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(connectionError);

      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(connectionError);
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Verify error has correct properties
      const calledError = vi.mocked(outputFormatter.handleSdkError).mock.calls[0][0];
      expect(calledError.message).toBe('Network error');
    });
  });

  describe('File I/O Integration', () => {
    it('should handle directory already exists (overwrite scenario)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-test',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-test',
          version: 1,
          general_prompt: 'Original prompt.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Pull prompts first time
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      const originalContent = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        'utf-8'
      );
      expect(originalContent).toBe('Original prompt.');

      // Pull again with updated prompt (simulating overwrite)
      mockPromptSource.prompts.general_prompt = 'Updated prompt.';
      mockPromptSource.prompts.version = 2;

      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      const updatedContent = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        'utf-8'
      );
      expect(updatedContent).toBe('Updated prompt.');

      // Verify metadata was also updated
      const metadata = JSON.parse(
        readFileSync(join(TEST_DIR, TEST_AGENT_ID, 'metadata.json'), 'utf-8')
      );
      expect(metadata.version).toBe(2);
    });

    it('should preserve file encoding and formatting', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-test',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-test',
          version: 1,
          general_prompt: 'Line 1\nLine 2\nLine 3',
          states: [
            {
              name: 'test-state',
              state_prompt: 'State with\nmultiple\nlines',
            },
          ],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Pull prompts
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Read and verify newlines are preserved
      const generalPrompt = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'general_prompt.md'),
        'utf-8'
      );
      expect(generalPrompt).toBe('Line 1\nLine 2\nLine 3');

      const stateContent = readFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'states', 'test-state.md'),
        'utf-8'
      );
      expect(stateContent).toContain('State with\nmultiple\nlines');
    });
  });

  describe('State Management in Workflow', () => {
    it('should handle adding new state files', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-test',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-test',
          version: 1,
          general_prompt: 'Test.',
          states: [
            { name: 'greeting', state_prompt: 'Greet user.' },
          ],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Pull prompts
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Add a new state file manually
      writeFileSync(
        join(TEST_DIR, TEST_AGENT_ID, 'states', 'closing.md'),
        '# State: closing\n\nClose the conversation politely.'
      );

      // Update prompts
      mockClient.llm.update.mockResolvedValue({ llm_id: 'llm-test', version: 2 });

      await updatePromptsCommand(TEST_AGENT_ID, { source: TEST_DIR });

      // Verify both states were uploaded
      const updateCall = mockClient.llm.update.mock.calls[0][1];
      expect(updateCall.states).toHaveLength(2);
      expect(updateCall.states).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'greeting' }),
          expect.objectContaining({ name: 'closing' }),
        ])
      );
    });

    it('should handle removing state files', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-test',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-test',
          version: 1,
          general_prompt: 'Test.',
          states: [
            { name: 'greeting', state_prompt: 'Greet user.' },
            { name: 'helping', state_prompt: 'Help user.' },
          ],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Pull prompts
      await pullPromptsCommand(TEST_AGENT_ID, { output: TEST_DIR });

      // Verify both states exist
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'states', 'greeting.md'))).toBe(true);
      expect(existsSync(join(TEST_DIR, TEST_AGENT_ID, 'states', 'helping.md'))).toBe(true);

      // Remove one state file
      rmSync(join(TEST_DIR, TEST_AGENT_ID, 'states', 'helping.md'));

      // Update prompts
      mockClient.llm.update.mockResolvedValue({ llm_id: 'llm-test', version: 2 });

      await updatePromptsCommand(TEST_AGENT_ID, { source: TEST_DIR });

      // Verify only greeting state was uploaded
      const updateCall = mockClient.llm.update.mock.calls[0][1];
      expect(updateCall.states).toHaveLength(1);
      expect(updateCall.states[0].name).toBe('greeting');
    });
  });
});
