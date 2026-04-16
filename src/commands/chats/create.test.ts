import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChatCommand } from "./create";
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

describe("createChatCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: { create: vi.fn().mockResolvedValue({ chat_id: "chat_1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates chat with only --agent-id", async () => {
    await createChatCommand({ agentId: "agent_1" });
    expect(mockClient.chat.create).toHaveBeenCalledWith({
      agent_id: "agent_1",
    });
  });

  it("parses --metadata and --agent-version", async () => {
    await createChatCommand({
      agentId: "agent_1",
      agentVersion: "2",
      metadata: '{"k":"v"}',
    });
    expect(mockClient.chat.create).toHaveBeenCalledWith({
      agent_id: "agent_1",
      agent_version: 2,
      metadata: { k: "v" },
    });
  });

  it("rejects non-numeric --agent-version", async () => {
    await createChatCommand({ agentId: "agent_1", agentVersion: "x" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --agent-id", async () => {
    await createChatCommand({ agentId: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chat.create).not.toHaveBeenCalled();
  });
});
