import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentMcpToolsCommand } from "./mcp-tools";
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

describe("agentMcpToolsCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      mcpTool: { getMcpTools: vi.fn().mockResolvedValue([]) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("gets mcp tools with --mcp-id", async () => {
    await agentMcpToolsCommand("agent_1", { mcpId: "mcp_1" });
    expect(mockClient.mcpTool.getMcpTools).toHaveBeenCalledWith("agent_1", {
      mcp_id: "mcp_1",
    });
  });

  it("passes --component-id and --version", async () => {
    await agentMcpToolsCommand("agent_1", {
      mcpId: "mcp_1",
      componentId: "comp_1",
      version: "3",
    });
    expect(mockClient.mcpTool.getMcpTools).toHaveBeenCalledWith("agent_1", {
      mcp_id: "mcp_1",
      component_id: "comp_1",
      version: 3,
    });
  });

  it("rejects non-numeric --version", async () => {
    await agentMcpToolsCommand("agent_1", {
      mcpId: "mcp_1",
      version: "latest",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --mcp-id", async () => {
    await agentMcpToolsCommand("agent_1", { mcpId: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.mcpTool.getMcpTools).not.toHaveBeenCalled();
  });
});
