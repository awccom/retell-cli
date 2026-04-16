import { describe, it, expect, vi, beforeEach } from "vitest";
import { getChatCommand } from "./get";
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

describe("getChatCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: { retrieve: vi.fn().mockResolvedValue({ chat_id: "chat_1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves a chat by id", async () => {
    await getChatCommand("chat_1");
    expect(mockClient.chat.retrieve).toHaveBeenCalledWith("chat_1");
  });

  it("surfaces SDK errors", async () => {
    const err = new Error("nope");
    mockClient.chat.retrieve.mockRejectedValue(err);
    await getChatCommand("chat_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
