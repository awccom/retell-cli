/**
 * Unit tests for agent versions command
 *
 * Tests version listing, formatting, and field filtering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentVersionsCommand } from "./versions";
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
    filterFields: vi.fn((data, _fields) => data),
  };
});

describe("agentVersionsCommand", () => {
  let mockClient: any;

  const mockVersions = [
    {
      version: 1,
      is_published: true,
      agent_name: "Test Agent",
      last_modification_timestamp: 1700000000000,
      extra_field: "ignored",
    },
    {
      version: 2,
      is_published: false,
      agent_name: "Test Agent v2",
      last_modification_timestamp: 1700100000000,
      extra_field: "also ignored",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      agent: {
        getVersions: vi.fn().mockResolvedValue(mockVersions),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("successful version listing", () => {
    it("should list agent versions with formatted output", async () => {
      await agentVersionsCommand("agent_123");

      expect(mockClient.agent.getVersions).toHaveBeenCalledWith("agent_123");
      expect(outputFormatter.outputJson).toHaveBeenCalledWith([
        {
          version: 1,
          is_published: true,
          agent_name: "Test Agent",
          last_modification_timestamp: 1700000000000,
        },
        {
          version: 2,
          is_published: false,
          agent_name: "Test Agent v2",
          last_modification_timestamp: 1700100000000,
        },
      ]);
    });

    it("should handle empty versions list", async () => {
      mockClient.agent.getVersions.mockResolvedValue([]);

      await agentVersionsCommand("agent_123");

      expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
    });
  });

  describe("field filtering", () => {
    it("should apply field filtering when --fields is specified", async () => {
      await agentVersionsCommand("agent_123", {
        fields: "version,is_published",
      });

      expect(outputFormatter.filterFields).toHaveBeenCalledWith(
        expect.any(Array),
        ["version", "is_published"],
      );
    });
  });

  describe("error handling", () => {
    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("Agent not found");
      mockClient.agent.getVersions.mockRejectedValue(apiError);

      await agentVersionsCommand("nonexistent_agent");

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });
});
