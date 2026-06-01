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
    filterFields: vi.fn((data, _fields) => data),
  };
});

describe("listTranscriptsCommand", () => {
  let mockClient: any;

  const mockCalls = [
    {
      call_id: "call_1",
      call_status: "ended",
    },
    {
      call_id: "call_2",
      call_status: "error",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      call: {
        list: vi.fn().mockResolvedValue({
          items: mockCalls,
          has_more: true,
          pagination_key: "next_page",
        }),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("outputs call items from the SDK's paginated list response", async () => {
    await listTranscriptsCommand({ limit: 25 });

    expect(mockClient.call.list).toHaveBeenCalledWith({ limit: 25 });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockCalls);
  });

  it("applies field filtering to call items", async () => {
    await listTranscriptsCommand({
      limit: 25,
      fields: "call_id,call_status",
    });

    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockCalls, [
      "call_id",
      "call_status",
    ]);
  });

  it("handles API errors via handleSdkError", async () => {
    const apiError = new Error("API Error");
    mockClient.call.list.mockRejectedValue(apiError);

    await listTranscriptsCommand({ limit: 25 });

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
  });
});
