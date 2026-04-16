import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFlowComponentCommand } from "./get";
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

describe("getFlowComponentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      conversationFlowComponent: {
        retrieve: vi
          .fn()
          .mockResolvedValue({ conversation_flow_component_id: "c_1" }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves a flow component by id", async () => {
    await getFlowComponentCommand("c_1");
    expect(mockClient.conversationFlowComponent.retrieve).toHaveBeenCalledWith(
      "c_1",
    );
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.conversationFlowComponent.retrieve.mockRejectedValue(
      new Error("api"),
    );
    await getFlowComponentCommand("c_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });
});
