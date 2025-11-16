/**
 * Unit tests for config service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, unlinkSync, chmodSync } from 'fs';
import {
  getConfig,
  saveConfig,
  configFileExists,
  getConfigFilePath,
  isUsingEnvVar,
  ConfigError,
} from '../../src/services/config';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
  chmodSync: vi.fn(),
}));

describe('Config Service', () => {
  // Store original env
  const originalEnv = process.env.RETELL_API_KEY;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset environment
    delete process.env.RETELL_API_KEY;
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.RETELL_API_KEY = originalEnv;
    } else {
      delete process.env.RETELL_API_KEY;
    }
  });

  describe('getConfig', () => {
    it('should return config from environment variable (highest priority)', () => {
      process.env.RETELL_API_KEY = 'env-key-123';
      vi.mocked(existsSync).mockReturnValue(false);

      const config = getConfig();

      expect(config).toEqual({
        apiKey: 'env-key-123',
        defaultFormat: 'json',
      });
    });

    it('should return config from file when no env var', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          apiKey: 'file-key-123',
          defaultFormat: 'json',
        })
      );

      const config = getConfig();

      expect(config).toEqual({
        apiKey: 'file-key-123',
        defaultFormat: 'json',
      });
    });

    it('should prefer env var over config file', () => {
      process.env.RETELL_API_KEY = 'env-key-123';
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          apiKey: 'file-key-123',
          defaultFormat: 'json',
        })
      );

      const config = getConfig();

      expect(config.apiKey).toBe('env-key-123');
      expect(readFileSync).not.toHaveBeenCalled(); // Should not read file
    });

    it('should throw ConfigError when no config exists', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(false);

      expect(() => getConfig()).toThrow(ConfigError);
      expect(() => getConfig()).toThrow('Please run `retell login`');
    });

    it('should throw ConfigError on invalid JSON in config file', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{ invalid json }');

      expect(() => getConfig()).toThrow(ConfigError);
      expect(() => getConfig()).toThrow('invalid JSON');
    });

    it('should throw ConfigError on invalid config schema', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          apiKey: '', // Invalid: empty string
          defaultFormat: 'json',
        })
      );

      expect(() => getConfig()).toThrow(ConfigError);
    });

    it('should throw ConfigError on invalid defaultFormat', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          apiKey: 'key-123',
          defaultFormat: 'invalid', // Invalid enum value
        })
      );

      expect(() => getConfig()).toThrow(ConfigError);
    });

    it('should handle generic error when reading config file', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Unknown file system error');
      });

      expect(() => getConfig()).toThrow(Error);
      expect(() => getConfig()).toThrow('Unknown file system error');
    });

    it('should handle EACCES (permission denied) when reading config file', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      const permissionError = new Error('EACCES: permission denied');
      (permissionError as any).code = 'EACCES';
      vi.mocked(readFileSync).mockImplementation(() => {
        throw permissionError;
      });

      expect(() => getConfig()).toThrow('EACCES');
    });

    it('should handle corrupted config file with only brackets', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{}');

      expect(() => getConfig()).toThrow(ConfigError);
      expect(() => getConfig()).toThrow('Invalid config file format');
    });

    it('should handle config file with null values', () => {
      delete process.env.RETELL_API_KEY;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          apiKey: null,
          defaultFormat: 'json',
        })
      );

      expect(() => getConfig()).toThrow(ConfigError);
    });
  });

  describe('saveConfig', () => {
    it('should save valid config to file', () => {
      const config = {
        apiKey: 'new-key-123',
        defaultFormat: 'json' as const,
      };

      saveConfig(config);

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.retellrc.json'),
        JSON.stringify(config, null, 2),
        { encoding: 'utf-8' }
      );
      expect(chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('.retellrc.json'),
        0o600
      );
    });

    it('should set file permissions to 600', () => {
      const config = {
        apiKey: 'new-key-123',
        defaultFormat: 'json' as const,
      };

      saveConfig(config);

      expect(chmodSync).toHaveBeenCalledWith(
        expect.any(String),
        0o600 // Read/write for owner only
      );
    });

    it('should throw ConfigError on invalid config', () => {
      const invalidConfig = {
        apiKey: '', // Invalid: empty
        defaultFormat: 'json' as const,
      };

      expect(() => saveConfig(invalidConfig)).toThrow(ConfigError);
    });

    it('should throw ConfigError on write failure', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const config = {
        apiKey: 'new-key-123',
        defaultFormat: 'json' as const,
      };

      expect(() => saveConfig(config)).toThrow(ConfigError);
      expect(() => saveConfig(config)).toThrow('Failed to save config');
    });

    it('should handle ENOSPC (no space left) when writing config file', () => {
      const noSpaceError = new Error('ENOSPC: no space left on device');
      (noSpaceError as any).code = 'ENOSPC';
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw noSpaceError;
      });

      const config = {
        apiKey: 'new-key-123',
        defaultFormat: 'json' as const,
      };

      expect(() => saveConfig(config)).toThrow(ConfigError);
      expect(() => saveConfig(config)).toThrow('Failed to save config');
    });

    it('should handle EACCES (permission denied) when writing config file', () => {
      const permissionError = new Error('EACCES: permission denied');
      (permissionError as any).code = 'EACCES';
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw permissionError;
      });

      const config = {
        apiKey: 'new-key-123',
        defaultFormat: 'json' as const,
      };

      expect(() => saveConfig(config)).toThrow(ConfigError);
      expect(() => saveConfig(config)).toThrow('Failed to save config');
    });

    it('should apply default values for optional fields', () => {
      // Reset mocks to clear error-throwing behavior from previous test
      vi.mocked(writeFileSync).mockReset();
      vi.mocked(chmodSync).mockReset();

      const config = {
        apiKey: 'new-key-123',
        defaultFormat: 'text' as const,
      };

      saveConfig(config);

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"defaultFormat": "text"'),
        expect.any(Object)
      );
    });

    it('should handle generic error during validation', () => {
      // Create a config that would trigger an unexpected error during validation
      // This tests the generic error throw in the catch block (lines 135-136)
      const invalidConfig = {
        apiKey: 123, // Wrong type - should be string
        defaultFormat: 'json' as const,
      };

      expect(() => saveConfig(invalidConfig as any)).toThrow(ConfigError);
    });
  });

  describe('configFileExists', () => {
    it('should return true when config file exists', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      expect(configFileExists()).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(
        expect.stringContaining('.retellrc.json')
      );
    });

    it('should return false when config file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(configFileExists()).toBe(false);
    });
  });

  describe('getConfigFilePath', () => {
    it('should return path to config file in current directory', () => {
      const path = getConfigFilePath();

      expect(path).toContain('.retellrc.json');
      expect(path).toContain(process.cwd());
    });
  });

  describe('isUsingEnvVar', () => {
    it('should return true when RETELL_API_KEY is set', () => {
      process.env.RETELL_API_KEY = 'env-key-123';

      expect(isUsingEnvVar()).toBe(true);
    });

    it('should return false when RETELL_API_KEY is not set', () => {
      delete process.env.RETELL_API_KEY;

      expect(isUsingEnvVar()).toBe(false);
    });
  });

  describe('ConfigError', () => {
    it('should have correct properties', () => {
      const error = new ConfigError('Test message', 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ConfigError');
      expect(error instanceof Error).toBe(true);
    });
  });
});
