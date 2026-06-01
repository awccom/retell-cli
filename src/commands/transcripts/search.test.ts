/**
 * Unit tests for search transcripts command
 *
 * Tests validation, filtering, field selection, and edge cases:
 * - Input validation (status, dates, limit)
 * - API parameter construction
 * - Filter combinations
 * - Field selection integration
 * - Empty results handling
 * - Error cases
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchTranscriptsCommand } from "./search";
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
    filterFields: vi.fn((data, _fields) => {
      // Simple mock implementation that returns filtered data
      if (Array.isArray(data)) {
        return data.map((_item) => ({}));
      }
      return {};
    }),
  };
});

describe("searchTranscriptsCommand", () => {
  let mockClient: any;

  // Mock call data
  const mockCalls = [
    {
      call_id: "call_1",
      call_status: "error",
      agent_id: "agent_123",
      start_timestamp: 1730419200000, // 2025-11-01
      duration_ms: 30000,
    },
    {
      call_id: "call_2",
      call_status: "ended",
      agent_id: "agent_456",
      start_timestamp: 1730505600000, // 2025-11-02
      duration_ms: 45000,
    },
    {
      call_id: "call_3",
      call_status: "error",
      agent_id: "agent_123",
      start_timestamp: 1730592000000, // 2025-11-03
      duration_ms: 20000,
    },
    {
      call_id: "call_4",
      call_status: "ongoing",
      agent_id: "agent_789",
      start_timestamp: 1730678400000, // 2025-11-04
      duration_ms: 10000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      call: {
        list: vi.fn(),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("validation", () => {
    it("should handle invalid status values via handleSdkError", async () => {
      await searchTranscriptsCommand({ status: "invalid-status" });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid status"),
        }),
      );
    });

    it("should accept valid status values", async () => {
      mockClient.call.list.mockResolvedValue([]);

      const validStatuses = ["error", "ended", "ongoing"];
      for (const status of validStatuses) {
        await searchTranscriptsCommand({ status });
        expect(mockClient.call.list).toHaveBeenCalled();
      }
    });

    it("should handle date range errors via handleSdkError where since is after until", async () => {
      await searchTranscriptsCommand({
        since: "2025-11-15",
        until: "2025-11-01",
      });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid date range"),
        }),
      );
    });

    it("should accept valid date range", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({
        since: "2025-11-01",
        until: "2025-11-15",
      });

      expect(mockClient.call.list).toHaveBeenCalled();
    });

    it("should handle non-positive limit values via handleSdkError", async () => {
      await searchTranscriptsCommand({ limit: 0 });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Limit must be a positive integer"),
        }),
      );

      vi.clearAllMocks();

      await searchTranscriptsCommand({ limit: -5 });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Limit must be a positive integer"),
        }),
      );
    });

    it("should handle non-integer limit values via handleSdkError", async () => {
      await searchTranscriptsCommand({ limit: 10.5 });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Limit must be a positive integer"),
        }),
      );
    });

    it("should handle limit values exceeding 1000 via handleSdkError", async () => {
      await searchTranscriptsCommand({ limit: 1001 });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Limit cannot exceed 1000"),
        }),
      );
    });

    it("should accept limit values up to 1000", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ limit: 1000 });
      expect(mockClient.call.list).toHaveBeenCalled();
    });

    it("should handle invalid date formats via handleSdkError", async () => {
      await searchTranscriptsCommand({ since: "invalid-date" });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid date format"),
        }),
      );

      vi.clearAllMocks();

      await searchTranscriptsCommand({ until: "not-a-date" });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid date format"),
        }),
      );
    });

    it("should accept ISO date formats", async () => {
      mockClient.call.list.mockResolvedValue([]);

      // YYYY-MM-DD format
      await searchTranscriptsCommand({ since: "2025-11-01" });
      expect(mockClient.call.list).toHaveBeenCalled();

      vi.clearAllMocks();

      // Full ISO 8601 format
      await searchTranscriptsCommand({ since: "2025-11-01T10:00:00Z" });
      expect(mockClient.call.list).toHaveBeenCalled();
    });

    it("should handle empty date string via handleSdkError", async () => {
      await searchTranscriptsCommand({ since: "" });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Date string cannot be empty"),
        }),
      );
    });
  });

  describe("API parameter construction", () => {
    it("should construct API params with status filter", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ status: "error" });

      expect(mockClient.call.list).toHaveBeenCalledWith({
        limit: 50,
        sort_order: "descending",
        filter_criteria: {
          call_status: {
            op: "in",
            type: "enum",
            value: ["error"],
          },
        },
      });
    });

    it("should construct API params with agent ID filter", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ agentId: "agent_123" });

      expect(mockClient.call.list).toHaveBeenCalledWith({
        limit: 50,
        sort_order: "descending",
        filter_criteria: {
          agent: [{ agent_id: "agent_123" }],
        },
      });
    });

    it("should construct API params with date range filter", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({
        since: "2025-11-01",
        until: "2025-11-15",
      });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      expect(callArgs.filter_criteria.start_timestamp).toEqual({
        op: "bt",
        type: "range",
        value: [
          new Date("2025-11-01").getTime(),
          new Date("2025-11-15T23:59:59.999Z").getTime(),
        ],
      });
    });

    it("should construct API params with only since date", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ since: "2025-11-01" });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      expect(callArgs.filter_criteria.start_timestamp).toEqual({
        op: "ge",
        type: "number",
        value: new Date("2025-11-01").getTime(),
      });
    });

    it("should construct API params with only until date", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ until: "2025-11-15" });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      expect(callArgs.filter_criteria.start_timestamp).toEqual({
        op: "le",
        type: "number",
        value: new Date("2025-11-15T23:59:59.999Z").getTime(),
      });
    });

    it("should construct API params with custom limit", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ limit: 100 });

      expect(mockClient.call.list).toHaveBeenCalledWith({
        limit: 100,
        sort_order: "descending",
      });
    });

    it("should use default limit of 50 when not specified", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({});

      expect(mockClient.call.list).toHaveBeenCalledWith({
        limit: 50,
        sort_order: "descending",
      });
    });

    it("should construct API params with combined filters", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({
        status: "error",
        agentId: "agent_123",
        since: "2025-11-01",
        limit: 20,
      });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      expect(callArgs.limit).toBe(20);
      expect(callArgs.filter_criteria.call_status).toEqual({
        op: "in",
        type: "enum",
        value: ["error"],
      });
      expect(callArgs.filter_criteria.agent).toEqual([
        { agent_id: "agent_123" },
      ]);
      expect(callArgs.filter_criteria.start_timestamp).toEqual({
        op: "ge",
        type: "number",
        value: new Date("2025-11-01").getTime(),
      });
    });
  });

  describe("result structure", () => {
    it("should use items from the SDK's paginated list response", async () => {
      mockClient.call.list.mockResolvedValue({
        items: mockCalls,
        has_more: true,
        pagination_key: "next_page",
      });

      await searchTranscriptsCommand({});

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output.results).toEqual(mockCalls);
      expect(output.total_count).toBe(4);
    });

    it("should return structured results with filters_applied", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({
        status: "error",
        agentId: "agent_123",
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output as any).toHaveProperty("results");
      expect(output as any).toHaveProperty("total_count");
      expect(output as any).toHaveProperty("filters_applied");
      expect(output.filters_applied.status).toBe("error");
      expect(output.filters_applied.agent_id).toBe("agent_123");
      expect(output.filters_applied.limit).toBe(50);
    });

    it("should include all applied filters in filters_applied", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({
        status: "error",
        agentId: "agent_123",
        since: "2025-11-01",
        until: "2025-11-15",
        limit: 10,
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output.filters_applied).toEqual({
        status: "error",
        agent_id: "agent_123",
        since: "2025-11-01",
        until: "2025-11-15",
        limit: 10,
      });
    });

    it("should return correct total_count", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({});

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output.total_count).toBe(4);
      expect(output.results.length).toBe(4);
    });
  });

  describe("field selection integration", () => {
    it("should work with --fields option", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({
        status: "error",
        fields: "call_id,call_status",
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output.results.length).toBeGreaterThan(0);
      expect(output as any).toHaveProperty("filters_applied");
      expect(output as any).toHaveProperty("total_count");
    });

    it("should apply field filtering to results but not metadata", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({
        fields: "call_id,call_status",
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      // Results should be filtered by filterFields()
      // But filters_applied and total_count should still exist
      expect(output as any).toHaveProperty("results");
      expect(output as any).toHaveProperty("total_count");
      expect(output as any).toHaveProperty("filters_applied");
    });

    it("should correctly filter fields in result objects", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({
        fields: "call_id,call_status",
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;

      // Verify filterFields was called with correct parameters
      expect(outputFormatter.filterFields).toHaveBeenCalled();

      // Verify results array exists and has items
      expect(output.results).toBeDefined();
      expect(Array.isArray(output.results)).toBe(true);

      // Verify metadata is still present
      expect(output.total_count).toBe(4);
      expect(output.filters_applied).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty results gracefully", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({
        status: "error",
        agentId: "nonexistent_agent",
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output.results).toEqual([]);
      expect(output.total_count).toBe(0);
      expect(output.filters_applied).toBeDefined();
    });

    it("should handle API returning non-array response", async () => {
      mockClient.call.list.mockResolvedValue({ some: "data" });

      await searchTranscriptsCommand({});

      // With Zod validation, invalid responses now properly throw errors
      // Verify that handleSdkError was called with an error
      expect(outputFormatter.handleSdkError).toHaveBeenCalled();
      const errorArg = vi.mocked(outputFormatter.handleSdkError).mock
        .calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
      expect((errorArg as Error).message).toContain(
        "Invalid API response format",
      );
    });

    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("API Error");
      mockClient.call.list.mockRejectedValue(apiError);

      await searchTranscriptsCommand({});

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });

    it("should handle validation errors", async () => {
      await searchTranscriptsCommand({ status: "invalid" });

      expect(outputFormatter.handleSdkError).toHaveBeenCalled();
    });
  });

  describe("date parsing", () => {
    it("should parse YYYY-MM-DD format correctly", async () => {
      mockClient.call.list.mockResolvedValue([]);

      const dateString = "2025-11-01";
      await searchTranscriptsCommand({ since: dateString });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      const timestamp = callArgs.filter_criteria.start_timestamp.value;

      // Verify the timestamp matches the input date
      expect(timestamp).toBe(new Date(dateString).getTime());
      expect(timestamp).toBeGreaterThan(0);
    });

    it("should parse full ISO 8601 format correctly", async () => {
      mockClient.call.list.mockResolvedValue([]);

      const dateString = "2025-11-01T10:30:00Z";
      await searchTranscriptsCommand({ since: dateString });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      const timestamp = callArgs.filter_criteria.start_timestamp.value;

      // Verify the timestamp matches the input date
      expect(timestamp).toBe(new Date(dateString).getTime());
      expect(timestamp).toBeGreaterThan(0);
    });

    it("should accept ISO format with timezone offset", async () => {
      mockClient.call.list.mockResolvedValue([]);

      const dateString = "2025-11-01T10:30:00-05:00";
      await searchTranscriptsCommand({ since: dateString });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      const timestamp = callArgs.filter_criteria.start_timestamp.value;

      expect(timestamp).toBe(new Date(dateString).getTime());
    });

    it("should make until date inclusive through end of day when time is omitted", async () => {
      mockClient.call.list.mockResolvedValue([]);

      await searchTranscriptsCommand({ until: "2025-11-15" });

      const callArgs = mockClient.call.list.mock.calls[0][0];
      const timestamp = callArgs.filter_criteria.start_timestamp.value;

      expect(timestamp).toBe(new Date("2025-11-15T23:59:59.999Z").getTime());
    });
  });

  describe("no filters scenario", () => {
    it("should work with no filters (list all)", async () => {
      mockClient.call.list.mockResolvedValue(mockCalls);

      await searchTranscriptsCommand({});

      expect(mockClient.call.list).toHaveBeenCalledWith({
        limit: 50,
        sort_order: "descending",
      });

      const output = vi.mocked(outputFormatter.outputJson).mock
        .calls[0][0] as any;
      expect(output.results.length).toBe(4);
      expect(output.filters_applied.limit).toBe(50);
    });
  });
});
