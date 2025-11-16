/**
 * Unit tests for login command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loginCommand } from '../../src/commands/login';
import * as readline from 'readline/promises';
import Retell from 'retell-sdk';
import * as config from '../../src/services/config';
import * as outputFormatter from '../../src/services/output-formatter';

// Mock modules
vi.mock('readline/promises');
vi.mock('retell-sdk');
vi.mock('../../src/services/config');
vi.mock('../../src/services/output-formatter');

describe('Login Command', () => {
  let mockRl: any;
  let mockQuestion: any;
  let mockClose: any;
  let mockAgentList: any;
  let exitSpy: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock readline interface
    mockQuestion = vi.fn();
    mockClose = vi.fn();
    mockRl = {
      question: mockQuestion,
      close: mockClose,
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

    // Mock Retell SDK
    mockAgentList = vi.fn();
    vi.mocked(Retell).mockImplementation(() => ({
      agent: {
        list: mockAgentList,
      },
    }) as any);

    // Mock config service
    vi.mocked(config.configFileExists).mockReturnValue(false);
    vi.mocked(config.saveConfig).mockImplementation(() => {});

    // Mock output formatter
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

  describe('Successful login flow', () => {
    it('should successfully login with valid API key', async () => {
      // Setup: No existing config
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('valid-api-key-123');
      mockAgentList.mockResolvedValue([]);

      // Execute
      await loginCommand();

      // Verify
      expect(mockQuestion).toHaveBeenCalledWith('Enter your Retell API key: ');
      expect(mockAgentList).toHaveBeenCalledWith({ limit: 1 });
      expect(config.saveConfig).toHaveBeenCalledWith({
        apiKey: 'valid-api-key-123',
        defaultFormat: 'json',
      });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        message: 'Successfully authenticated!',
        configPath: './.retellrc.json',
        nextSteps: [
          'Try: retell agents list',
          'Try: retell transcripts list',
        ],
      });
      expect(mockClose).toHaveBeenCalled();
    });

    it('should trim whitespace from API key', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('  valid-api-key-123  ');
      mockAgentList.mockResolvedValue([]);

      await loginCommand();

      expect(config.saveConfig).toHaveBeenCalledWith({
        apiKey: 'valid-api-key-123', // Trimmed
        defaultFormat: 'json',
      });
    });
  });

  describe('Existing config handling', () => {
    it('should prompt for overwrite when config exists', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(true);
      mockQuestion
        .mockResolvedValueOnce('y') // Overwrite confirmation
        .mockResolvedValueOnce('new-api-key'); // API key
      mockAgentList.mockResolvedValue([]);

      await loginCommand();

      expect(mockQuestion).toHaveBeenNthCalledWith(1, 'Config already exists. Overwrite? (y/n): ');
      expect(mockQuestion).toHaveBeenNthCalledWith(2, 'Enter your Retell API key: ');
      expect(config.saveConfig).toHaveBeenCalled();
    });

    it('should cancel login when user declines overwrite', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(true);
      mockQuestion.mockResolvedValueOnce('n'); // Decline overwrite

      await loginCommand();

      expect(mockQuestion).toHaveBeenCalledWith('Config already exists. Overwrite? (y/n): ');
      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        message: 'Login cancelled',
      });
      expect(config.saveConfig).not.toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should accept uppercase Y for overwrite confirmation', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(true);
      mockQuestion
        .mockResolvedValueOnce('Y') // Uppercase Y
        .mockResolvedValueOnce('new-api-key');
      mockAgentList.mockResolvedValue([]);

      await loginCommand();

      expect(config.saveConfig).toHaveBeenCalled();
    });

    it('should treat any non-y response as decline', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(true);
      mockQuestion.mockResolvedValueOnce('maybe'); // Not 'y'

      await loginCommand();

      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        message: 'Login cancelled',
      });
      expect(config.saveConfig).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should reject empty API key', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('');

      await loginCommand();

      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        error: 'API key cannot be empty',
        code: 'INVALID_INPUT',
      });
      expect(config.saveConfig).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject whitespace-only API key', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('   ');

      await loginCommand();

      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        error: 'API key cannot be empty',
        code: 'INVALID_INPUT',
      });
      expect(config.saveConfig).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('API key validation', () => {
    it('should handle invalid API key (AuthenticationError)', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('invalid-key');

      const authError = new Retell.AuthenticationError(
        401,
        {} as any,
        'Invalid API key',
        {} as any
      );
      mockAgentList.mockRejectedValue(authError);

      await loginCommand();

      expect(mockAgentList).toHaveBeenCalledWith({ limit: 1 });
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
      expect(config.saveConfig).not.toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('valid-key');

      const networkError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection failed'),
      });
      mockAgentList.mockRejectedValue(networkError);

      await loginCommand();

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(networkError);
      expect(config.saveConfig).not.toHaveBeenCalled();
    });

    it('should handle API rate limit errors', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('valid-key');

      const rateLimitError = new Retell.RateLimitError(
        429,
        {} as any,
        'Rate limit exceeded',
        {} as any
      );
      mockAgentList.mockRejectedValue(rateLimitError);

      await loginCommand();

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(rateLimitError);
      expect(config.saveConfig).not.toHaveBeenCalled();
    });

    it('should handle generic API errors', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('valid-key');

      const apiError = new Retell.APIError(
        500,
        {} as any,
        'Internal server error',
        {} as any
      );
      mockAgentList.mockRejectedValue(apiError);

      await loginCommand();

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
      expect(config.saveConfig).not.toHaveBeenCalled();
    });
  });

  describe('Readline interface management', () => {
    it('should close readline interface on success', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('valid-key');
      mockAgentList.mockResolvedValue([]);

      await loginCommand();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should close readline interface on error', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('invalid-key');
      mockAgentList.mockRejectedValue(new Error('Test error'));

      await loginCommand();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should close readline interface when user cancels', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(true);
      mockQuestion.mockResolvedValue('n');

      await loginCommand();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Integration with services', () => {
    it('should create Retell client with provided API key', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('test-api-key');
      mockAgentList.mockResolvedValue([]);

      await loginCommand();

      expect(Retell).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should save config with json as default format', async () => {
      vi.mocked(config.configFileExists).mockReturnValue(false);
      mockQuestion.mockResolvedValue('test-key');
      mockAgentList.mockResolvedValue([]);

      await loginCommand();

      expect(config.saveConfig).toHaveBeenCalledWith({
        apiKey: 'test-key',
        defaultFormat: 'json',
      });
    });
  });
});
