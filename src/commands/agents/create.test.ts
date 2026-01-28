/**
 * Unit tests for agent create command
 *
 * Tests validation, response engine selection, file loading, and error cases.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAgentCommand } from "./create";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";
import * as fs from "fs";

// Mock dependencies
vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    outputError: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data, _fields) => data),
  };
});
vi.mock("fs");

describe("createAgentCommand", () => {
  let mockClient: any;

  const mockAgent = {
    agent_id: "agent_123",
    agent_name: "Test Agent",
    version: 1,
    is_published: false,
    voice_id: "11labs-Adrian",
    response_engine: {
      type: "retell-llm",
      llm_id: "llm_xxx",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      agent: {
        create: vi.fn().mockResolvedValue(mockAgent),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe("validation", () => {
    it("should error when no response engine type is specified", async () => {
      await createAgentCommand({ voice: "11labs-Adrian" });

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        "Must specify one of: --llm-id, --flow-id, or --custom-llm",
        "MISSING_RESPONSE_ENGINE",
      );
      expect(mockClient.agent.create).not.toHaveBeenCalled();
    });

    it("should error when multiple response engine types are specified", async () => {
      await createAgentCommand({
        voice: "11labs-Adrian",
        llmId: "llm_xxx",
        flowId: "cf_xxx",
      });

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        "Only one of --llm-id, --flow-id, or --custom-llm can be specified",
        "MULTIPLE_RESPONSE_ENGINES",
      );
      expect(mockClient.agent.create).not.toHaveBeenCalled();
    });

    it("should error when config file not found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await createAgentCommand({
        voice: "11labs-Adrian",
        file: "nonexistent.json",
      });

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        "Config file not found: nonexistent.json",
        "FILE_NOT_FOUND",
      );
      expect(mockClient.agent.create).not.toHaveBeenCalled();
    });

    it("should error when config file has invalid JSON", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("not valid json");

      await createAgentCommand({
        voice: "11labs-Adrian",
        file: "config.json",
      });

      expect(outputFormatter.outputError).toHaveBeenCalledWith(
        expect.stringContaining("Invalid JSON in config file"),
        "INVALID_JSON",
      );
      expect(mockClient.agent.create).not.toHaveBeenCalled();
    });
  });

  describe("retell-llm response engine", () => {
    it("should create agent with retell-llm response engine", async () => {
      await createAgentCommand({
        voice: "11labs-Adrian",
        llmId: "llm_xxx",
      });

      expect(mockClient.agent.create).toHaveBeenCalledWith({
        voice_id: "11labs-Adrian",
        response_engine: {
          type: "retell-llm",
          llm_id: "llm_xxx",
        },
      });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockAgent);
    });

    it("should include agent name when provided", async () => {
      await createAgentCommand({
        voice: "11labs-Adrian",
        llmId: "llm_xxx",
        name: "My Test Agent",
      });

      expect(mockClient.agent.create).toHaveBeenCalledWith({
        voice_id: "11labs-Adrian",
        agent_name: "My Test Agent",
        response_engine: {
          type: "retell-llm",
          llm_id: "llm_xxx",
        },
      });
    });
  });

  describe("conversation-flow response engine", () => {
    it("should create agent with conversation-flow response engine", async () => {
      await createAgentCommand({
        voice: "11labs-Adrian",
        flowId: "cf_xxx",
      });

      expect(mockClient.agent.create).toHaveBeenCalledWith({
        voice_id: "11labs-Adrian",
        response_engine: {
          type: "conversation-flow",
          conversation_flow_id: "cf_xxx",
        },
      });
    });
  });

  describe("custom-llm response engine", () => {
    it("should create agent with custom-llm response engine", async () => {
      await createAgentCommand({
        voice: "11labs-Adrian",
        customLlm: "wss://my-llm.example.com/ws",
      });

      expect(mockClient.agent.create).toHaveBeenCalledWith({
        voice_id: "11labs-Adrian",
        response_engine: {
          type: "custom-llm",
          llm_websocket_url: "wss://my-llm.example.com/ws",
        },
      });
    });
  });

  describe("file-based configuration", () => {
    it("should create agent from config file", async () => {
      const fileConfig = {
        voice_id: "custom-voice",
        agent_name: "File Agent",
        response_engine: {
          type: "retell-llm",
          llm_id: "llm_from_file",
        },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fileConfig));

      await createAgentCommand({
        voice: "11labs-Adrian", // This should be ignored when file is provided
        file: "config.json",
      });

      expect(mockClient.agent.create).toHaveBeenCalledWith(fileConfig);
    });
  });

  describe("field filtering", () => {
    it("should apply field filtering when --fields is specified", async () => {
      await createAgentCommand({
        voice: "11labs-Adrian",
        llmId: "llm_xxx",
        fields: "agent_id,agent_name",
      });

      expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockAgent, [
        "agent_id",
        "agent_name",
      ]);
    });
  });

  describe("error handling", () => {
    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("API Error");
      mockClient.agent.create.mockRejectedValue(apiError);

      await createAgentCommand({
        voice: "11labs-Adrian",
        llmId: "llm_xxx",
      });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });
});
