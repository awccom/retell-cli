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
      chatAgent: {
        getVersions: vi.fn().mockResolvedValue([
          { version: 1, is_published: true },
          { version: 3, is_published: false },
          { version: 2, is_published: false },
        ]),
        publish: vi.fn().mockResolvedValue(undefined),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("publishes the explicit chat agent version", async () => {
    await publishChatAgentCommand("ca_1", {
      version: "4",
      description: "Release copy",
      title: "August production release",
    });
    expect(mockClient.chatAgent.publish).toHaveBeenCalledWith("ca_1", {
      version: 4,
      version_description: "Release copy",
      version_title: "August production release",
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "ca_1",
        operation: "publish",
        version: 4,
      }),
    );
  });

  it("auto-selects the newest unpublished version", async () => {
    await publishChatAgentCommand("ca_1");

    expect(mockClient.chatAgent.getVersions).toHaveBeenCalledWith("ca_1");
    expect(mockClient.chatAgent.publish).toHaveBeenCalledWith("ca_1", {
      version: 3,
    });
  });

  it("rejects publish when no unpublished draft exists", async () => {
    mockClient.chatAgent.getVersions.mockResolvedValue([
      { version: 1, is_published: true },
    ]);

    await publishChatAgentCommand("ca_1");

    expect(mockClient.chatAgent.publish).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.chatAgent.publish.mockRejectedValue(new Error("api"));
    await publishChatAgentCommand("ca_1", { version: "1" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });
});
