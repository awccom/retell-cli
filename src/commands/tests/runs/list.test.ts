import { describe, it, expect, vi, beforeEach } from "vitest";
import { listTestRunsCommand } from "./list";
import * as testApi from "../../../services/test-api";
import * as outputFormatter from "../../../services/output-formatter";

vi.mock("../../../services/test-api");
vi.mock("../../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data, _fields) => data),
  };
});

describe("listTestRunsCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(testApi.listTestRuns).mockResolvedValue({
      items: [],
    });
  });

  it("passes pagination options to the SDK helper", async () => {
    await listTestRunsCommand("batch_1", {
      limit: 10,
      paginationKey: "cursor",
    });

    expect(testApi.listTestRuns).toHaveBeenCalledWith("batch_1", {
      limit: 10,
      pagination_key: "cursor",
    });
  });

  it("includes pagination metadata in the output", async () => {
    vi.mocked(testApi.listTestRuns).mockResolvedValueOnce({
      items: [{ test_run_id: "run_1" } as any],
      has_more: true,
      pagination_key: "run_next",
    });

    await listTestRunsCommand("batch_1", {});

    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      batch_job_id: "batch_1",
      test_runs: [{ test_run_id: "run_1" }],
      total_count: 1,
      has_more: true,
      pagination_key: "run_next",
    });
  });

  it("rejects non-positive or fractional limits before calling the SDK helper", async () => {
    await listTestRunsCommand("batch_1", { limit: 0 });
    await listTestRunsCommand("batch_1", { limit: 1.5 });

    expect(testApi.listTestRuns).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledTimes(2);
  });
});
