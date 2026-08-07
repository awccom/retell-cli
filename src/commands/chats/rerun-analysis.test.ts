import { beforeEach, describe, expect, it, vi } from "vitest";
import { rerunChatAnalysisCommand } from "./rerun-analysis";
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

describe("rerunChatAnalysisCommand", () => {
  const response = { chat_id: "chat_1", chat_status: "ended" };
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chat: { rerunAnalysis: vi.fn().mockResolvedValue(response) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("reruns post-chat analysis", async () => {
    await rerunChatAnalysisCommand("chat_1");
    expect(mockClient.chat.rerunAnalysis).toHaveBeenCalledWith("chat_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(response);
  });

  it("applies field filtering", async () => {
    await rerunChatAnalysisCommand("chat_1", {
      fields: "chat_id,chat_analysis",
    });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(response, [
      "chat_id",
      "chat_analysis",
    ]);
  });

  it("routes SDK errors through handleSdkError", async () => {
    const error = new Error("api");
    mockClient.chat.rerunAnalysis.mockRejectedValue(error);
    await rerunChatAnalysisCommand("chat_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(error);
  });
});
