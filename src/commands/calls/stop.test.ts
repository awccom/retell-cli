import { describe, it, expect, vi, beforeEach } from "vitest";
import { stopCallCommand } from "./stop";
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

describe("stopCallCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { call: { stop: vi.fn().mockResolvedValue(undefined) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("stops the specified call id", async () => {
    await stopCallCommand("call_1");
    expect(mockClient.call.stop).toHaveBeenCalledWith("call_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      message: "Call stopped successfully",
      call_id: "call_1",
      operation: "stop",
    });
  });

  it("surfaces SDK errors", async () => {
    const err = new Error("not found");
    mockClient.call.stop.mockRejectedValue(err);
    await stopCallCommand("call_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
