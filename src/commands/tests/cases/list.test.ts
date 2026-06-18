import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTestCasesCommand } from "./list";
import * as testApi from "../../../services/test-api";
import * as outputFormatter from "../../../services/output-formatter";

vi.mock("../../../services/test-api");
vi.mock("../../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    outputError: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data, _fields) => data),
  };
});

describe("listTestCasesCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(testApi.listTestCaseDefinitions).mockResolvedValue({
      items: [{ test_case_definition_id: "tcd_1" }] as any,
      has_more: true,
      pagination_key: "case_next",
    });
  });

  it("outputs test case definitions with pagination metadata", async () => {
    await listTestCasesCommand({
      type: "retell-llm",
      llmId: "llm_1",
      limit: 25,
      paginationKey: "cursor",
    });

    expect(testApi.listTestCaseDefinitions).toHaveBeenCalledWith(
      { type: "retell-llm", llm_id: "llm_1" },
      { limit: 25, pagination_key: "cursor" },
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      response_engine: { type: "retell-llm", llm_id: "llm_1" },
      test_case_definitions: [{ test_case_definition_id: "tcd_1" }],
      total_count: 1,
      has_more: true,
      pagination_key: "case_next",
    });
  });
});
