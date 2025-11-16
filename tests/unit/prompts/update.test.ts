import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updatePromptsCommand } from '../../../src/commands/prompts/update';
import * as promptResolver from '../../../src/services/prompt-resolver';
import * as retellClient from '../../../src/services/retell-client';
import * as outputFormatter from '../../../src/services/output-formatter';
import * as fs from 'fs';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/prompt-resolver');
vi.mock('../../../src/services/retell-client');
vi.mock('../../../src/services/output-formatter');
vi.mock('fs');

describe('Prompts Update Command', () => {
  let mockClient: any;
  let exitSpy: any;
  let existsSyncSpy: any;
  let readFileSyncSpy: any;
  let readdirSyncSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock client
    mockClient = {
      llm: {
        update: vi.fn(),
      },
      conversationFlow: {
        update: vi.fn(),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient as any);
    vi.mocked(outputFormatter.outputJson).mockImplementation(() => {});
    vi.mocked(outputFormatter.outputError).mockImplementation((() => {
      process.exit(1);
    }) as any);
    vi.mocked(outputFormatter.handleSdkError).mockImplementation((() => {
      process.exit(1);
    }) as any);

    // Mock file system operations
    existsSyncSpy = vi.mocked(fs.existsSync);
    readFileSyncSpy = vi.mocked(fs.readFileSync);
    readdirSyncSpy = vi.mocked(fs.readdirSync);

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('Retell LLM Agents', () => {
    it('should update retell-llm prompts successfully', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test LLM Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 2,
          general_prompt: 'Old prompt.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      // Mock file system - be specific about paths
      existsSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.endsWith('agent-123')) return true; // Directory exists
        if (pathStr.endsWith('metadata.json')) return true;
        if (pathStr.endsWith('general_prompt.md')) return true;
        if (pathStr.endsWith('begin_message.txt')) return false; // No begin message
        if (pathStr.endsWith('states')) return false; // No states
        return false;
      });

      readFileSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.endsWith('metadata.json')) {
          return JSON.stringify({
            type: 'retell-llm',
            agent_name: 'Test LLM Agent',
            llm_id: 'llm-123',
            version: 2,
            pulled_at: '2024-01-01T00:00:00.000Z',
          });
        }
        if (pathStr.endsWith('general_prompt.md')) {
          return 'Updated prompt text.';
        }
        throw new Error('Unexpected file read: ' + pathStr);
      });

      mockClient.llm.update.mockResolvedValue({ llm_id: 'llm-123', version: 3 });

      await updatePromptsCommand('agent-123', {});

      // Verify SDK call
      expect(mockClient.llm.update).toHaveBeenCalledWith('llm-123', {
        general_prompt: 'Updated prompt text.',
      });

      // Verify success output
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Prompts updated successfully (draft version)',
          agent_id: 'agent-123',
          type: 'retell-llm',
          llm_id: 'llm-123',
        })
      );
    });

    it('should update retell-llm with begin_message', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-456',
        agentName: 'Agent with Begin Message',
        prompts: {
          llm_id: 'llm-456',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.endsWith('agent-456')) return true;
        if (pathStr.endsWith('metadata.json')) return true;
        if (pathStr.endsWith('general_prompt.md')) return true;
        if (pathStr.endsWith('begin_message.txt')) return true;
        if (pathStr.endsWith('states')) return false;
        return false;
      });

      readFileSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.endsWith('metadata.json')) {
          return JSON.stringify({ type: 'retell-llm', agent_name: 'Test', llm_id: 'llm-456', version: 1 });
        }
        if (pathStr.endsWith('general_prompt.md')) return 'General prompt.';
        if (pathStr.endsWith('begin_message.txt')) return 'Hello there!';
        throw new Error('Unexpected file read: ' + pathStr);
      });

      await updatePromptsCommand('agent-456', {});

      expect(mockClient.llm.update).toHaveBeenCalledWith('llm-456', {
        general_prompt: 'General prompt.',
        begin_message: 'Hello there!',
      });
    });

    it('should update retell-llm with states', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-states',
        agentName: 'Agent with States',
        prompts: {
          llm_id: 'llm-states',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        return true; // All files exist
      });

      readFileSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('metadata.json')) {
          return JSON.stringify({ type: 'retell-llm', agent_name: 'Test', llm_id: 'llm-states', version: 1 });
        }
        if (pathStr.includes('general_prompt.md')) return 'General prompt.';
        if (pathStr.includes('greeting.md')) return '# State: greeting\n\nGreet warmly.';
        if (pathStr.includes('helping.md')) return '# State: helping\n\nHelp user.';
        return '';
      });

      readdirSyncSpy.mockReturnValue(['greeting.md', 'helping.md'] as any);

      await updatePromptsCommand('agent-states', {});

      expect(mockClient.llm.update).toHaveBeenCalledWith('llm-states', {
        general_prompt: 'General prompt.',
        states: [
          { name: 'greeting', state_prompt: 'Greet warmly.' },
          { name: 'helping', state_prompt: 'Help user.' },
        ],
      });
    });

    it('should use custom source directory', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-custom',
        agentName: 'Custom Dir Agent',
        prompts: {
          llm_id: 'llm-custom',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('my-prompts/agent-custom')) return true;
        if (pathStr.includes('metadata.json')) return true;
        if (pathStr.includes('general_prompt.md')) return true;
        return false;
      });

      readFileSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('metadata.json')) {
          return JSON.stringify({ type: 'retell-llm', agent_name: 'Test', llm_id: 'llm-custom', version: 1 });
        }
        if (pathStr.includes('general_prompt.md')) return 'Test.';
        return '';
      });

      await updatePromptsCommand('agent-custom', { source: 'my-prompts' });

      // Verify it checked the custom directory
      expect(existsSyncSpy).toHaveBeenCalledWith(expect.stringContaining('my-prompts/agent-custom'));
    });
  });

  describe('Conversation Flow Agents', () => {
    it('should update conversation-flow prompts successfully', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow-789',
        agentName: 'Test Flow Agent',
        prompts: {
          conversation_flow_id: 'flow-789',
          version: 1,
          global_prompt: 'Old flow prompt.',
          nodes: [],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('agent-flow')) return true;
        if (pathStr.includes('metadata.json')) return true;
        if (pathStr.includes('global_prompt.md')) return true;
        if (pathStr.includes('nodes.json')) return true;
        return false;
      });

      readFileSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('metadata.json')) {
          return JSON.stringify({
            type: 'conversation-flow',
            agent_name: 'Test Flow Agent',
            conversation_flow_id: 'flow-789',
            version: 1,
          });
        }
        if (pathStr.includes('global_prompt.md')) return 'Updated flow prompt.';
        if (pathStr.includes('nodes.json')) {
          return JSON.stringify([{ id: 'node-1' }, { id: 'node-2' }]);
        }
        return '';
      });

      mockClient.conversationFlow.update.mockResolvedValue({ conversation_flow_id: 'flow-789', version: 2 });

      await updatePromptsCommand('agent-flow', {});

      // Verify SDK call
      expect(mockClient.conversationFlow.update).toHaveBeenCalledWith('flow-789', {
        global_prompt: 'Updated flow prompt.',
        nodes: [{ id: 'node-1' }, { id: 'node-2' }],
      });

      // Verify success output
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Prompts updated successfully (draft version)',
          agent_id: 'agent-flow',
          type: 'conversation-flow',
          conversation_flow_id: 'flow-789',
        })
      );
    });
  });

  describe('Custom LLM Agents', () => {
    it('should show error for custom-llm agent', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'custom-llm',
        error: 'Custom LLM agents cannot be managed via API.',
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockImplementation((path: any) => {
        if (String(path).includes('metadata.json')) {
          return JSON.stringify({ type: 'custom-llm', agent_name: 'Test' });
        }
        return '';
      });

      await updatePromptsCommand('agent-custom', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Custom LLM agents cannot be managed'),
        'CUSTOM_LLM_NOT_SUPPORTED'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle directory not found', async () => {
      existsSyncSpy.mockReturnValue(false);

      await updatePromptsCommand('agent-missing', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Prompts directory not found'),
        'DIRECTORY_NOT_FOUND'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle metadata.json not found', async () => {
      // Don't mock resolvePromptSource - we want to check metadata first
      existsSyncSpy.mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.endsWith('agent-no-meta')) return true; // Directory exists
        if (pathStr.includes('metadata.json')) return false; // But metadata doesn't
        return false;
      });

      await updatePromptsCommand('agent-no-meta', {});

      // Should error about missing metadata before calling resolvePromptSource
      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json not found'),
        'METADATA_NOT_FOUND'
      );
      expect(promptResolver.resolvePromptSource).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle type mismatch', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-mismatch',
        agentName: 'Mismatch Agent',
        prompts: {
          llm_id: 'llm-mismatch',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockImplementation((path: any) => {
        if (String(path).includes('metadata.json')) {
          // Local files say conversation-flow, but agent is retell-llm
          return JSON.stringify({ type: 'conversation-flow', agent_name: 'Test' });
        }
        return '';
      });

      await updatePromptsCommand('agent-mismatch', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Type mismatch'),
        'TYPE_MISMATCH'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle invalid JSON in metadata', async () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockImplementation((path: any) => {
        if (String(path).includes('metadata.json')) {
          return '{invalid json}';
        }
        return '';
      });

      await updatePromptsCommand('agent-bad-json', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON'),
        'INVALID_JSON'
      );
    });

    it('should handle agent not found error', async () => {
      const notFoundError = new Retell.NotFoundError(
        'Agent not found',
        { status: 404, headers: new Headers() } as any
      );

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(notFoundError);

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify({ type: 'retell-llm', agent_name: 'Test' }));

      await updatePromptsCommand('invalid-agent', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(notFoundError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle SDK update error', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-error',
        agentName: 'Error Agent',
        prompts: {
          llm_id: 'llm-error',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockImplementation((path: any) => {
        if (String(path).includes('metadata.json')) {
          return JSON.stringify({ type: 'retell-llm', agent_name: 'Test', llm_id: 'llm-error', version: 1 });
        }
        if (String(path).includes('general_prompt.md')) return 'Test.';
        return '';
      });

      const badRequestError = new Retell.BadRequestError(
        'Invalid prompt format',
        { status: 400, headers: new Headers() } as any
      );

      mockClient.llm.update.mockRejectedValue(badRequestError);

      await updatePromptsCommand('agent-error', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(badRequestError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
