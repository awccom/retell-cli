import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agentInfoCommand } from '../../../src/commands/agents/info';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');

describe('Agent Info Command', () => {
  let mockClient: any;
  let mockAgentRetrieve: any;
  let exitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgentRetrieve = vi.fn();
    mockClient = {
      agent: {
        retrieve: mockAgentRetrieve,
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

  it('should retrieve agent with retell-llm engine', async () => {
    const mockAgent = {
      agent_id: 'agent-123',
      agent_name: 'Test Agent',
      channel: 'voice',
      version: 1,
      is_published: true,
      version_title: 'v1',
      last_modification_timestamp: 1234567890,
      response_engine: {
        type: 'retell-llm',
        llm_id: 'llm-456',
      },
      voice_id: '11labs-Adrian',
      voice_temperature: 1.0,
      voice_speed: 1.0,
      voice_model: 'eleven_turbo_v2',
      language: 'en-US',
      responsiveness: 1.0,
      interruption_sensitivity: 1.0,
      enable_backchannel: true,
      backchannel_frequency: 0.8,
      backchannel_words: ['yeah', 'uh-huh'],
      reminder_trigger_ms: 10000,
      reminder_max_count: 3,
      webhook_url: 'https://example.com/webhook',
      boosted_keywords: ['important', 'urgent'],
      ambient_sound: 'office',
      ambient_sound_volume: 0.5,
    };

    mockAgentRetrieve.mockResolvedValue(mockAgent);

    await agentInfoCommand('agent-123');

    expect(mockAgentRetrieve).toHaveBeenCalledWith('agent-123');
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockAgent);
  });

  it('should retrieve agent with conversation-flow engine', async () => {
    const mockAgent = {
      agent_id: 'agent-456',
      agent_name: 'Flow Agent',
      channel: 'voice',
      version: 2,
      is_published: false,
      version_title: 'v2-draft',
      last_modification_timestamp: 1234567891,
      response_engine: {
        type: 'conversation-flow',
        conversation_flow_id: 'flow-789',
      },
      voice_id: '11labs-Emily',
      voice_temperature: 0.8,
      voice_speed: 1.1,
      voice_model: 'eleven_turbo_v2',
      language: 'en-GB',
      responsiveness: 0.9,
      interruption_sensitivity: 0.7,
      enable_backchannel: false,
      backchannel_frequency: 0.5,
      backchannel_words: [],
      reminder_trigger_ms: 15000,
      reminder_max_count: 2,
      webhook_url: '',
      boosted_keywords: [],
      ambient_sound: 'none',
      ambient_sound_volume: 0,
    };

    mockAgentRetrieve.mockResolvedValue(mockAgent);

    await agentInfoCommand('agent-456');

    expect(mockAgentRetrieve).toHaveBeenCalledWith('agent-456');
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockAgent);
  });

  it('should retrieve agent with custom-llm engine', async () => {
    const mockAgent = {
      agent_id: 'agent-789',
      agent_name: 'Custom Agent',
      channel: 'voice',
      version: 1,
      is_published: true,
      version_title: 'production',
      last_modification_timestamp: 1234567892,
      response_engine: {
        type: 'custom-llm',
        llm_websocket_url: 'wss://custom.example.com/llm',
      },
      voice_id: '11labs-Michael',
      voice_temperature: 1.0,
      voice_speed: 1.0,
      voice_model: 'eleven_turbo_v2',
      language: 'en-US',
      responsiveness: 1.0,
      interruption_sensitivity: 1.0,
      enable_backchannel: true,
      backchannel_frequency: 0.8,
      backchannel_words: ['okay', 'got it'],
      reminder_trigger_ms: 12000,
      reminder_max_count: 4,
      webhook_url: 'https://custom.example.com/webhook',
      boosted_keywords: ['custom', 'special'],
      ambient_sound: 'cafe',
      ambient_sound_volume: 0.3,
    };

    mockAgentRetrieve.mockResolvedValue(mockAgent);

    await agentInfoCommand('agent-789');

    expect(mockAgentRetrieve).toHaveBeenCalledWith('agent-789');
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockAgent);
  });

  it('should handle agent not found error', async () => {
    const notFoundError = new Retell.NotFoundError(
      'Agent not found',
      { status: 404, headers: new Headers() } as any
    );

    mockAgentRetrieve.mockRejectedValue(notFoundError);

    await agentInfoCommand('invalid-agent-id');

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(notFoundError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle authentication error', async () => {
    const authError = new Retell.AuthenticationError(
      'Invalid API key',
      { status: 401, headers: new Headers() } as any
    );

    mockAgentRetrieve.mockRejectedValue(authError);

    await agentInfoCommand('agent-123');

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle bad request error for invalid agent ID format', async () => {
    const badRequestError = new Retell.BadRequestError(
      'Invalid agent ID format',
      { status: 400, headers: new Headers() } as any
    );

    mockAgentRetrieve.mockRejectedValue(badRequestError);

    await agentInfoCommand('@@invalid@@');

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(badRequestError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle API connection error', async () => {
    const connectionError = new Retell.APIConnectionError({
      message: 'Network error',
      cause: new Error('Connection refused'),
    });

    mockAgentRetrieve.mockRejectedValue(connectionError);

    await agentInfoCommand('agent-123');

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(connectionError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle generic API error', async () => {
    const apiError = new Retell.APIError(500, {}, 'Server error', {} as any);

    mockAgentRetrieve.mockRejectedValue(apiError);

    await agentInfoCommand('agent-123');

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle rate limit error', async () => {
    const rateLimitError = new Retell.RateLimitError(
      'Too many requests',
      { status: 429, headers: new Headers() } as any
    );

    mockAgentRetrieve.mockRejectedValue(rateLimitError);

    await agentInfoCommand('agent-123');

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should output complete agent object with all fields', async () => {
    const completeAgent = {
      agent_id: 'agent-complete',
      agent_name: 'Complete Agent',
      channel: 'voice',
      version: 5,
      is_published: true,
      version_title: 'v5-stable',
      last_modification_timestamp: 1234567893,
      response_engine: {
        type: 'retell-llm',
        llm_id: 'llm-complete',
      },
      voice_id: '11labs-Complete',
      voice_temperature: 0.9,
      voice_speed: 1.05,
      voice_model: 'eleven_turbo_v2',
      language: 'en-US',
      responsiveness: 0.95,
      interruption_sensitivity: 0.85,
      enable_backchannel: true,
      backchannel_frequency: 0.75,
      backchannel_words: ['yes', 'okay', 'right'],
      reminder_trigger_ms: 11000,
      reminder_max_count: 5,
      webhook_url: 'https://complete.example.com/webhook',
      boosted_keywords: ['test', 'complete', 'full'],
      ambient_sound: 'restaurant',
      ambient_sound_volume: 0.4,
      // Additional fields that might be present
      opt_out_sensitive_data_storage: false,
      pronunciation_dictionary: [],
      normalize_for_speech: true,
    };

    mockAgentRetrieve.mockResolvedValue(completeAgent);

    await agentInfoCommand('agent-complete');

    expect(mockAgentRetrieve).toHaveBeenCalledWith('agent-complete');
    const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0];

    // Verify all critical fields are present in output
    expect(outputCall).toHaveProperty('agent_id', 'agent-complete');
    expect(outputCall).toHaveProperty('agent_name', 'Complete Agent');
    expect(outputCall).toHaveProperty('version', 5);
    expect(outputCall).toHaveProperty('is_published', true);
    expect(outputCall).toHaveProperty('response_engine');
    expect(outputCall).toHaveProperty('voice_id');
    expect(outputCall).toHaveProperty('language');
    expect(outputCall).toHaveProperty('responsiveness');
    expect(outputCall).toHaveProperty('webhook_url');
  });
});
