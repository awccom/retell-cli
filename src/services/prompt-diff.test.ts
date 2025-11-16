/**
 * Unit tests for prompt-diff service
 *
 * Tests the generateDiff() and formatDiffSummary() utilities with various scenarios:
 * - Retell-LLM prompt changes
 * - Conversation-flow prompt changes
 * - No changes scenario
 * - Type mismatches between local and remote
 * - Error handling
 */

import { describe, it, expect } from 'vitest';
import { generateDiff, formatDiffSummary } from './prompt-diff';
import type { PromptSource } from './prompt-resolver';

describe('generateDiff', () => {
  describe('retell-llm prompts', () => {
    it('should detect no changes when prompts are identical', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello!',
        },
      };

      const remote: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello!',
        },
      };

      const result = generateDiff(local, remote);

      expect(result.agent_id).toBe('llm_123');
      expect(result.agent_type).toBe('retell-llm');
      expect(result.has_changes).toBe(false);
      expect(Object.keys(result.changes)).toHaveLength(0);
    });

    it('should detect modified general_prompt', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a VERY helpful assistant.',
          begin_message: 'Hello!',
        },
      };

      const remote: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello!',
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes['general_prompt']).toBeDefined();
      expect(result.changes['general_prompt'].change_type).toBe('modified');
      expect(result.changes['general_prompt'].old).toBe('You are a helpful assistant.');
      expect(result.changes['general_prompt'].new).toBe('You are a VERY helpful assistant.');
    });

    it('should detect added begin_message', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello! How can I help you today?',
        },
      };

      const remote: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes['begin_message']).toBeDefined();
      expect(result.changes['begin_message'].change_type).toBe('added');
      expect(result.changes['begin_message'].old).toBeNull();
      expect(result.changes['begin_message'].new).toBe('Hello! How can I help you today?');
    });

    it('should detect removed begin_message', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
        },
      };

      const remote: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello!',
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes['begin_message']).toBeDefined();
      expect(result.changes['begin_message'].change_type).toBe('removed');
      expect(result.changes['begin_message'].old).toBe('Hello!');
      expect(result.changes['begin_message'].new).toBeNull();
    });

    it('should detect changes in states array', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          states: [
            { name: 'greeting', state_prompt: 'Greet the user warmly.' },
            { name: 'help', state_prompt: 'Provide assistance.' },
          ],
        },
      };

      const remote: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          states: [
            { name: 'greeting', state_prompt: 'Greet the user.' },
            { name: 'help', state_prompt: 'Provide assistance.' },
          ],
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes['states.0.state_prompt']).toBeDefined();
      expect(result.changes['states.0.state_prompt'].change_type).toBe('modified');
      expect(result.changes['states.0.state_prompt'].old).toBe('Greet the user.');
      expect(result.changes['states.0.state_prompt'].new).toBe('Greet the user warmly.');
    });

    it('should detect multiple changes across different fields', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 2,
          general_prompt: 'You are a VERY helpful assistant.',
          begin_message: 'Hi there!',
          states: [
            { name: 'greeting', state_prompt: 'Greet warmly.' },
          ],
        },
      };

      const remote: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'Test Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'You are a helpful assistant.',
          begin_message: 'Hello!',
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(Object.keys(result.changes).length).toBeGreaterThan(0);
      // Should detect version, general_prompt, begin_message, and states changes
    });
  });

  describe('conversation-flow prompts', () => {
    it('should detect no changes when flow prompts are identical', () => {
      const local: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Follow the conversation flow.',
          nodes: [{ id: 'node1', type: 'message', content: 'Hello' }],
        },
      };

      const remote: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Follow the conversation flow.',
          nodes: [{ id: 'node1', type: 'message', content: 'Hello' }],
        },
      };

      const result = generateDiff(local, remote);

      expect(result.agent_id).toBe('flow_456');
      expect(result.agent_type).toBe('conversation-flow');
      expect(result.has_changes).toBe(false);
      expect(Object.keys(result.changes)).toHaveLength(0);
    });

    it('should detect modified global_prompt', () => {
      const local: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Follow the conversation flow carefully.',
          nodes: [],
        },
      };

      const remote: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Follow the conversation flow.',
          nodes: [],
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes['global_prompt']).toBeDefined();
      expect(result.changes['global_prompt'].change_type).toBe('modified');
      expect(result.changes['global_prompt'].old).toBe('Follow the conversation flow.');
      expect(result.changes['global_prompt'].new).toBe('Follow the conversation flow carefully.');
    });

    it('should detect changes in nodes array', () => {
      const local: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Follow the flow.',
          nodes: [
            { id: 'node1', type: 'message', content: 'Hello there!' },
          ],
        },
      };

      const remote: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Follow the flow.',
          nodes: [
            { id: 'node1', type: 'message', content: 'Hello!' },
          ],
        },
      };

      const result = generateDiff(local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes['nodes.0.content']).toBeDefined();
      expect(result.changes['nodes.0.content'].change_type).toBe('modified');
    });
  });

  describe('error handling', () => {
    it('should throw error when comparing different agent types', () => {
      const local: PromptSource = {
        type: 'retell-llm',
        llmId: 'llm_123',
        agentName: 'LLM Agent',
        prompts: {
          llm_id: 'llm_123',
          version: 1,
          general_prompt: 'Test',
        },
      };

      const remote: PromptSource = {
        type: 'conversation-flow',
        flowId: 'flow_456',
        agentName: 'Flow Agent',
        prompts: {
          conversation_flow_id: 'flow_456',
          version: 1,
          global_prompt: 'Test',
          nodes: [],
        },
      };

      expect(() => generateDiff(local, remote)).toThrow(
        "Cannot diff different agent types: local is 'retell-llm', remote is 'conversation-flow'"
      );
    });

    it('should throw error for custom-llm type', () => {
      const local: PromptSource = {
        type: 'custom-llm',
        error: 'Not supported',
      };

      const remote: PromptSource = {
        type: 'custom-llm',
        error: 'Not supported',
      };

      expect(() => generateDiff(local, remote)).toThrow(
        'Cannot diff custom-llm agents'
      );
    });
  });
});

describe('formatDiffSummary', () => {
  it('should format summary when no changes detected', () => {
    const diffResult = {
      agent_id: 'llm_123',
      agent_type: 'retell-llm' as const,
      has_changes: false,
      changes: {},
    };

    const summary = formatDiffSummary(diffResult);

    expect(summary).toContain('No changes detected');
    expect(summary).toContain('llm_123');
    expect(summary).toContain('retell-llm');
  });

  it('should format summary with changes', () => {
    const diffResult = {
      agent_id: 'llm_123',
      agent_type: 'retell-llm' as const,
      has_changes: true,
      changes: {
        'general_prompt': {
          old: 'Old prompt',
          new: 'New prompt',
          change_type: 'modified' as const,
        },
        'begin_message': {
          old: null,
          new: 'Hello!',
          change_type: 'added' as const,
        },
      },
    };

    const summary = formatDiffSummary(diffResult);

    expect(summary).toContain('Changes detected for llm_123');
    expect(summary).toContain('general_prompt: modified');
    expect(summary).toContain('begin_message: added');
    expect(summary).toContain('Total changes: 2');
  });

  it('should handle conversation-flow summaries', () => {
    const diffResult = {
      agent_id: 'flow_456',
      agent_type: 'conversation-flow' as const,
      has_changes: true,
      changes: {
        'global_prompt': {
          old: 'Old',
          new: 'New',
          change_type: 'modified' as const,
        },
      },
    };

    const summary = formatDiffSummary(diffResult);

    expect(summary).toContain('flow_456');
    expect(summary).toContain('conversation-flow');
    expect(summary).toContain('global_prompt: modified');
  });

  it('should include all change types in summary', () => {
    const diffResult = {
      agent_id: 'llm_123',
      agent_type: 'retell-llm' as const,
      has_changes: true,
      changes: {
        'field1': {
          old: null,
          new: 'value',
          change_type: 'added' as const,
        },
        'field2': {
          old: 'value',
          new: null,
          change_type: 'removed' as const,
        },
        'field3': {
          old: 'old',
          new: 'new',
          change_type: 'modified' as const,
        },
      },
    };

    const summary = formatDiffSummary(diffResult);

    expect(summary).toContain('field1: added');
    expect(summary).toContain('field2: removed');
    expect(summary).toContain('field3: modified');
    expect(summary).toContain('Total changes: 3');
  });
});
