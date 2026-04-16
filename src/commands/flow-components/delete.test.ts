import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteFlowComponentCommand } from "./delete";
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

describe("deleteFlowComponentCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      conversationFlowComponent: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the component", async () => {
    await deleteFlowComponentCommand("c_1");
    expect(mockClient.conversationFlowComponent.delete).toHaveBeenCalledWith(
      "c_1",
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_flow_component_id: "c_1",
        operation: "delete",
      }),
    );
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.conversationFlowComponent.delete.mockRejectedValue(
      new Error("api"),
    );
    await deleteFlowComponentCommand("c_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });
});
