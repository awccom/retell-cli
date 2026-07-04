import { beforeEach, describe, expect, it, vi } from "vitest";
import { listBatchTestsCommand } from "./list";
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

describe("listBatchTestsCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(testApi.listBatchTests).mockResolvedValue({
      items: [{ test_case_batch_job_id: "batch_1" }] as any,
      has_more: true,
      pagination_key: "batch_next",
    });
  });

  it("outputs batch tests with pagination metadata", async () => {
    await listBatchTestsCommand({
      type: "conversation-flow",
      flowId: "flow_1",
      limit: 25,
      paginationKey: "cursor",
    });

    expect(testApi.listBatchTests).toHaveBeenCalledWith(
      { type: "conversation-flow", conversation_flow_id: "flow_1" },
      { limit: 25, pagination_key: "cursor" },
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      response_engine: {
        type: "conversation-flow",
        conversation_flow_id: "flow_1",
      },
      batch_tests: [{ test_case_batch_job_id: "batch_1" }],
      total_count: 1,
      has_more: true,
      pagination_key: "batch_next",
    });
  });
});
