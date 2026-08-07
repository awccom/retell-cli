import { beforeEach, describe, expect, it, vi } from "vitest";
import { rerunCallAnalysisCommand } from "./rerun-analysis";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data) => data),
  };
});

describe("rerunCallAnalysisCommand", () => {
  const response = { call_id: "call_1", call_status: "ended" };
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      call: { rerunAnalysis: vi.fn().mockResolvedValue(response) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("reruns post-call analysis", async () => {
    await rerunCallAnalysisCommand("call_1");
    expect(mockClient.call.rerunAnalysis).toHaveBeenCalledWith("call_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(response);
  });

  it("applies field filtering", async () => {
    await rerunCallAnalysisCommand("call_1", {
      fields: "call_id,call_analysis",
    });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(response, [
      "call_id",
      "call_analysis",
    ]);
  });

  it("routes SDK errors through handleSdkError", async () => {
    const error = new Error("api");
    mockClient.call.rerunAnalysis.mockRejectedValue(error);
    await rerunCallAnalysisCommand("call_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(error);
  });
});
