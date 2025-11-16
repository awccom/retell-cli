/**
 * Unit tests for Retell client service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Retell from 'retell-sdk';
import {
  getRetellClient,
  resetClient,
  isClientInitialized,
} from '../../src/services/retell-client';
import * as configService from '../../src/services/config';

// Mock retell-sdk
vi.mock('retell-sdk');

// Mock config service
vi.mock('../../src/services/config', () => ({
  getConfig: vi.fn(),
  ConfigError: class ConfigError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'ConfigError';
    }
  },
}));

describe('Retell Client Service', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset client singleton
    resetClient();
  });

  describe('getRetellClient', () => {
    it('should create a new client on first call', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'test-key-123',
        defaultFormat: 'json',
      });

      const client = getRetellClient();

      expect(client).toBeDefined();
      expect(Retell).toHaveBeenCalledWith({
        apiKey: 'test-key-123',
        maxRetries: 2,
        timeout: 60000,
      });
    });

    it('should return the same client instance on subsequent calls (singleton)', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'test-key-123',
        defaultFormat: 'json',
      });

      const client1 = getRetellClient();
      const client2 = getRetellClient();

      expect(client1).toBe(client2);
      expect(Retell).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should get API key from config service', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'my-api-key',
        defaultFormat: 'json',
      });

      getRetellClient();

      expect(configService.getConfig).toHaveBeenCalled();
      expect(Retell).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'my-api-key',
        })
      );
    });

    it('should configure client with correct retries and timeout', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'test-key',
        defaultFormat: 'json',
      });

      getRetellClient();

      expect(Retell).toHaveBeenCalledWith({
        apiKey: 'test-key',
        maxRetries: 2,
        timeout: 60000,
      });
    });

    it('should throw ConfigError when no API key is configured', () => {
      vi.mocked(configService.getConfig).mockImplementation(() => {
        throw new configService.ConfigError(
          'No configuration found',
          'NO_CONFIG'
        );
      });

      expect(() => getRetellClient()).toThrow(configService.ConfigError);
      expect(() => getRetellClient()).toThrow('No configuration found');
    });

    it('should wrap non-ConfigError exceptions', () => {
      vi.mocked(configService.getConfig).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      expect(() => getRetellClient()).toThrow('Failed to initialize Retell client');
      expect(() => getRetellClient()).toThrow('Unexpected error');
    });
  });

  describe('resetClient', () => {
    it('should reset the client instance', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'test-key-123',
        defaultFormat: 'json',
      });

      // Create client
      const client1 = getRetellClient();
      expect(isClientInitialized()).toBe(true);

      // Reset
      resetClient();
      expect(isClientInitialized()).toBe(false);

      // Create new client
      const client2 = getRetellClient();

      // Should be a new instance
      expect(Retell).toHaveBeenCalledTimes(2);
    });

    it('should allow creating a new client after reset', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'key-1',
        defaultFormat: 'json',
      });

      getRetellClient();
      resetClient();

      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'key-2',
        defaultFormat: 'json',
      });

      getRetellClient();

      expect(Retell).toHaveBeenCalledTimes(2);
      expect(Retell).toHaveBeenNthCalledWith(1, expect.objectContaining({ apiKey: 'key-1' }));
      expect(Retell).toHaveBeenNthCalledWith(2, expect.objectContaining({ apiKey: 'key-2' }));
    });
  });

  describe('isClientInitialized', () => {
    it('should return false when client is not initialized', () => {
      expect(isClientInitialized()).toBe(false);
    });

    it('should return true when client is initialized', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'test-key-123',
        defaultFormat: 'json',
      });

      getRetellClient();

      expect(isClientInitialized()).toBe(true);
    });

    it('should return false after reset', () => {
      vi.mocked(configService.getConfig).mockReturnValue({
        apiKey: 'test-key-123',
        defaultFormat: 'json',
      });

      getRetellClient();
      expect(isClientInitialized()).toBe(true);

      resetClient();
      expect(isClientInitialized()).toBe(false);
    });
  });
});
