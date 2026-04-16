import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteCallCommand } from "./delete";
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

describe("deleteCallCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { call: { delete: vi.fn().mockResolvedValue(undefined) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the specified call id", async () => {
    await deleteCallCommand("call_1");
    expect(mockClient.call.delete).toHaveBeenCalledWith("call_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      message: "Call deleted successfully",
      call_id: "call_1",
      operation: "delete",
    });
  });

  it("surfaces SDK errors", async () => {
    const err = new Error("not found");
    mockClient.call.delete.mockRejectedValue(err);
    await deleteCallCommand("call_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
