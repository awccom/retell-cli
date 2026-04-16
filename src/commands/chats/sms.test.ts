import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSmsChatCommand } from "./sms";
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

describe("createSmsChatCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: { createSMSChat: vi.fn().mockResolvedValue({ chat_id: "chat_1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates an SMS chat with required fields", async () => {
    await createSmsChatCommand({
      fromNumber: "+14157774444",
      toNumber: "+12137774445",
    });
    expect(mockClient.chat.createSMSChat).toHaveBeenCalledWith({
      from_number: "+14157774444",
      to_number: "+12137774445",
    });
  });

  it("rejects non-numeric --override-agent-version", async () => {
    await createSmsChatCommand({
      fromNumber: "+1",
      toNumber: "+2",
      overrideAgentVersion: "latest",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --from-number", async () => {
    await createSmsChatCommand({ fromNumber: "", toNumber: "+2" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chat.createSMSChat).not.toHaveBeenCalled();
  });

  it("rejects empty-string --to-number", async () => {
    await createSmsChatCommand({ fromNumber: "+1", toNumber: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chat.createSMSChat).not.toHaveBeenCalled();
  });
});
