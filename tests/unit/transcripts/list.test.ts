/**
 * Unit tests for transcripts list command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listTranscriptsCommand } from '../../../src/commands/transcripts/list';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');

describe('List Transcripts Command', () => {
  let mockClient: any;
  let mockCallList: any;
  let exitSpy: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock client.call.list
    mockCallList = vi.fn();
    mockClient = {
      call: {
        list: mockCallList,
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

  describe('Successful listing', () => {
    it('should list calls with default limit', async () => {
      const mockCalls = [
        {
          call_id: 'call-1',
          call_status: 'ended',
          duration_ms: 30000,
          agent_name: 'Test Agent',
        },
        {
          call_id: 'call-2',
          call_status: 'ended',
          duration_ms: 45000,
          agent_name: 'Test Agent',
        },
      ];

      mockCallList.mockResolvedValue(mockCalls);

      await listTranscriptsCommand({});

      expect(mockCallList).toHaveBeenCalledWith({ limit: 50 });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCalls);
    });

    it('should list calls with custom limit', async () => {
      const mockCalls = [
        {
          call_id: 'call-1',
          call_status: 'ended',
          duration_ms: 30000,
        },
      ];

      mockCallList.mockResolvedValue(mockCalls);

      await listTranscriptsCommand({ limit: 10 });

      expect(mockCallList).toHaveBeenCalledWith({ limit: 10 });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCalls);
    });

    it('should handle no results (empty array)', async () => {
      mockCallList.mockResolvedValue([]);

      await listTranscriptsCommand({});

      expect(mockCallList).toHaveBeenCalledWith({ limit: 50 });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
    });

    it('should handle large limits', async () => {
      const mockCalls = Array.from({ length: 100 }, (_, i) => ({
        call_id: `call-${i}`,
        call_status: 'ended',
      }));

      mockCallList.mockResolvedValue(mockCalls);

      await listTranscriptsCommand({ limit: 1000 });

      expect(mockCallList).toHaveBeenCalledWith({ limit: 1000 });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCalls);
    });
  });

  describe('Error handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new Retell.AuthenticationError(
        401,
        {} as any,
        'Invalid API key',
        {} as any
      );
      mockCallList.mockRejectedValue(authError);

      await listTranscriptsCommand({});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
    });

    it('should handle network errors', async () => {
      const networkError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection failed'),
      });
      mockCallList.mockRejectedValue(networkError);

      await listTranscriptsCommand({});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(networkError);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Retell.RateLimitError(
        429,
        {} as any,
        'Rate limit exceeded',
        {} as any
      );
      mockCallList.mockRejectedValue(rateLimitError);

      await listTranscriptsCommand({});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
    });

    it('should handle generic API errors', async () => {
      const apiError = new Retell.APIError(
        500,
        {} as any,
        'Internal server error',
        {} as any
      );
      mockCallList.mockRejectedValue(apiError);

      await listTranscriptsCommand({});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Retell.APIConnectionTimeoutError({
        message: 'Request timeout',
      });
      mockCallList.mockRejectedValue(timeoutError);

      await listTranscriptsCommand({});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Integration with services', () => {
    it('should call getRetellClient to get SDK client', async () => {
      mockCallList.mockResolvedValue([]);

      await listTranscriptsCommand({});

      expect(retellClient.getRetellClient).toHaveBeenCalled();
    });

    it('should use outputJson for successful results', async () => {
      const mockCalls = [{ call_id: 'call-1' }];
      mockCallList.mockResolvedValue(mockCalls);

      await listTranscriptsCommand({});

      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCalls);
    });
  });
});
