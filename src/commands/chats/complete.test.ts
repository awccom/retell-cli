import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatCompleteCommand } from "./complete";
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

describe("chatCompleteCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: {
        createChatCompletion: vi
          .fn()
          .mockResolvedValue({ chat_id: "chat_1", messages: [] }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("completes a chat with chat-id and content", async () => {
    await chatCompleteCommand({ chatId: "chat_1", content: "Hi" });
    expect(mockClient.chat.createChatCompletion).toHaveBeenCalledWith({
      chat_id: "chat_1",
      content: "Hi",
    });
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.chat.createChatCompletion.mockRejectedValue(new Error("api"));
    await chatCompleteCommand({ chatId: "chat_1", content: "Hi" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });

  it("rejects empty-string --chat-id", async () => {
    await chatCompleteCommand({ chatId: "", content: "Hi" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chat.createChatCompletion).not.toHaveBeenCalled();
  });

  it("rejects empty-string --content", async () => {
    await chatCompleteCommand({ chatId: "chat_1", content: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chat.createChatCompletion).not.toHaveBeenCalled();
  });
});
