import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { publishAgentCommand } from '../../../src/commands/agent/publish';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');

describe('Agent Publish Command', () => {
  let mockClient: any;
  let mockAgentPublish: any;
  let exitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgentPublish = vi.fn();
    mockClient = {
      agent: {
        publish: mockAgentPublish,
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

  describe('Successful Publish', () => {
    it('should publish agent successfully', async () => {
      const mockPublishedAgent = {
        agent_id: 'agent-123',
        agent_name: 'Test Agent',
        version: 2,
        is_published: true,
        channel: 'voice',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-456',
        },
      };

      mockAgentPublish.mockResolvedValue(mockPublishedAgent);

      await publishAgentCommand('agent-123');

      // Verify SDK call
      expect(mockAgentPublish).toHaveBeenCalledWith('agent-123');

      // Verify success output
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Agent published successfully',
          agent_id: 'agent-123',
          agent_name: 'Test Agent',
          version: 2,
          is_published: true,
        })
      );
    });

    it('should show version increment after publish', async () => {
      const mockPublishedAgent = {
        agent_id: 'agent-v5',
        agent_name: 'Version Test Agent',
        version: 5,
        is_published: true,
        channel: 'voice',
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-789',
        },
      };

      mockAgentPublish.mockResolvedValue(mockPublishedAgent);

      await publishAgentCommand('agent-v5');

      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0];
      expect(outputCall.version).toBe(5);
      expect(outputCall.note).toContain('Draft version incremented');
    });

    it('should handle publishing agent with custom-llm', async () => {
      const mockPublishedAgent = {
        agent_id: 'agent-custom',
        agent_name: 'Custom LLM Agent',
        version: 3,
        is_published: true,
        channel: 'voice',
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://custom.example.com/llm',
        },
      };

      mockAgentPublish.mockResolvedValue(mockPublishedAgent);

      await publishAgentCommand('agent-custom');

      expect(mockAgentPublish).toHaveBeenCalledWith('agent-custom');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Agent published successfully',
          version: 3,
        })
      );
    });

    it('should include all required fields in output', async () => {
      const mockPublishedAgent = {
        agent_id: 'agent-complete',
        agent_name: 'Complete Agent',
        version: 10,
        is_published: true,
        channel: 'voice',
      };

      mockAgentPublish.mockResolvedValue(mockPublishedAgent);

      await publishAgentCommand('agent-complete');

      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0];

      expect(outputCall).toHaveProperty('message');
      expect(outputCall).toHaveProperty('agent_id');
      expect(outputCall).toHaveProperty('agent_name');
      expect(outputCall).toHaveProperty('version');
      expect(outputCall).toHaveProperty('is_published');
      expect(outputCall).toHaveProperty('note');
    });
  });

  describe('Error Handling', () => {
    it('should handle agent not found error', async () => {
      const notFoundError = new Retell.NotFoundError(
        'Agent not found',
        { status: 404, headers: new Headers() } as any
      );

      mockAgentPublish.mockRejectedValue(notFoundError);

      await publishAgentCommand('invalid-agent-id');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(notFoundError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle authentication error', async () => {
      const authError = new Retell.AuthenticationError(
        'Invalid API key',
        { status: 401, headers: new Headers() } as any
      );

      mockAgentPublish.mockRejectedValue(authError);

      await publishAgentCommand('agent-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle bad request error for invalid agent ID format', async () => {
      const badRequestError = new Retell.BadRequestError(
        'Invalid agent ID format',
        { status: 400, headers: new Headers() } as any
      );

      mockAgentPublish.mockRejectedValue(badRequestError);

      await publishAgentCommand('@@invalid@@');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(badRequestError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle API connection error', async () => {
      const connectionError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection refused'),
      });

      mockAgentPublish.mockRejectedValue(connectionError);

      await publishAgentCommand('agent-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(connectionError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle rate limit error', async () => {
      const rateLimitError = new Retell.RateLimitError(
        'Too many requests',
        { status: 429, headers: new Headers() } as any
      );

      mockAgentPublish.mockRejectedValue(rateLimitError);

      await publishAgentCommand('agent-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle generic API error', async () => {
      const apiError = new Retell.APIError(500, {}, 'Server error', {} as any);

      mockAgentPublish.mockRejectedValue(apiError);

      await publishAgentCommand('agent-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle conflict error for already published agent', async () => {
      // In some APIs, publishing an already-published agent might return a conflict
      const conflictError = new Retell.APIError(
        409,
        {},
        'Agent version already published',
        {} as any
      );

      mockAgentPublish.mockRejectedValue(conflictError);

      await publishAgentCommand('agent-already-published');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(conflictError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('SDK Call Verification', () => {
    it('should call SDK publish method with correct agent ID', async () => {
      const mockPublishedAgent = {
        agent_id: 'agent-verify',
        agent_name: 'Verify Agent',
        version: 1,
        is_published: true,
      };

      mockAgentPublish.mockResolvedValue(mockPublishedAgent);

      await publishAgentCommand('agent-verify');

      // Verify exact call signature
      expect(mockAgentPublish).toHaveBeenCalledTimes(1);
      expect(mockAgentPublish).toHaveBeenCalledWith('agent-verify');
    });

    it('should not modify agent ID before calling SDK', async () => {
      const mockPublishedAgent = {
        agent_id: 'agent-with-dashes-123',
        agent_name: 'Test',
        version: 1,
        is_published: true,
      };

      mockAgentPublish.mockResolvedValue(mockPublishedAgent);

      await publishAgentCommand('agent-with-dashes-123');

      expect(mockAgentPublish).toHaveBeenCalledWith('agent-with-dashes-123');
    });
  });
});
