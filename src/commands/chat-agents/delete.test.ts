import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteChatAgentCommand } from "./delete";
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

describe("deleteChatAgentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: { delete: vi.fn().mockResolvedValue(undefined) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the specified chat agent id", async () => {
    await deleteChatAgentCommand("ca_1");
    expect(mockClient.chatAgent.delete).toHaveBeenCalledWith("ca_1");
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.chatAgent.delete.mockRejectedValue(new Error("api"));
    await deleteChatAgentCommand("ca_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });
});
