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

  it('should list agents with custom limit', async () => {
    const mockAgents = [
      {
        agent_id: 'agent-1',
        agent_name: 'Agent 1',
        version: 2,
        is_published: false,
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-456',
        },
      },
    ];

    mockAgentList.mockResolvedValue(mockAgents);

    await listAgentsCommand({ limit: 10 });

    expect(mockAgentList).toHaveBeenCalledWith({ limit: 10 });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([
      {
        agent_id: 'agent-1',
        agent_name: 'Agent 1',
        version: 2,
        is_published: false,
        response_engine_type: 'conversation-flow',
        response_engine_id: 'flow-456',
      },
    ]);
  });

  it('should handle empty agent list', async () => {
    mockAgentList.mockResolvedValue([]);

    await listAgentsCommand({});

    expect(mockAgentList).toHaveBeenCalledWith({ limit: 100 });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
  });

  it('should format retell-llm response engine correctly', async () => {
    const mockAgents = [
      {
        agent_id: 'agent-1',
        agent_name: 'Retell LLM Agent',
        version: 1,
        is_published: true,
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-abc123',
        },
      },
    ];

    mockAgentList.mockResolvedValue(mockAgents);

    await listAgentsCommand({});

    const callArgs = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any[];
    expect(callArgs[0].response_engine_type).toBe('retell-llm');
    expect(callArgs[0].response_engine_id).toBe('llm-abc123');
  });

  it('should format conversation-flow response engine correctly', async () => {
    const mockAgents = [
      {
        agent_id: 'agent-2',
        agent_name: 'Flow Agent',
        version: 1,
        is_published: false,
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-xyz789',
        },
      },
    ];

    mockAgentList.mockResolvedValue(mockAgents);

    await listAgentsCommand({});

    const callArgs = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any[];
    expect(callArgs[0].response_engine_type).toBe('conversation-flow');
    expect(callArgs[0].response_engine_id).toBe('flow-xyz789');
  });

  it('should format custom-llm response engine correctly', async () => {
    const mockAgents = [
      {
        agent_id: 'agent-3',
        agent_name: 'Custom LLM Agent',
        version: 1,
        is_published: true,
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://example.com/llm',
        },
      },
    ];

    mockAgentList.mockResolvedValue(mockAgents);

    await listAgentsCommand({});

    const callArgs = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any[];
    expect(callArgs[0].response_engine_type).toBe('custom-llm');
    expect(callArgs[0].response_engine_id).toBe('wss://example.com/llm');
  });

  it('should handle multiple agents with different engine types', async () => {
    const mockAgents = [
      {
        agent_id: 'agent-1',
        agent_name: 'Agent 1',
        version: 1,
        is_published: true,
        response_engine: {
          type: 'retell-llm',
          llm_id: 'llm-1',
        },
      },
      {
        agent_id: 'agent-2',
        agent_name: 'Agent 2',
        version: 2,
        is_published: false,
        response_engine: {
          type: 'conversation-flow',
          conversation_flow_id: 'flow-2',
        },
      },
      {
        agent_id: 'agent-3',
        agent_name: 'Agent 3',
        version: 1,
        is_published: true,
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://custom.com',
        },
      },
    ];

    mockAgentList.mockResolvedValue(mockAgents);

    await listAgentsCommand({ limit: 50 });

    expect(mockAgentList).toHaveBeenCalledWith({ limit: 50 });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([
      {
        agent_id: 'agent-1',
        agent_name: 'Agent 1',
        version: 1,
        is_published: true,
        response_engine_type: 'retell-llm',
        response_engine_id: 'llm-1',
      },
      {
        agent_id: 'agent-2',
        agent_name: 'Agent 2',
        version: 2,
        is_published: false,
        response_engine_type: 'conversation-flow',
        response_engine_id: 'flow-2',
      },
      {
        agent_id: 'agent-3',
        agent_name: 'Agent 3',
        version: 1,
        is_published: true,
        response_engine_type: 'custom-llm',
        response_engine_id: 'wss://custom.com',
      },
    ]);
  });

  it('should handle authentication error', async () => {
    const authError = new Retell.AuthenticationError(
      'Invalid API key',
      { status: 401, headers: new Headers() } as any
    );

    mockAgentList.mockRejectedValue(authError);

    await listAgentsCommand({});

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle API connection error', async () => {
    const connectionError = new Retell.APIConnectionError({
      message: 'Network error',
      cause: new Error('Connection refused'),
    });

    mockAgentList.mockRejectedValue(connectionError);

    await listAgentsCommand({ limit: 25 });

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(connectionError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle generic API error', async () => {
    const apiError = new Retell.APIError(500, {}, 'Server error', {} as any);

    mockAgentList.mockRejectedValue(apiError);

    await listAgentsCommand({});

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle rate limit error', async () => {
    const rateLimitError = new Retell.RateLimitError(
      'Too many requests',
      { status: 429, headers: new Headers() } as any
    );

    mockAgentList.mockRejectedValue(rateLimitError);

    await listAgentsCommand({});

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
