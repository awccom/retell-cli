import { describe, it, expect, vi, beforeEach } from "vitest";
import { listChatsCommand } from "./list";
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

describe("listChatsCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: {
        list: vi.fn().mockResolvedValue({
          items: [{ chat_id: "chat_1" }],
          has_more: true,
          pagination_key: "chat_next",
          total: 12,
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls chat.list with empty query by default", async () => {
    await listChatsCommand();
    expect(mockClient.chat.list).toHaveBeenCalledWith({});
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: [{ chat_id: "chat_1" }],
      has_more: true,
      pagination_key: "chat_next",
      total: 12,
    });
  });

  it("passes pagination, total, sort, and inline filters", async () => {
    await listChatsCommand({
      limit: "10",
      sortOrder: "ascending",
      skip: "0",
      includeTotal: true,
      filter: '{"chat_status":{"type":"enum","op":"in","value":["ended"]}}',
    });
    expect(mockClient.chat.list).toHaveBeenCalledWith({
      limit: 10,
      sort_order: "ascending",
      skip: 0,
      include_total: true,
      filter_criteria: {
        chat_status: { type: "enum", op: "in", value: ["ended"] },
      },
    });
  });

  it("rejects invalid --sort-order", async () => {
    await listChatsCommand({ sortOrder: "sideways" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects mutually exclusive pagination modes", async () => {
    await listChatsCommand({ skip: "1", paginationKey: "next" });
    expect(mockClient.chat.list).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects non-object filters", async () => {
    await listChatsCommand({ filter: "[]" });
    expect(mockClient.chat.list).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
