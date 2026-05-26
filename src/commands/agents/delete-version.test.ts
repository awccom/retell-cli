import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAgentVersionCommand } from "./delete-version";
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

describe("deleteAgentVersionCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      agent: { deleteVersion: vi.fn().mockResolvedValue(undefined) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the specified version", async () => {
    await deleteAgentVersionCommand("agent_1", { version: "5" });

    expect(mockClient.agent.deleteVersion).toHaveBeenCalledWith("agent_1", {
      version: 5,
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      message: "Agent version deleted successfully",
      agent_id: "agent_1",
      version: 5,
      operation: "delete-version",
    });
  });
});
