import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChatAgentVersionCommand } from "./create-version";
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

describe("createChatAgentVersionCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: {
        createVersion: vi
          .fn()
          .mockResolvedValue({ agent_id: "ca_1", version: 2 }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates a draft version from the base version", async () => {
    await createChatAgentVersionCommand("ca_1", { baseVersion: "1" });

    expect(mockClient.chatAgent.createVersion).toHaveBeenCalledWith("ca_1", {
      base_version: 1,
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      agent_id: "ca_1",
      version: 2,
    });
  });
});
