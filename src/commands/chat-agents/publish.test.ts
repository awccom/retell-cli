import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishChatAgentCommand } from "./publish";
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

describe("publishChatAgentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: { publish: vi.fn().mockResolvedValue(undefined) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("publishes the chat agent", async () => {
    await publishChatAgentCommand("ca_1");
    expect(mockClient.chatAgent.publish).toHaveBeenCalledWith("ca_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: "ca_1", operation: "publish" }),
    );
  });
});
