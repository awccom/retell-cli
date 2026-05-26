import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteChatCommand } from "./delete";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe("deleteChatCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { chat: { delete: vi.fn().mockResolvedValue(undefined) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the chat", async () => {
    await deleteChatCommand("chat_1");

    expect(mockClient.chat.delete).toHaveBeenCalledWith("chat_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      message: "Chat deleted successfully",
      chat_id: "chat_1",
      operation: "delete",
    });
  });

  it("routes SDK errors through handleSdkError", async () => {
    const error = new Error("sdk error");
    mockClient.chat.delete.mockRejectedValue(error);

    await deleteChatCommand("chat_1");

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(error);
    expect(outputFormatter.outputJson).not.toHaveBeenCalled();
  });
});
