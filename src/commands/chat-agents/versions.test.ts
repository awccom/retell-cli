import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatAgentVersionsCommand } from "./versions";
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

describe("chatAgentVersionsCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: { getVersions: vi.fn().mockResolvedValue([]) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves versions for the chat agent", async () => {
    await chatAgentVersionsCommand("ca_1");
    expect(mockClient.chatAgent.getVersions).toHaveBeenCalledWith("ca_1");
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.chatAgent.getVersions.mockRejectedValue(new Error("api"));
    await chatAgentVersionsCommand("ca_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });
});
