import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLlmCommand } from "./get";
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

describe("getLlmCommand", () => {
  let mockClient: any;
  const mockResponse = { llm_id: "llm_1", version: 3 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { llm: { retrieve: vi.fn().mockResolvedValue(mockResponse) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves an LLM by id", async () => {
    await getLlmCommand("llm_1");
    expect(mockClient.llm.retrieve).toHaveBeenCalledWith("llm_1", {});
  });

  it("passes --version as number", async () => {
    await getLlmCommand("llm_1", { version: "2" });
    expect(mockClient.llm.retrieve).toHaveBeenCalledWith("llm_1", {
      version: 2,
    });
  });

  it("rejects non-numeric --version", async () => {
    await getLlmCommand("llm_1", { version: "latest" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
