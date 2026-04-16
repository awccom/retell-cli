import { describe, it, expect, vi, beforeEach } from "vitest";
import { getChatAgentCommand } from "./get";
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

describe("getChatAgentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: {
        retrieve: vi.fn().mockResolvedValue({ agent_id: "ca_1" }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves with no version", async () => {
    await getChatAgentCommand("ca_1");
    expect(mockClient.chatAgent.retrieve).toHaveBeenCalledWith("ca_1", {});
  });

  it("passes --version as number", async () => {
    await getChatAgentCommand("ca_1", { version: "5" });
    expect(mockClient.chatAgent.retrieve).toHaveBeenCalledWith("ca_1", {
      version: 5,
    });
  });

  it("rejects non-numeric --version", async () => {
    await getChatAgentCommand("ca_1", { version: "latest" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
