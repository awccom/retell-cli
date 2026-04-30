import { describe, it, expect, vi, beforeEach } from "vitest";
import { playgroundCompleteCommand } from "./complete";
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

describe("playgroundCompleteCommand", () => {
  let mockClient: any;
  const mockResponse = {
    messages: [{ role: "agent", content: "Hello" }],
    current_state: "intro",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      playground: {
        completion: vi.fn().mockResolvedValue(mockResponse),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("completes playground turn with required messages", async () => {
    await playgroundCompleteCommand("agent_1", {
      messages: '[{"role":"user","content":"Hi"}]',
    });

    expect(mockClient.playground.completion).toHaveBeenCalledWith("agent_1", {
      messages: [{ role: "user", content: "Hi" }],
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockResponse);
  });

  it("passes optional state and JSON params", async () => {
    await playgroundCompleteCommand("agent_1", {
      messages: '[{"role":"user","content":"Hi"}]',
      dynamicVariables: '{"name":"Ada"}',
      toolMocks:
        '[{"tool_name":"lookup","input_match_rule":{"type":"any"},"output":"{}"}]',
      currentState: "collect_name",
      currentNodeId: "node_1",
      componentId: "component_1",
      version: "3",
    });

    expect(mockClient.playground.completion).toHaveBeenCalledWith("agent_1", {
      messages: [{ role: "user", content: "Hi" }],
      dynamic_variables: { name: "Ada" },
      tool_mocks: [
        {
          tool_name: "lookup",
          input_match_rule: { type: "any" },
          output: "{}",
        },
      ],
      current_state: "collect_name",
      current_node_id: "node_1",
      component_id: "component_1",
      version: 3,
    });
  });

  it("rejects non-array --messages", async () => {
    await playgroundCompleteCommand("agent_1", {
      messages: '{"role":"user","content":"Hi"}',
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.playground.completion).not.toHaveBeenCalled();
    expect(outputFormatter.outputJson).not.toHaveBeenCalled();
  });

  it("filters fields when requested", async () => {
    await playgroundCompleteCommand("agent_1", {
      messages: '[{"role":"user","content":"Hi"}]',
      fields: "messages.0.content",
    });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockResponse, [
      "messages.0.content",
    ]);
  });

  it("omits empty field tokens", async () => {
    await playgroundCompleteCommand("agent_1", {
      messages: '[{"role":"user","content":"Hi"}]',
      fields: "messages.0.content,,current_state,",
    });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockResponse, [
      "messages.0.content",
      "current_state",
    ]);
  });

  it("returns the full response when fields contains no valid tokens", async () => {
    await playgroundCompleteCommand("agent_1", {
      messages: '[{"role":"user","content":"Hi"}]',
      fields: " , , ",
    });

    expect(outputFormatter.filterFields).not.toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockResponse);
  });
});
