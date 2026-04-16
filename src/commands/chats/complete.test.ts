import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatCompleteCommand } from "./complete";
import * as retellClient from "../../services/retell-client";

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
});
