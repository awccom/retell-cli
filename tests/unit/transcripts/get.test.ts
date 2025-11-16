/**
 * Unit tests for transcripts get command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTranscriptCommand } from '../../../src/commands/transcripts/get';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');

describe('Get Transcript Command', () => {
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

  describe('Successful retrieval', () => {
    it('should retrieve and output full call object', async () => {
      const mockCall = {
        call_id: 'call-123',
        call_status: 'ended',
        duration_ms: 45000,
        agent_name: 'Test Agent',
        transcript: 'Hello, how can I help you?',
        transcript_object: [
          {
            role: 'agent',
            content: 'Hello, how can I help you?',
            words: [],
          },
        ],
        call_analysis: {
          call_summary: 'Test call',
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

      await getTranscriptCommand('call-123');

      expect(mockCallRetrieve).toHaveBeenCalledWith('call-123');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCall);
    });

    it('should handle call with minimal data', async () => {
      const mockCall = {
        call_id: 'call-minimal',
        call_status: 'error',
        duration_ms: 0,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('call-minimal');

      expect(mockCallRetrieve).toHaveBeenCalledWith('call-minimal');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCall);
    });

    it('should handle call without transcript', async () => {
      const mockCall = {
        call_id: 'call-no-transcript',
        call_status: 'ongoing',
        duration_ms: 5000,
        transcript: null,
        transcript_object: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('call-no-transcript');

      expect(mockCallRetrieve).toHaveBeenCalledWith('call-no-transcript');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCall);
    });

    it('should handle call without analysis', async () => {
      const mockCall = {
        call_id: 'call-no-analysis',
        call_status: 'ended',
        duration_ms: 10000,
        call_analysis: null,
      };

      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('call-no-analysis');

      expect(mockCallRetrieve).toHaveBeenCalledWith('call-no-analysis');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCall);
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

      await getTranscriptCommand('invalid-call-id');

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

      await getTranscriptCommand('call-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
    });

    it('should handle network errors', async () => {
      const networkError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection failed'),
      });
      mockCallRetrieve.mockRejectedValue(networkError);

      await getTranscriptCommand('call-123');

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

      await getTranscriptCommand('call-123');

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

      await getTranscriptCommand('call-123');

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });

  describe('Call ID validation', () => {
    it('should accept standard call ID format', async () => {
      const mockCall = { call_id: 'call_abc123xyz' };
      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('call_abc123xyz');

      expect(mockCallRetrieve).toHaveBeenCalledWith('call_abc123xyz');
    });

    it('should accept UUID format call IDs', async () => {
      const mockCall = { call_id: '550e8400-e29b-41d4-a716-446655440000' };
      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('550e8400-e29b-41d4-a716-446655440000');

      expect(mockCallRetrieve).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should pass any call ID to SDK (let SDK validate)', async () => {
      const mockCall = { call_id: 'any-format-123' };
      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('any-format-123');

      expect(mockCallRetrieve).toHaveBeenCalledWith('any-format-123');
    });
  });

  describe('Integration with services', () => {
    it('should call getRetellClient to get SDK client', async () => {
      mockCallRetrieve.mockResolvedValue({ call_id: 'call-123' });

      await getTranscriptCommand('call-123');

      expect(retellClient.getRetellClient).toHaveBeenCalled();
    });

    it('should use outputJson for successful results', async () => {
      const mockCall = { call_id: 'call-123' };
      mockCallRetrieve.mockResolvedValue(mockCall);

      await getTranscriptCommand('call-123');

      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCall);
    });
  });
});
