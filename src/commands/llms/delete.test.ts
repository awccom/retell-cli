import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteLlmCommand } from "./delete";
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

describe("deleteLlmCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { llm: { delete: vi.fn().mockResolvedValue(undefined) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the specified llm id", async () => {
    await deleteLlmCommand("llm_1");
    expect(mockClient.llm.delete).toHaveBeenCalledWith("llm_1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({ llm_id: "llm_1", operation: "delete" }),
    );
  });

  it("surfaces SDK errors", async () => {
    const err = new Error("nope");
    mockClient.llm.delete.mockRejectedValue(err);
    await deleteLlmCommand("llm_1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
