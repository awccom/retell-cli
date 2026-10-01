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
      agent: {
        listVersions: vi.fn().mockResolvedValue({ has_more: false, items: [] }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves versions for the chat agent", async () => {
    await chatAgentVersionsCommand("ca_1");
    expect(mockClient.agent.listVersions).toHaveBeenCalledWith("ca_1", {
      limit: 100,
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
  });

  it("routes SDK errors through handleSdkError", async () => {
    const err = new Error("api");
    mockClient.agent.listVersions.mockRejectedValue(err);
    await chatAgentVersionsCommand("ca_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
