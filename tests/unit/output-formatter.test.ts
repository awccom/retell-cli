/**
 * Unit tests for output formatter service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Retell from 'retell-sdk';
import {
  outputJson,
  outputError,
  outputSuccess,
  handleSdkError,
} from '../../src/services/output-formatter';

// Mock Retell SDK errors
vi.mock('retell-sdk');

describe('Output Formatter Service', () => {
  // Spy on console methods
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('outputJson', () => {
    it('should output JSON to console.log', () => {
      const data = { foo: 'bar', baz: 123 };

      outputJson(data);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(data, null, 2)
      );
    });

    it('should pretty-print JSON with 2 space indentation', () => {
      const data = { nested: { value: true } };

      outputJson(data);

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('  "nested"');
      expect(output).toContain('    "value"');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];

      outputJson(data);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(data, null, 2)
      );
    });

    it('should handle null', () => {
      outputJson(null);

      expect(consoleLogSpy).toHaveBeenCalledWith('null');
    });

    it('should handle strings', () => {
      outputJson('test string');

      expect(consoleLogSpy).toHaveBeenCalledWith('"test string"');
    });
  });

  describe('outputError', () => {
    it('should output error to console.error as JSON', () => {
      outputError('Test error', 'TEST_CODE');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        JSON.stringify({ error: 'Test error', code: 'TEST_CODE' }, null, 2)
      );
    });

    it('should exit process with code 1', () => {
      outputError('Test error', 'TEST_CODE');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should use UNKNOWN_ERROR as default code', () => {
      outputError('Test error');

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "UNKNOWN_ERROR"');
    });

    it('should handle Error objects', () => {
      const error = new Error('Something went wrong');

      outputError(error, 'MY_CODE');

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"error": "Something went wrong"');
      expect(output).toContain('"code": "MY_CODE"');
    });

    it('should extract message from Error object', () => {
      const error = new Error('Custom error message');

      outputError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Custom error message');
    });
  });

  describe('outputSuccess', () => {
    it('should output success message as JSON', () => {
      outputSuccess('Operation completed');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('"message": "Operation completed"');
    });

    it('should include additional data', () => {
      outputSuccess('Created', { id: '123', name: 'Test' });

      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.message).toBe('Created');
      expect(parsed.id).toBe('123');
      expect(parsed.name).toBe('Test');
    });

    it('should work without additional data', () => {
      outputSuccess('Done');

      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toEqual({ message: 'Done' });
    });
  });

  describe('handleSdkError', () => {
    it('should handle NotFoundError', () => {
      const error = new Retell.NotFoundError('Resource not found', { status: 404 } as any);

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "NOT_FOUND"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle AuthenticationError with helpful message', () => {
      const error = new Retell.AuthenticationError('Invalid API key', { status: 401 } as any);

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "AUTH_ERROR"');
      expect(output).toContain('retell login');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle BadRequestError', () => {
      const error = new Retell.BadRequestError('Invalid parameters', { status: 400 } as any);

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "BAD_REQUEST"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle RateLimitError', () => {
      const error = new Retell.RateLimitError('Too many requests', { status: 429 } as any);

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "RATE_LIMIT"');
      expect(output).toContain('try again later');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle PermissionDeniedError', () => {
      const error = new Retell.PermissionDeniedError('Forbidden', { status: 403 } as any);

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "PERMISSION_DENIED"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle InternalServerError', () => {
      const error = new Retell.InternalServerError('Server error', { status: 500 } as any);

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "SERVER_ERROR"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle APIConnectionError', () => {
      const error = new Retell.APIConnectionError({ message: 'Network error' });

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "CONNECTION_ERROR"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle APIConnectionTimeoutError', () => {
      const error = new Retell.APIConnectionTimeoutError({ message: 'Timeout' });

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "TIMEOUT_ERROR"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle generic APIError', () => {
      const error = new Retell.APIError(500, {} as any, 'Generic API error', {});

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code": "API_ERROR"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-SDK Error', () => {
      const error = new Error('Generic error');

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Generic error');
      expect(output).toContain('"code": "UNKNOWN_ERROR"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle unknown error type', () => {
      const error = 'string error';

      handleSdkError(error);

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('unexpected error');
      expect(output).toContain('"code": "UNKNOWN_ERROR"');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
