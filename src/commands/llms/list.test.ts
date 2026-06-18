import { describe, it, expect, vi, beforeEach } from "vitest";
import { listLlmsCommand } from "./list";
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

describe("listLlmsCommand", () => {
  let mockClient: any;
  const mockResponse = {
    items: [{ llm_id: "llm_1" }],
    has_more: true,
    pagination_key: "llm_next",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { llm: { list: vi.fn().mockResolvedValue(mockResponse) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls llm.list() with empty query by default", async () => {
    await listLlmsCommand();
    expect(mockClient.llm.list).toHaveBeenCalledWith({});
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: [{ llm_id: "llm_1" }],
      has_more: true,
      pagination_key: "llm_next",
    });
  });

  it("passes --limit as number", async () => {
    await listLlmsCommand({ limit: "50" });
    expect(mockClient.llm.list).toHaveBeenCalledWith({ limit: 50 });
  });

  it("passes pagination key without pagination key version", async () => {
    await listLlmsCommand({ paginationKey: "next" });
    expect(mockClient.llm.list).toHaveBeenCalledWith({
      pagination_key: "next",
    });
  });

  it("rejects non-numeric --limit", async () => {
    await listLlmsCommand({ limit: "abc" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
