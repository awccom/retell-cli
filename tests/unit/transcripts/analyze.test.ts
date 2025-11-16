/**
 * Unit tests for transcripts analyze command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeTranscriptCommand } from '../../../src/commands/transcripts/analyze';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');

describe('Analyze Transcript Command', () => {
  let mockClient: any;
  let mockCallRetrieve: any;
  let exitSpy: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock client.call.retrieve
    mockCallRetrieve = vi.fn();
    mockClient = {
      call: {
        retrieve: mockCallRetrieve,
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

  describe('Successful analysis with complete data', () => {
    it('should analyze call with all fields present', async () => {
      const mockCall = {
        call_id: 'call-123',
        call_status: 'ended',
        duration_ms: 45000,
        start_timestamp: 1640000000000,
        end_timestamp: 1640000045000,
        agent_name: 'Test Agent',
        transcript_object: [
          {
            role: 'agent',
            content: 'Hello, how can I help you today?',
            words: [],
          },
          {
            role: 'user',
            content: 'I need help with my account.',
            words: [],
          },
          {
            role: 'agent',
            content: 'I would be happy to help you with your account.',
            words: [],
          },
        ],
        call_analysis: {
          call_summary: 'User requested help with account',
          user_sentiment: 'Positive',
          call_successful: true,
          in_voicemail: false,
        },
        latency: {
          e2e: { p50: 250, p90: 400, p99: 600, min: 100, max: 800 },
          llm: { p50: 150, p90: 250, p99: 400, min: 80, max: 500 },
          tts: { p50: 50, p90: 80, p99: 120, min: 30, max: 150 },
        },
        call_cost: {
          combined_cost: 0.15,
          product_costs: [
            { product: 'llm', cost: 0.08 },
            { product: 'tts', cost: 0.07 },
          ],
        },
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-123');

      expect(mockCallRetrieve).toHaveBeenCalledWith('call-123');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        call_id: 'call-123',
        metadata: {
          status: 'ended',
          duration_ms: 45000,
          start_timestamp: 1640000000000,
          end_timestamp: 1640000045000,
          agent_name: 'Test Agent',
        },
        transcript: [
          {
            role: 'agent',
            content: 'Hello, how can I help you today?',
            word_count: 7,
          },
          {
            role: 'user',
            content: 'I need help with my account.',
            word_count: 6,
          },
          {
            role: 'agent',
            content: 'I would be happy to help you with your account.',
            word_count: 10,
          },
        ],
        analysis: {
          summary: 'User requested help with account',
          sentiment: 'Positive',
          successful: true,
          in_voicemail: false,
        },
        performance: {
          latency_p50_ms: {
            e2e: 250,
            llm: 150,
            tts: 50,
          },
          latency_p90_ms: {
            e2e: 400,
            llm: 250,
            tts: 80,
          },
        },
        cost: {
          total: 0.15,
          breakdown: [
            { product: 'llm', cost: 0.08 },
            { product: 'tts', cost: 0.07 },
          ],
        },
      });
    });
  });

  describe('Handling missing optional fields', () => {
    it('should handle call with no analysis data', async () => {
      const mockCall = {
        call_id: 'call-no-analysis',
        call_status: 'ended',
        duration_ms: 30000,
        start_timestamp: 1640000000000,
        end_timestamp: 1640000030000,
        agent_name: 'Test Agent',
        transcript_object: [],
        call_analysis: null,
        latency: null,
        call_cost: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-no-analysis');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        call_id: 'call-no-analysis',
        metadata: {
          status: 'ended',
          duration_ms: 30000,
          start_timestamp: 1640000000000,
          end_timestamp: 1640000030000,
          agent_name: 'Test Agent',
        },
        transcript: [],
        analysis: {
          summary: 'No summary available',
          sentiment: 'Unknown',
          successful: false,
          in_voicemail: false,
        },
        performance: {
          latency_p50_ms: {
            e2e: null,
            llm: null,
            tts: null,
          },
          latency_p90_ms: {
            e2e: null,
            llm: null,
            tts: null,
          },
        },
        cost: {
          total: 0,
          breakdown: [],
        },
      });
    });

    it('should handle call with partial analysis data', async () => {
      const mockCall = {
        call_id: 'call-partial',
        call_status: 'ended',
        duration_ms: 20000,
        start_timestamp: 1640000000000,
        end_timestamp: 1640000020000,
        agent_name: 'Test Agent',
        transcript_object: [
          {
            role: 'agent',
            content: 'Hello',
            words: [],
          },
        ],
        call_analysis: {
          call_summary: 'Brief call',
          user_sentiment: null,
          call_successful: null,
          in_voicemail: null,
        },
        latency: {
          e2e: { p50: 250 },
          llm: null,
          tts: null,
        },
        call_cost: {
          combined_cost: 0.05,
          product_costs: null,
        },
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-partial');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          call_id: 'call-partial',
          analysis: {
            summary: 'Brief call',
            sentiment: 'Unknown',
            successful: false,
            in_voicemail: false,
          },
          cost: {
            total: 0.05,
            breakdown: [],
          },
        })
      );
    });

    it('should handle call without transcript_object', async () => {
      const mockCall = {
        call_id: 'call-no-transcript',
        call_status: 'error',
        duration_ms: 0,
        start_timestamp: 1640000000000,
        end_timestamp: 1640000000000,
        agent_name: 'Test Agent',
        transcript_object: null,
        call_analysis: null,
        latency: null,
        call_cost: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-no-transcript');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: [],
        })
      );
    });

    it('should handle call with missing metadata fields', async () => {
      const mockCall = {
        call_id: 'call-minimal',
        call_status: null,
        duration_ms: null,
        start_timestamp: null,
        end_timestamp: null,
        agent_name: null,
        transcript_object: [],
        call_analysis: null,
        latency: null,
        call_cost: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-minimal');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        call_id: 'call-minimal',
        metadata: {
          status: 'unknown',
          duration_ms: 0,
          start_timestamp: 0,
          end_timestamp: 0,
          agent_name: 'Unknown',
        },
        transcript: [],
        analysis: {
          summary: 'No summary available',
          sentiment: 'Unknown',
          successful: false,
          in_voicemail: false,
        },
        performance: {
          latency_p50_ms: {
            e2e: null,
            llm: null,
            tts: null,
          },
          latency_p90_ms: {
            e2e: null,
            llm: null,
            tts: null,
          },
        },
        cost: {
          total: 0,
          breakdown: [],
        },
      });
    });
  });

  describe('Transcript turn extraction', () => {
    it('should calculate word count for each turn', async () => {
      const mockCall = {
        call_id: 'call-word-count',
        call_status: 'ended',
        duration_ms: 10000,
        start_timestamp: 1640000000000,
        end_timestamp: 1640000010000,
        agent_name: 'Test Agent',
        transcript_object: [
          {
            role: 'agent',
            content: 'One two three',
            words: [],
          },
          {
            role: 'user',
            content: 'Four five six seven eight',
            words: [],
          },
        ],
        call_analysis: null,
        latency: null,
        call_cost: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-word-count');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: [
            {
              role: 'agent',
              content: 'One two three',
              word_count: 3,
            },
            {
              role: 'user',
              content: 'Four five six seven eight',
              word_count: 5,
            },
          ],
        })
      );
    });

    it('should handle empty transcript turns', async () => {
      const mockCall = {
        call_id: 'call-empty-turns',
        call_status: 'ended',
        duration_ms: 5000,
        start_timestamp: 1640000000000,
        end_timestamp: 1640000005000,
        agent_name: 'Test Agent',
        transcript_object: [
          {
            role: 'agent',
            content: '',
            words: [],
          },
          {
            role: 'user',
            content: null,
            words: [],
          },
        ],
        call_analysis: null,
        latency: null,
        call_cost: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await analyzeTranscriptCommand('call-empty-turns');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: [
            {
              role: 'agent',
              content: '',
              word_count: 0,
            },
            {
              role: 'user',
              content: null,
              word_count: 0,
            },
          ],
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle call not found (NotFoundError)', async () => {
      const notFoundError = new Retell.NotFoundError(
        404,
        {} as any,
        'Call not found',
        {} as any
      );
      mockCallRetrieve.mockRejectedValue(notFoundError);

      await analyzeTranscriptCommand('invalid-call-id');

      expect(mockCallRetrieve).toHaveBeenCalledWith('invalid-call-id');
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(notFoundError);
    });

    it('should handle authentication errors', async () => {
      const authError = new Retell.AuthenticationError(
        401,
        {} as any,
        'Invalid API key',
        {} as any
      );
      mockCallRetrieve.mockRejectedValue(authError);

      await analyzeTranscriptCommand('call-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
    });

    it('should handle network errors', async () => {
      const networkError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection failed'),
      });
      mockCallRetrieve.mockRejectedValue(networkError);

      await analyzeTranscriptCommand('call-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(networkError);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Retell.RateLimitError(
        429,
        {} as any,
        'Rate limit exceeded',
        {} as any
      );
      mockCallRetrieve.mockRejectedValue(rateLimitError);

      await analyzeTranscriptCommand('call-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
    });

    it('should handle generic API errors', async () => {
      const apiError = new Retell.APIError(
        500,
        {} as any,
        'Internal server error',
        {} as any
      );
      mockCallRetrieve.mockRejectedValue(apiError);

      await analyzeTranscriptCommand('call-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });

  describe('Integration with services', () => {
    it('should call getRetellClient to get SDK client', async () => {
      mockCallRetrieve.mockResolvedValue({
        call_id: 'call-123',
        call_status: 'ended',
        duration_ms: 10000,
        start_timestamp: 0,
        end_timestamp: 0,
        agent_name: 'Test',
        transcript_object: [],
        call_analysis: null,
        latency: null,
        call_cost: null,
      });

      await analyzeTranscriptCommand('call-123');

      expect(retellClient.getRetellClient).toHaveBeenCalled();
    });

    it('should use outputJson for successful results', async () => {
      mockCallRetrieve.mockResolvedValue({
        call_id: 'call-123',
        call_status: 'ended',
        duration_ms: 10000,
        start_timestamp: 0,
        end_timestamp: 0,
        agent_name: 'Test',
        transcript_object: [],
        call_analysis: null,
        latency: null,
        call_cost: null,
      });

      await analyzeTranscriptCommand('call-123');

      expect(outputFormatter.outputJson).toHaveBeenCalled();
    });
  });
});
