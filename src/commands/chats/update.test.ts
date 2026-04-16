import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateChatCommand } from "./update";
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

describe("updateChatCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: { update: vi.fn().mockResolvedValue({ chat_id: "chat_1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("updates metadata", async () => {
    await updateChatCommand("chat_1", { metadata: '{"k":"v"}' });
    expect(mockClient.chat.update).toHaveBeenCalledWith("chat_1", {
      metadata: { k: "v" },
    });
  });

  it("rejects invalid --data-storage-setting", async () => {
    await updateChatCommand("chat_1", { dataStorageSetting: "nope" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects when no mutation flags provided", async () => {
    await updateChatCommand("chat_1", {});
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });
});
