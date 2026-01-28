/**
 * Unit tests for agent delete command
 *
 * Tests successful deletion and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAgentCommand } from "./delete";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

// Mock dependencies
vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe("deleteAgentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      agent: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("successful deletion", () => {
    it("should delete agent and output success message", async () => {
      await deleteAgentCommand("agent_123");

      expect(mockClient.agent.delete).toHaveBeenCalledWith("agent_123");
      expect(outputFormatter.outputJson).toHaveBeenCalledWith({
        message: "Agent deleted successfully",
        agent_id: "agent_123",
        operation: "delete",
      });
    });
  });

  describe("error handling", () => {
    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("Agent not found");
      mockClient.agent.delete.mockRejectedValue(apiError);

      await deleteAgentCommand("nonexistent_agent");

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      mockClient.agent.delete.mockRejectedValue(networkError);

      await deleteAgentCommand("agent_123");

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(networkError);
    });
  });
});
