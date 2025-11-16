import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pullPromptsCommand } from '../../../src/commands/prompts/pull';
import * as promptResolver from '../../../src/services/prompt-resolver';
import * as outputFormatter from '../../../src/services/output-formatter';
import * as fs from 'fs';
import Retell from 'retell-sdk';

// Mock modules
vi.mock('../../../src/services/prompt-resolver');
vi.mock('../../../src/services/output-formatter');
vi.mock('fs');

describe('Prompts Pull Command', () => {
  let exitSpy: any;
  let mkdirSyncSpy: any;
  let writeFileSyncSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(outputFormatter.outputJson).mockImplementation(() => {});
    vi.mocked(outputFormatter.outputError).mockImplementation((() => {
      process.exit(1);
    }) as any);
    vi.mocked(outputFormatter.handleSdkError).mockImplementation((() => {
      process.exit(1);
    }) as any);

    // Mock file system operations
    mkdirSyncSpy = vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    writeFileSyncSpy = vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('Retell LLM Agents', () => {
    it('should pull retell-llm prompts successfully', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test LLM Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 2,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello! How can I help?',
          states: [
            {
              name: 'greeting',
              state_prompt: 'Greet the user warmly.',
            },
          ],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-123', {});

      // Verify directory creation
      expect(mkdirSyncSpy).toHaveBeenCalledWith('.retell-prompts/agent-123', { recursive: true });
      expect(mkdirSyncSpy).toHaveBeenCalledWith(expect.stringContaining('states'), { recursive: true });

      // Verify files written
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.stringContaining('"type": "retell-llm"')
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('general_prompt.md'),
        'You are a helpful assistant.'
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('begin_message.txt'),
        'Hello! How can I help?'
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('greeting.md'),
        expect.stringContaining('Greet the user warmly.')
      );

      // Verify success output
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Prompts pulled successfully',
          agent_id: 'agent-123',
          agent_name: 'Test LLM Agent',
          type: 'retell-llm',
          directory: '.retell-prompts/agent-123',
        })
      );
    });

    it('should pull retell-llm prompts without optional fields', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-minimal',
        agentName: 'Minimal Agent',
        prompts: {
          llm_id: 'llm-minimal',
          version: 1,
          general_prompt: 'Minimal prompt.',
          begin_message: undefined,
          states: undefined,
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-minimal', {});

      // Should create base directory
      expect(mkdirSyncSpy).toHaveBeenCalledWith('.retell-prompts/agent-minimal', { recursive: true });

      // Should write metadata and general_prompt
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.any(String)
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('general_prompt.md'),
        'Minimal prompt.'
      );

      // Should NOT write begin_message.txt or create states directory
      expect(writeFileSyncSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('begin_message.txt'),
        expect.any(String)
      );
      expect(mkdirSyncSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('states'),
        expect.any(Object)
      );
    });

    it('should pull retell-llm prompts with multiple states', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-states',
        agentName: 'Multi-State Agent',
        prompts: {
          llm_id: 'llm-states',
          version: 3,
          general_prompt: 'Stateful agent.',
          states: [
            { name: 'greeting', state_prompt: 'Greet user.' },
            { name: 'helping', state_prompt: 'Help user.' },
            { name: 'closing', state_prompt: 'Close conversation.' },
          ],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-states', {});

      // Verify states directory created
      expect(mkdirSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('states'),
        { recursive: true }
      );

      // Verify all state files written
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('greeting.md'),
        expect.stringContaining('Greet user.')
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('helping.md'),
        expect.stringContaining('Help user.')
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('closing.md'),
        expect.stringContaining('Close conversation.')
      );
    });

    it('should use custom output directory for retell-llm', async () => {
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

      await pullPromptsCommand('agent-custom', { output: '/custom/path' });

      // Verify custom directory used
      expect(mkdirSyncSpy).toHaveBeenCalledWith('/custom/path/agent-custom', { recursive: true });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          directory: '/custom/path/agent-custom',
        })
      );
    });
  });

  describe('Conversation Flow Agents', () => {
    it('should pull conversation-flow prompts successfully', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow-456',
        agentName: 'Test Flow Agent',
        prompts: {
          conversation_flow_id: 'flow-456',
          version: 1,
          global_prompt: 'Follow the conversation flow.',
          nodes: [
            { id: 'node-1', type: 'start' },
            { id: 'node-2', type: 'response' },
          ],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-flow', {});

      // Verify directory creation
      expect(mkdirSyncSpy).toHaveBeenCalledWith('.retell-prompts/agent-flow', { recursive: true });

      // Verify files written
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.stringContaining('"type": "conversation-flow"')
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('global_prompt.md'),
        'Follow the conversation flow.'
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('nodes.json'),
        expect.stringContaining('"id": "node-1"')
      );

      // Verify success output
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Prompts pulled successfully',
          agent_id: 'agent-flow',
          agent_name: 'Test Flow Agent',
          type: 'conversation-flow',
        })
      );
    });

    it('should use custom output directory for conversation-flow', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow-custom',
        agentName: 'Custom Flow',
        prompts: {
          conversation_flow_id: 'flow-custom',
          version: 1,
          global_prompt: 'Test.',
          nodes: [],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-flow-custom', { output: './my-prompts' });

      // Verify custom directory used
      expect(mkdirSyncSpy).toHaveBeenCalledWith('my-prompts/agent-flow-custom', { recursive: true });
    });
  });

  describe('Custom LLM Agents', () => {
    it('should show error for custom-llm agent', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'custom-llm',
        error: 'Custom LLM agents cannot be managed via API. Use the Retell dashboard to update prompts for custom LLM agents.',
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-custom-llm', {});

      // Should call outputError with custom LLM message
      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Custom LLM agents cannot be managed'),
        'CUSTOM_LLM_NOT_SUPPORTED'
      );

      // Should NOT create any directories or files
      expect(mkdirSyncSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).not.toHaveBeenCalled();

      // Should exit with error
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle agent not found error', async () => {
      const notFoundError = new Retell.NotFoundError(
        'Agent not found',
        { status: 404, headers: new Headers() } as any
      );

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(notFoundError);

      await pullPromptsCommand('invalid-agent', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(notFoundError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle authentication error', async () => {
      const authError = new Retell.AuthenticationError(
        'Invalid API key',
        { status: 401, headers: new Headers() } as any
      );

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(authError);

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(authError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle API connection error', async () => {
      const connectionError = new Retell.APIConnectionError({
        message: 'Network error',
        cause: new Error('Connection refused'),
      });

      vi.mocked(promptResolver.resolvePromptSource).mockRejectedValue(connectionError);

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(connectionError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Agent ID Validation', () => {
    it('should reject agent ID with path traversal (..)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('../malicious-agent', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid agent ID'),
        })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject agent ID with forward slash', async () => {
      await pullPromptsCommand('path/to/agent', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid agent ID'),
        })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject agent ID with backslash', async () => {
      await pullPromptsCommand('path\\to\\agent', {});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid agent ID'),
        })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Directory Creation Errors', () => {
    it('should handle permission denied error (EACCES)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      const eaccesError = new Error('Permission denied') as any;
      eaccesError.code = 'EACCES';
      mkdirSyncSpy.mockImplementationOnce(() => {
        throw eaccesError;
      });

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied'),
        'PERMISSION_DENIED'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle no space left error (ENOSPC)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      const enospcError = new Error('No space left on device') as any;
      enospcError.code = 'ENOSPC';
      mkdirSyncSpy.mockImplementationOnce(() => {
        throw enospcError;
      });

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('No space left'),
        'NO_SPACE'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle generic directory creation error', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      const genericError = new Error('Unknown error') as any;
      mkdirSyncSpy.mockImplementationOnce(() => {
        throw genericError;
      });

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create directory'),
        'FS_ERROR'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('File Write Errors', () => {
    it('should handle permission denied when writing files (EACCES)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      const eaccesError = new Error('Permission denied') as any;
      eaccesError.code = 'EACCES';
      writeFileSyncSpy.mockImplementationOnce(() => {
        throw eaccesError;
      });

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied writing files'),
        'PERMISSION_DENIED'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle no space left when writing files (ENOSPC)', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      const enospcError = new Error('No space left on device') as any;
      enospcError.code = 'ENOSPC';
      writeFileSyncSpy.mockImplementationOnce(() => {
        throw enospcError;
      });

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('No space left'),
        'NO_SPACE'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle generic file write error', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm-123',
          version: 1,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      const genericError = new Error('Unknown write error') as any;
      writeFileSyncSpy.mockImplementationOnce(() => {
        throw genericError;
      });

      await pullPromptsCommand('agent-123', {});

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write prompt files'),
        'FS_ERROR'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('File Content Verification', () => {
    it('should write metadata with correct structure for retell-llm', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'retell-llm',
        llmId: 'llm-metadata',
        agentName: 'Metadata Test',
        prompts: {
          llm_id: 'llm-metadata',
          version: 5,
          general_prompt: 'Test.',
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-metadata', {});

      // Find the metadata.json write call
      const metadataCall = writeFileSyncSpy.mock.calls.find((call) =>
        call[0].includes('metadata.json')
      );

      expect(metadataCall).toBeDefined();
      const metadata = JSON.parse(metadataCall![1]);

      expect(metadata).toMatchObject({
        type: 'retell-llm',
        agent_name: 'Metadata Test',
        llm_id: 'llm-metadata',
        version: 5,
      });
      expect(metadata).toHaveProperty('pulled_at');
    });

    it('should write metadata with correct structure for conversation-flow', async () => {
      const mockPromptSource: promptResolver.PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow-metadata',
        agentName: 'Flow Metadata Test',
        prompts: {
          conversation_flow_id: 'flow-metadata',
          version: 3,
          global_prompt: 'Test.',
          nodes: [],
        },
      };

      vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue(mockPromptSource);

      await pullPromptsCommand('agent-flow-metadata', {});

      // Find the metadata.json write call
      const metadataCall = writeFileSyncSpy.mock.calls.find((call) =>
        call[0].includes('metadata.json')
      );

      expect(metadataCall).toBeDefined();
      const metadata = JSON.parse(metadataCall![1]);

      expect(metadata).toMatchObject({
        type: 'conversation-flow',
        agent_name: 'Flow Metadata Test',
        conversation_flow_id: 'flow-metadata',
        version: 3,
      });
      expect(metadata).toHaveProperty('pulled_at');
    });
  });
});
