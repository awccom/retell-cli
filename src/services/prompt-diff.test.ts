/**
 * Unit tests for prompt-diff service
 *
 * Tests the generateDiff() utility with various scenarios:
 * - Retell-LLM prompt changes
 * - Conversation-flow prompt changes
 * - No changes scenario
 * - Type mismatches between local and remote
 * - Error handling
 */

import { describe, it, expect } from "vitest";
import { generateDiff } from "./prompt-diff";
import type { PromptSource } from "./prompt-resolver";
import type { LocalPrompts } from "./prompt-loader";

describe("generateDiff", () => {
  describe("retell-llm prompts", () => {
    it("should detect no changes when prompts are identical", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test Agent",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "You are a helpful assistant.",
          begin_message: "Hello!",
        },
      };

      const remote: PromptSource = {
        type: "retell-llm",
        llmId: "llm_123",
        agentName: "Test Agent",
        prompts: {
          llm_id: "llm_123",
          version: 1,
          general_prompt: "You are a helpful assistant.",
          begin_message: "Hello!",
        },
      };

      const result = generateDiff("llm_123", local, remote);

      expect(result.agent_id).toBe("llm_123");
      expect(result.agent_type).toBe("retell-llm");
      expect(result.has_changes).toBe(false);
      expect(Object.keys(result.changes)).toHaveLength(0);
    });

    it("should detect modified general_prompt", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test Agent",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "You are a VERY helpful assistant.",
          begin_message: "Hello!",
        },
      };

      const remote: PromptSource = {
        type: "retell-llm",
        llmId: "llm_123",
        agentName: "Test Agent",
        prompts: {
          llm_id: "llm_123",
          version: 1,
          general_prompt: "You are a helpful assistant.",
          begin_message: "Hello!",
        },
      };

      const result = generateDiff("llm_123", local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes["general_prompt"]).toBeDefined();
      expect(result.changes["general_prompt"].change_type).toBe("modified");
      expect(result.changes["general_prompt"].old).toBe(
        "You are a helpful assistant.",
      );
      expect(result.changes["general_prompt"].new).toBe(
        "You are a VERY helpful assistant.",
      );
    });

    it("should detect added begin_message", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test Agent",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "You are a helpful assistant.",
          begin_message: "Hello! How can I help you today?",
        },
      };

      const remote: PromptSource = {
        type: "retell-llm",
        llmId: "llm_123",
        agentName: "Test Agent",
        prompts: {
          llm_id: "llm_123",
          version: 1,
          general_prompt: "You are a helpful assistant.",
        },
      };

      const result = generateDiff("llm_123", local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes["begin_message"]).toBeDefined();
      expect(result.changes["begin_message"].change_type).toBe("added");
      expect(result.changes["begin_message"].old).toBeNull();
      expect(result.changes["begin_message"].new).toBe(
        "Hello! How can I help you today?",
      );
    });

    it("should detect removed begin_message", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test Agent",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "You are a helpful assistant.",
        },
      };

      const remote: PromptSource = {
        type: "retell-llm",
        llmId: "llm_123",
        agentName: "Test Agent",
        prompts: {
          llm_id: "llm_123",
          version: 1,
          general_prompt: "You are a helpful assistant.",
          begin_message: "Hello!",
        },
      };

      const result = generateDiff("llm_123", local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes["begin_message"]).toBeDefined();
      expect(result.changes["begin_message"].change_type).toBe("removed");
      expect(result.changes["begin_message"].old).toBe("Hello!");
      expect(result.changes["begin_message"].new).toBeNull();
    });

    it.skip("should detect changes in states array", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test Agent",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "You are a helpful assistant.",
          states: [
            { name: "greeting", state_prompt: "Greet the user warmly." },
            { name: "help", state_prompt: "Provide assistance." },
          ],
        },
      };

      const remote: PromptSource = {
        type: "retell-llm",
        llmId: "llm_123",
        agentName: "Test Agent",
        prompts: {
          llm_id: "llm_123",
          version: 1,
          general_prompt: "You are a helpful assistant.",
          states: [
            { name: "greeting", state_prompt: "Greet the user." },
            { name: "help", state_prompt: "Provide assistance." },
          ],
        },
      };

      const result = generateDiff("llm_123", local, remote);

      expect(result.has_changes).toBe(true);
      // Deep array comparison - changes detected at array level
      expect(result.changes["states"]).toBeDefined();
      expect(result.changes["states"].change_type).toBe("modified");
    });

    it("should detect multiple changes across different fields", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test Agent",
          llm_id: "llm_123",
          version: 2,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "You are a VERY helpful assistant.",
          begin_message: "Hi there!",
          states: [{ name: "greeting", state_prompt: "Greet warmly." }],
        },
      };

      const remote: PromptSource = {
        type: "retell-llm",
        llmId: "llm_123",
        agentName: "Test Agent",
        prompts: {
          llm_id: "llm_123",
          version: 1,
          general_prompt: "You are a helpful assistant.",
          begin_message: "Hello!",
        },
      };

      const result = generateDiff("llm_123", local, remote);

      expect(result.has_changes).toBe(true);
      expect(Object.keys(result.changes).length).toBeGreaterThan(0);
      // Should detect general_prompt, begin_message, and states changes
    });
  });

  describe("conversation-flow prompts", () => {
    it("should detect no changes when flow prompts are identical", () => {
      const local: LocalPrompts = {
        type: "conversation-flow",
        metadata: {
          type: "conversation-flow",
          agent_name: "Flow Agent",
          conversation_flow_id: "flow_456",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          global_prompt: "Follow the conversation flow.",
          nodes: [{ id: "node1", type: "message", content: "Hello" }],
        },
      };

      const remote: PromptSource = {
        type: "conversation-flow",
        flowId: "flow_456",
        agentName: "Flow Agent",
        prompts: {
          conversation_flow_id: "flow_456",
          version: 1,
          global_prompt: "Follow the conversation flow.",
          nodes: [{ id: "node1", type: "message", content: "Hello" }],
        },
      };

      const result = generateDiff("flow_456", local, remote);

      expect(result.agent_id).toBe("flow_456");
      expect(result.agent_type).toBe("conversation-flow");
      expect(result.has_changes).toBe(false);
      expect(Object.keys(result.changes)).toHaveLength(0);
    });

    it("should detect modified global_prompt", () => {
      const local: LocalPrompts = {
        type: "conversation-flow",
        metadata: {
          type: "conversation-flow",
          agent_name: "Flow Agent",
          conversation_flow_id: "flow_456",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          global_prompt: "Follow the conversation flow carefully.",
          nodes: [],
        },
      };

      const remote: PromptSource = {
        type: "conversation-flow",
        flowId: "flow_456",
        agentName: "Flow Agent",
        prompts: {
          conversation_flow_id: "flow_456",
          version: 1,
          global_prompt: "Follow the conversation flow.",
          nodes: [],
        },
      };

      const result = generateDiff("flow_456", local, remote);

      expect(result.has_changes).toBe(true);
      expect(result.changes["global_prompt"]).toBeDefined();
      expect(result.changes["global_prompt"].change_type).toBe("modified");
      expect(result.changes["global_prompt"].old).toBe(
        "Follow the conversation flow.",
      );
      expect(result.changes["global_prompt"].new).toBe(
        "Follow the conversation flow carefully.",
      );
    });

    it.skip("should detect changes in nodes array", () => {
      const local: LocalPrompts = {
        type: "conversation-flow",
        metadata: {
          type: "conversation-flow",
          agent_name: "Flow Agent",
          conversation_flow_id: "flow_456",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          global_prompt: "Follow the flow.",
          nodes: [{ id: "node1", type: "message", content: "Hello there!" }],
        },
      };

      const remote: PromptSource = {
        type: "conversation-flow",
        flowId: "flow_456",
        agentName: "Flow Agent",
        prompts: {
          conversation_flow_id: "flow_456",
          version: 1,
          global_prompt: "Follow the flow.",
          nodes: [{ id: "node1", type: "message", content: "Hello!" }],
        },
      };

      const result = generateDiff("flow_456", local, remote);

      expect(result.has_changes).toBe(true);
      // Deep array comparison - changes detected at array level
      expect(result.changes["nodes"]).toBeDefined();
      expect(result.changes["nodes"].change_type).toBe("modified");
    });
  });

  describe("error handling", () => {
    it("should throw error when comparing different agent types", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "LLM Agent",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "Test",
        },
      };

      const remote: PromptSource = {
        type: "conversation-flow",
        flowId: "flow_456",
        agentName: "Flow Agent",
        prompts: {
          conversation_flow_id: "flow_456",
          version: 1,
          global_prompt: "Test",
          nodes: [],
        },
      };

      expect(() => generateDiff("llm_123", local, remote)).toThrow(
        "Type mismatch: local files are retell-llm, but agent uses conversation-flow",
      );
    });

    it("should throw error for custom-llm type", () => {
      const local: LocalPrompts = {
        type: "retell-llm",
        metadata: {
          type: "retell-llm",
          agent_name: "Test",
          llm_id: "llm_123",
          version: 1,
          pulled_at: "2024-01-01T00:00:00Z",
        },
        prompts: {
          general_prompt: "Test",
        },
      };

      const remote: PromptSource = {
        type: "custom-llm",
        error: "Not supported",
      };

      expect(() => generateDiff("llm_123", local, remote)).toThrow(
        "Cannot diff custom LLM agents",
      );
    });
  });
});
