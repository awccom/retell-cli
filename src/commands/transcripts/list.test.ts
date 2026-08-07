import { describe, it, expect, vi, beforeEach } from "vitest";
import { listTranscriptsCommand } from "./list";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data) => data),
  };
});

describe("listTranscriptsCommand", () => {
  let mockClient: any;
  const mockCalls = [
    { call_id: "call_1", call_status: "ended" },
    { call_id: "call_2", call_status: "error" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      call: {
        list: vi.fn().mockResolvedValue({
          items: mockCalls,
          has_more: true,
          pagination_key: "next_page",
          total: 20,
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("outputs calls with pagination metadata", async () => {
    await listTranscriptsCommand({ limit: "25" });
    expect(mockClient.call.list).toHaveBeenCalledWith({ limit: 25 });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: mockCalls,
      has_more: true,
      pagination_key: "next_page",
      total: 20,
    });
  });

  it("passes advanced list options and filters", async () => {
    await listTranscriptsCommand({
      limit: "25",
      paginationKey: "cursor",
      sortOrder: "descending",
      includeTotal: true,
      filter: '{"agent_tag":{"type":"enum","op":"in","value":["prod"]}}',
    });
    expect(mockClient.call.list).toHaveBeenCalledWith({
      limit: 25,
      pagination_key: "cursor",
      sort_order: "descending",
      include_total: true,
      filter_criteria: {
        agent_tag: { type: "enum", op: "in", value: ["prod"] },
      },
    });
  });

  it("applies field filtering to call items", async () => {
    await listTranscriptsCommand({
      limit: "25",
      fields: "call_id,call_status",
    });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockCalls, [
      "call_id",
      "call_status",
    ]);
  });

  it("rejects mutually exclusive pagination modes", async () => {
    await listTranscriptsCommand({ skip: "1", paginationKey: "next" });
    expect(mockClient.call.list).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("handles API errors via handleSdkError", async () => {
    const apiError = new Error("API Error");
    mockClient.call.list.mockRejectedValue(apiError);
    await listTranscriptsCommand({ limit: "25" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
  });
});
