import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolvePromptSource } from '../../src/services/prompt-resolver';
import * as retellClient from '../../src/services/retell-client';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../src/services/retell-client');

describe('Prompt Resolver Service', () => {
  let mockClient: any;
  let exitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock client with all needed methods
    mockClient = {
      agent: {
        retrieve: vi.fn(),
      },
      llm: {
        retrieve: vi.fn(),
      },
      conversationFlow: {
        retrieve: vi.fn(),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient as any);

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('Retell LLM Agents', () => {
    it('should resolve retell-llm agent successfully', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        agent_name: 'Test LLM Agent',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-456',
        },
      };

      const mockLlm = {
        llm_id: 'llm-456',
        version: 2,
        general_prompt: 'You are a helpful assistant.',
        begin_message: 'Hello! How can I help you today?',
        states: [
          {
            name: 'greeting',
            state_prompt: 'Greet the user warmly.',
            edges: [],
          },
        ],
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.llm.retrieve.mockResolvedValue(mockLlm);

      const result = await resolvePromptSource('agent-123');

      expect(result.type).toBe('retell-llm');
      expect(mockClient.agent.retrieve).toHaveBeenCalledWith('agent-123');
      expect(mockClient.llm.retrieve).toHaveBeenCalledWith('llm-456');

      if (result.type === 'retell-llm') {
        expect(result.llmId).toBe('llm-456');
        expect(result.agentName).toBe('Test LLM Agent');
        expect(result.prompts.llm_id).toBe('llm-456');
        expect(result.prompts.version).toBe(2);
        expect(result.prompts.general_prompt).toBe('You are a helpful assistant.');
        expect(result.prompts.begin_message).toBe('Hello! How can I help you today?');
        expect(result.prompts.states).toHaveLength(1);
        expect(result.prompts.states![0].name).toBe('greeting');
      }
    });

    it('should handle retell-llm agent without begin_message', async () => {
      const mockAgent = {
        agent_id: 'agent-no-begin',
        agent_name: 'Minimal LLM Agent',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-minimal',
        },
      };

      const mockLlm = {
        llm_id: 'llm-minimal',
        version: 1,
        general_prompt: 'Minimal prompt.',
        begin_message: undefined,
        states: undefined,
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.llm.retrieve.mockResolvedValue(mockLlm);

      const result = await resolvePromptSource('agent-no-begin');

      if (result.type === 'retell-llm') {
        expect(result.prompts.begin_message).toBeUndefined();
        expect(result.prompts.states).toBeUndefined();
      }
    });

    it('should handle retell-llm agent with multiple states', async () => {
      const mockAgent = {
        agent_id: 'agent-states',
        agent_name: 'Multi-State Agent',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-states',
        },
      };

      const mockLlm = {
        llm_id: 'llm-states',
        version: 3,
        general_prompt: 'Stateful agent.',
        begin_message: 'Welcome!',
        states: [
          { name: 'greeting', state_prompt: 'Greet user.' },
          { name: 'helping', state_prompt: 'Help user.' },
          { name: 'closing', state_prompt: 'Close conversation.' },
        ],
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.llm.retrieve.mockResolvedValue(mockLlm);

      const result = await resolvePromptSource('agent-states');

      if (result.type === 'retell-llm') {
        expect(result.prompts.states).toHaveLength(3);
        expect(result.prompts.states![0].name).toBe('greeting');
        expect(result.prompts.states![1].name).toBe('helping');
        expect(result.prompts.states![2].name).toBe('closing');
      }
    });

    it('should handle LLM not found error', async () => {
      const mockAgent = {
        agent_id: 'agent-orphan',
        agent_name: 'Orphaned Agent',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-missing',
        },
      };

      const notFoundError = new Retell.NotFoundError(
        'LLM not found',
        { status: 404, headers: new Headers() } as any
      );

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.llm.retrieve.mockRejectedValue(notFoundError);

      await expect(resolvePromptSource('agent-orphan')).rejects.toThrow(notFoundError);
    });
  });

  describe('Conversation Flow Agents', () => {
    it('should resolve conversation-flow agent successfully', async () => {
      const mockAgent = {
        agent_id: 'agent-flow',
        agent_name: 'Test Flow Agent',
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-789',
        },
      };

      const mockFlow = {
        conversation_flow_id: 'flow-789',
        version: 1,
        global_prompt: 'Follow the conversation flow.',
        nodes: [
          { id: 'node-1', type: 'start' },
          { id: 'node-2', type: 'response' },
        ],
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.conversationFlow.retrieve.mockResolvedValue(mockFlow);

      const result = await resolvePromptSource('agent-flow');

      expect(result.type).toBe('conversation-flow');
      expect(mockClient.agent.retrieve).toHaveBeenCalledWith('agent-flow');
      expect(mockClient.conversationFlow.retrieve).toHaveBeenCalledWith('flow-789');

      if (result.type === 'conversation-flow') {
        expect(result.flowId).toBe('flow-789');
        expect(result.agentName).toBe('Test Flow Agent');
        expect(result.prompts.conversation_flow_id).toBe('flow-789');
        expect(result.prompts.version).toBe(1);
        expect(result.prompts.global_prompt).toBe('Follow the conversation flow.');
        expect(result.prompts.nodes).toHaveLength(2);
      }
    });

    it('should handle conversation-flow with complex nodes', async () => {
      const mockAgent = {
        agent_id: 'agent-complex-flow',
        agent_name: 'Complex Flow Agent',
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-complex',
        },
      };

      const mockFlow = {
        conversation_flow_id: 'flow-complex',
        version: 5,
        global_prompt: 'Complex flow instructions.',
        nodes: [
          { id: '1', type: 'start', transitions: ['2', '3'] },
          { id: '2', type: 'question', prompt: 'Ask something' },
          { id: '3', type: 'branch', conditions: [] },
          { id: '4', type: 'end' },
        ],
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.conversationFlow.retrieve.mockResolvedValue(mockFlow);

      const result = await resolvePromptSource('agent-complex-flow');

      if (result.type === 'conversation-flow') {
        expect(result.prompts.nodes).toHaveLength(4);
        expect(result.prompts.version).toBe(5);
      }
    });

    it('should handle conversation flow not found error', async () => {
      const mockAgent = {
        agent_id: 'agent-orphan-flow',
        agent_name: 'Orphaned Flow Agent',
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-missing',
        },
      };

      const notFoundError = new Retell.NotFoundError(
        'Conversation flow not found',
        { status: 404, headers: new Headers() } as any
      );

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.conversationFlow.retrieve.mockRejectedValue(notFoundError);

      await expect(resolvePromptSource('agent-orphan-flow')).rejects.toThrow(notFoundError);
    });
  });

  describe('Custom LLM Agents', () => {
    it('should return error for custom-llm agent', async () => {
      const mockAgent = {
        agent_id: 'agent-custom',
        agent_name: 'Custom LLM Agent',
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://custom.example.com/llm',
        },
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);

      const result = await resolvePromptSource('agent-custom');

      expect(result.type).toBe('custom-llm');
      expect(mockClient.agent.retrieve).toHaveBeenCalledWith('agent-custom');
      // Should NOT call llm.retrieve or conversationFlow.retrieve
      expect(mockClient.llm.retrieve).not.toHaveBeenCalled();
      expect(mockClient.conversationFlow.retrieve).not.toHaveBeenCalled();

      if (result.type === 'custom-llm') {
        expect(result.error).toContain('Custom LLM agents cannot be managed via API');
        expect(result.error).toContain('Retell dashboard');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle agent not found error', async () => {
      const notFoundError = new Retell.NotFoundError(
        'Agent not found',
        { status: 404, headers: new Headers() } as any
      );

      mockClient.agent.retrieve.mockRejectedValue(notFoundError);

      await expect(resolvePromptSource('invalid-agent-id')).rejects.toThrow(notFoundError);
    });

    it('should handle authentication error', async () => {
      const authError = new Retell.AuthenticationError(
        'Invalid API key',
        { status: 401, headers: new Headers() } as any
      );

      mockClient.agent.retrieve.mockRejectedValue(authError);

      await expect(resolvePromptSource('agent-123')).rejects.toThrow(authError);
    });

    it('should handle bad request error for invalid agent ID format', async () => {
      const badRequestError = new Retell.BadRequestError(
        'Invalid agent ID format',
        { status: 400, headers: new Headers() } as any
      );

      mockClient.agent.retrieve.mockRejectedValue(badRequestError);

      await expect(resolvePromptSource('@@invalid@@')).rejects.toThrow(badRequestError);
    });

    it('should handle API connection error', async () => {
      const connectionError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection refused'),
      });

      mockClient.agent.retrieve.mockRejectedValue(connectionError);

      await expect(resolvePromptSource('agent-123')).rejects.toThrow(connectionError);
    });

    it('should handle rate limit error', async () => {
      const rateLimitError = new Retell.RateLimitError(
        'Too many requests',
        { status: 429, headers: new Headers() } as any
      );

      mockClient.agent.retrieve.mockRejectedValue(rateLimitError);

      await expect(resolvePromptSource('agent-123')).rejects.toThrow(rateLimitError);
    });

    it('should handle generic API error', async () => {
      const apiError = new Retell.APIError(500, {}, 'Server error', {} as any);

      mockClient.agent.retrieve.mockRejectedValue(apiError);

      await expect(resolvePromptSource('agent-123')).rejects.toThrow(apiError);
    });
  });

  describe('SDK Call Verification', () => {
    it('should call SDK methods in correct order for retell-llm', async () => {
      const mockAgent = {
        agent_id: 'agent-order-test',
        agent_name: 'Order Test Agent',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-order',
        },
      };

      const mockLlm = {
        llm_id: 'llm-order',
        version: 1,
        general_prompt: 'Test prompt.',
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.llm.retrieve.mockResolvedValue(mockLlm);

      await resolvePromptSource('agent-order-test');

      // Verify call order
      const agentCall = mockClient.agent.retrieve.mock.invocationCallOrder[0];
      const llmCall = mockClient.llm.retrieve.mock.invocationCallOrder[0];
      expect(agentCall).toBeLessThan(llmCall);
    });

    it('should call SDK methods in correct order for conversation-flow', async () => {
      const mockAgent = {
        agent_id: 'agent-flow-order',
        agent_name: 'Flow Order Test',
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-order',
        },
      };

      const mockFlow = {
        conversation_flow_id: 'flow-order',
        version: 1,
        global_prompt: 'Test flow.',
        nodes: [],
      };

      mockClient.agent.retrieve.mockResolvedValue(mockAgent);
      mockClient.conversationFlow.retrieve.mockResolvedValue(mockFlow);

      await resolvePromptSource('agent-flow-order');

      // Verify call order
      const agentCall = mockClient.agent.retrieve.mock.invocationCallOrder[0];
      const flowCall = mockClient.conversationFlow.retrieve.mock.invocationCallOrder[0];
      expect(agentCall).toBeLessThan(flowCall);
    });
  });
});
