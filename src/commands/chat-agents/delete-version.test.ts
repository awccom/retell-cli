import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteChatAgentVersionCommand } from "./delete-version";
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

describe("deleteChatAgentVersionCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: { deleteVersion: vi.fn().mockResolvedValue(undefined) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the specified version", async () => {
    await deleteChatAgentVersionCommand("ca_1", { version: "2" });

    expect(mockClient.chatAgent.deleteVersion).toHaveBeenCalledWith("ca_1", {
      version: 2,
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      message: "Chat agent version deleted successfully",
      agent_id: "ca_1",
      version: 2,
      operation: "delete-version",
    });
  });
});
