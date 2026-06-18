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
    filterFields: vi.fn((data, _fields) => data),
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
    });
  });

  it("passes --limit and --sort-order", async () => {
    await listChatsCommand({ limit: "10", sortOrder: "ascending" });
    expect(mockClient.chat.list).toHaveBeenCalledWith({
      limit: 10,
      sort_order: "ascending",
    });
  });

  it("rejects invalid --sort-order", async () => {
    await listChatsCommand({ sortOrder: "sideways" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
