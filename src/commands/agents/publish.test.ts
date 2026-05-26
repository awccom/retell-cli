import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishAgentCommand } from "../agent/publish";
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

describe("publishAgentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      agent: {
        getVersions: vi.fn().mockResolvedValue([
          { version: 1, is_published: true },
          { version: 5, is_published: false },
          { version: 3, is_published: false },
        ]),
        publish: vi.fn().mockResolvedValue(undefined),
        retrieve: vi.fn().mockResolvedValue({
          agent_id: "agent_1",
          agent_name: "Support",
          version: 5,
          is_published: true,
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("publishes the explicit agent version", async () => {
    await publishAgentCommand("agent_1", {
      version: "4",
      description: "Release copy",
    });

    expect(mockClient.agent.publish).toHaveBeenCalledWith("agent_1", {
      version: 4,
      version_description: "Release copy",
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent_1",
        version: 5,
        published_version: 4,
      }),
    );
  });

  it("auto-selects the newest unpublished version", async () => {
    await publishAgentCommand("agent_1");

    expect(mockClient.agent.getVersions).toHaveBeenCalledWith("agent_1");
    expect(mockClient.agent.publish).toHaveBeenCalledWith("agent_1", {
      version: 5,
    });
  });

  it("rejects publish when no unpublished draft exists", async () => {
    mockClient.agent.getVersions.mockResolvedValue([
      { version: 1, is_published: true },
    ]);

    await publishAgentCommand("agent_1");

    expect(mockClient.agent.publish).not.toHaveBeenCalled();
    expect(mockClient.agent.retrieve).not.toHaveBeenCalled();
    expect(outputFormatter.outputJson).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
