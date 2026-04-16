import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWebCallCommand } from "./create-web";
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

describe("createWebCallCommand", () => {
  let mockClient: any;
  const mockResponse = { call_id: "call_web_1", access_token: "tok" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      call: { createWebCall: vi.fn().mockResolvedValue(mockResponse) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates a web call with only --agent-id", async () => {
    await createWebCallCommand({ agentId: "agent_1" });
    expect(mockClient.call.createWebCall).toHaveBeenCalledWith({
      agent_id: "agent_1",
    });
  });

  it("parses --agent-version as number and --dynamic-variables JSON", async () => {
    await createWebCallCommand({
      agentId: "agent_1",
      agentVersion: "3",
      dynamicVariables: '{"name":"Jane"}',
    });
    expect(mockClient.call.createWebCall).toHaveBeenCalledWith({
      agent_id: "agent_1",
      agent_version: 3,
      retell_llm_dynamic_variables: { name: "Jane" },
    });
  });

  it("passes --current-node-id through", async () => {
    await createWebCallCommand({
      agentId: "agent_1",
      currentNodeId: "node_5",
    });
    expect(mockClient.call.createWebCall).toHaveBeenCalledWith({
      agent_id: "agent_1",
      current_node_id: "node_5",
    });
  });

  it("rejects empty-string --agent-id", async () => {
    await createWebCallCommand({ agentId: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.createWebCall).not.toHaveBeenCalled();
  });

  it("rejects non-numeric --agent-version", async () => {
    await createWebCallCommand({
      agentId: "agent_1",
      agentVersion: "not-a-number",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("surfaces SDK errors", async () => {
    const err = new Error("nope");
    mockClient.call.createWebCall.mockRejectedValue(err);
    await createWebCallCommand({ agentId: "agent_1" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
