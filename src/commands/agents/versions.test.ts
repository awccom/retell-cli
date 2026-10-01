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
      version_title: "Launch",
      last_modification_timestamp: 1700000000000,
      extra_field: "ignored",
    },
    {
      version: 2,
      is_published: false,
      base_version: 1,
      last_modification_timestamp: 1700100000000,
      extra_field: "also ignored",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      agent: {
        listVersions: vi
          .fn()
          .mockResolvedValue({ has_more: false, items: mockVersions }),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("successful version listing", () => {
    it("should list agent versions with formatted output", async () => {
      await agentVersionsCommand("agent_123");

      expect(mockClient.agent.listVersions).toHaveBeenCalledWith("agent_123", {
        limit: 100,
      });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith([
        {
          version: 1,
          is_published: true,
          last_modification_timestamp: 1700000000000,
          base_version: undefined,
          version_title: "Launch",
          version_description: undefined,
        },
        {
          version: 2,
          is_published: false,
          last_modification_timestamp: 1700100000000,
          base_version: 1,
          version_title: undefined,
          version_description: undefined,
        },
      ]);
    });

    it("should handle empty versions list", async () => {
      mockClient.agent.listVersions.mockResolvedValue({
        has_more: false,
        items: [],
      });

      await agentVersionsCommand("agent_123");

      expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
    });
  });

  it("should follow pagination keys until has_more is false", async () => {
    mockClient.agent.listVersions
      .mockResolvedValueOnce({
        has_more: true,
        pagination_key: "next",
        items: [mockVersions[0]],
      })
      .mockResolvedValueOnce({ has_more: false, items: [mockVersions[1]] });

    await agentVersionsCommand("agent_123");

    expect(mockClient.agent.listVersions).toHaveBeenNthCalledWith(
      2,
      "agent_123",
      { limit: 100, pagination_key: "next" },
    );
    const output = vi.mocked(outputFormatter.outputJson).mock.calls[0][0];
    expect(output).toHaveLength(2);
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
      mockClient.agent.listVersions.mockRejectedValue(apiError);

      await agentVersionsCommand("nonexistent_agent");

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });
});
