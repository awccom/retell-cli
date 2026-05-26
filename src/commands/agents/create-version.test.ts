import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAgentVersionCommand } from "./create-version";
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

describe("createAgentVersionCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      agent: {
        createVersion: vi
          .fn()
          .mockResolvedValue({ agent_id: "agent_1", version: 6 }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates a draft version from the base version", async () => {
    await createAgentVersionCommand("agent_1", { baseVersion: "5" });

    expect(mockClient.agent.createVersion).toHaveBeenCalledWith("agent_1", {
      base_version: 5,
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      agent_id: "agent_1",
      version: 6,
    });
  });

  it("rejects non-numeric --base-version", async () => {
    await createAgentVersionCommand("agent_1", { baseVersion: "latest" });

    expect(mockClient.agent.createVersion).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
