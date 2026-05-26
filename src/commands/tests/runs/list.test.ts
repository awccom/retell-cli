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
    vi.mocked(testApi.listTestRuns).mockResolvedValue([]);
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

  it("rejects non-positive or fractional limits before calling the SDK helper", async () => {
    await listTestRunsCommand("batch_1", { limit: 0 });
    await listTestRunsCommand("batch_1", { limit: 1.5 });

    expect(testApi.listTestRuns).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledTimes(2);
  });
});
