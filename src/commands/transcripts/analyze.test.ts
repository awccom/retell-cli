/**
 * Integration tests for analyze transcript command
 *
 * Tests the --raw flag and field filtering functionality:
 * - Raw mode returns unmodified API response
 * - Raw mode combined with --fields for filtering
 * - Default enriched mode behavior
 * - Error handling consistency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeTranscriptCommand } from './analyze';
import * as retellClient from '../../services/retell-client';
import * as outputFormatter from '../../services/output-formatter';

// Mock the dependencies
vi.mock('../../services/retell-client');
vi.mock('../../services/output-formatter', async () => {
  const actual = await vi.importActual('../../services/output-formatter');
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe('analyzeTranscriptCommand', () => {
  // Mock call object that mimics Retell API response
  const mockCallData = {
    call_id: 'call_abc123',
    call_status: 'ended',
    agent_id: 'agent_123',
    agent_name: 'Test Agent',
    duration_ms: 45000,
    start_timestamp: 1234567890,
    end_timestamp: 1234612890,
    transcript: 'Full transcript text here...',
    transcript_object: [
      { role: 'agent', content: 'Hello, how can I help you today?' },
      { role: 'user', content: 'I need help with my account.' },
      { role: 'agent', content: 'I can help with that.' },
    ],
    call_analysis: {
      call_summary: 'Customer inquiry about account issues',
      user_sentiment: 'neutral',
      call_successful: true,
      in_voicemail: false,
    },
    latency: {
      e2e: { p50: 250, p90: 400 },
      llm: { p50: 150, p90: 250 },
      tts: { p50: 100, p90: 150 },
    },
    call_cost: {
      combined_cost: 0.05,
      product_costs: [
        { product: 'llm', cost: 0.03 },
        { product: 'tts', cost: 0.02 },
      ],
    },
  };

  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup mock client
    mockClient = {
      call: {
        retrieve: vi.fn().mockResolvedValue(mockCallData),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe('raw mode functionality', () => {
    it('should return unmodified API response when --raw flag is set', async () => {
      await analyzeTranscriptCommand('call_abc123', { raw: true });

      // Verify the API was called
      expect(mockClient.call.retrieve).toHaveBeenCalledWith('call_abc123');

      // Verify outputJson was called with the raw API response (not enriched)
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCallData);
    });

    it('should return enriched analysis when --raw flag is not set', async () => {
      await analyzeTranscriptCommand('call_abc123', {});

      // Verify the API was called
      expect(mockClient.call.retrieve).toHaveBeenCalledWith('call_abc123');

      // Verify outputJson was called with enriched data (not raw)
      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall).toHaveProperty('call_id');
      expect(outputCall).toHaveProperty('metadata');
      expect(outputCall).toHaveProperty('transcript');
      expect(outputCall).toHaveProperty('analysis');
      expect(outputCall).toHaveProperty('performance');
      expect(outputCall).toHaveProperty('cost');

      // Verify it's the enriched format (has metadata key, not raw fields)
      expect(outputCall.metadata).toBeDefined();
      expect(outputCall.metadata.agent_name).toBe('Test Agent');
    });

    it('should combine --raw with --fields for filtered raw output', async () => {
      await analyzeTranscriptCommand('call_abc123', {
        raw: true,
        fields: 'call_id,transcript_object',
      });

      // Verify outputJson was called with filtered raw data
      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall).toHaveProperty('call_id');
      expect(outputCall).toHaveProperty('transcript_object');
      expect(outputCall).not.toHaveProperty('call_status');
      expect(outputCall).not.toHaveProperty('agent_id');
    });

    it('should handle --fields with nested paths in raw mode', async () => {
      await analyzeTranscriptCommand('call_abc123', {
        raw: true,
        fields: 'call_id,call_analysis.call_summary',
      });

      // Verify outputJson was called with filtered nested data
      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall).toHaveProperty('call_id');
      expect(outputCall).toHaveProperty('call_analysis');
      expect(outputCall.call_analysis).toHaveProperty('call_summary');
      expect(outputCall.call_analysis.call_summary).toBe('Customer inquiry about account issues');
    });
  });

  describe('field filtering in enriched mode', () => {
    it('should filter enriched analysis when --fields is specified without --raw', async () => {
      await analyzeTranscriptCommand('call_abc123', {
        fields: 'call_id,performance',
      });

      // Verify outputJson was called with filtered enriched data
      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall).toHaveProperty('call_id');
      expect(outputCall).toHaveProperty('performance');
      expect(outputCall).not.toHaveProperty('metadata');
      expect(outputCall).not.toHaveProperty('transcript');
    });
  });

  describe('error handling', () => {
    it('should handle API errors consistently in raw mode', async () => {
      const mockError = new Error('API Error: Call not found');
      mockClient.call.retrieve.mockRejectedValue(mockError);

      await analyzeTranscriptCommand('call_invalid', { raw: true });

      // Verify handleSdkError was called with the error
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(mockError);
    });

    it('should handle API errors consistently in enriched mode', async () => {
      const mockError = new Error('API Error: Call not found');
      mockClient.call.retrieve.mockRejectedValue(mockError);

      await analyzeTranscriptCommand('call_invalid', {});

      // Verify handleSdkError was called with the error
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(mockError);
    });

    it('should handle network errors in raw mode', async () => {
      const networkError = new Error('Network timeout');
      mockClient.call.retrieve.mockRejectedValue(networkError);

      await analyzeTranscriptCommand('call_abc123', { raw: true });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(networkError);
    });
  });

  describe('edge cases', () => {
    it('should handle raw mode with empty transcript_object', async () => {
      const emptyTranscriptData = {
        ...mockCallData,
        transcript_object: [],
      };
      mockClient.call.retrieve.mockResolvedValue(emptyTranscriptData);

      await analyzeTranscriptCommand('call_abc123', { raw: true });

      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall.transcript_object).toEqual([]);
    });

    it('should handle raw mode with null values', async () => {
      const nullValueData = {
        ...mockCallData,
        call_analysis: null,
        latency: null,
      };
      mockClient.call.retrieve.mockResolvedValue(nullValueData);

      await analyzeTranscriptCommand('call_abc123', { raw: true });

      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall.call_analysis).toBeNull();
      expect(outputCall.latency).toBeNull();
    });

    it('should handle enriched mode with missing optional fields', async () => {
      const minimalData = {
        call_id: 'call_abc123',
        call_status: 'ended',
        // Missing optional fields
      };
      mockClient.call.retrieve.mockResolvedValue(minimalData);

      await analyzeTranscriptCommand('call_abc123', {});

      // Should not throw, and should handle missing fields gracefully
      expect(outputFormatter.outputJson).toHaveBeenCalled();
      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;
      expect(outputCall).toHaveProperty('call_id');
      expect(outputCall).toHaveProperty('metadata');
    });
  });

  describe('data transformation validation', () => {
    it('should NOT transform transcript_object in raw mode', async () => {
      await analyzeTranscriptCommand('call_abc123', { raw: true });

      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;

      // Raw mode should return exact transcript_object from API
      expect(outputCall.transcript_object).toEqual(mockCallData.transcript_object);

      // Verify it's the exact same structure (no word_count added)
      expect(outputCall.transcript_object[0]).not.toHaveProperty('word_count');
    });

    it('should transform transcript_object in enriched mode', async () => {
      await analyzeTranscriptCommand('call_abc123', {});

      const outputCall = vi.mocked(outputFormatter.outputJson).mock.calls[0][0] as any;

      // Enriched mode should transform transcript with word_count
      expect(outputCall.transcript).toBeDefined();
      expect(outputCall.transcript[0]).toHaveProperty('word_count');
      expect(outputCall.transcript[0].word_count).toBeGreaterThan(0);
    });
  });
});
