import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBatchTest,
  createTestCaseDefinition,
  deleteTestCaseDefinition,
  getBatchTest,
  getTestCaseDefinition,
  getTestRun,
  listBatchTests,
  listTestCaseDefinitions,
  listTestRuns,
  updateTestCaseDefinition,
} from "./test-api";
import * as retellClient from "./retell-client";

vi.mock("./retell-client");

describe("test-api service", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      tests: {
        listTestCaseDefinitions: vi.fn().mockResolvedValue({
          items: [{ test_case_definition_id: "tcd_1" }],
          has_more: true,
          pagination_key: "case_next",
        }),
        getTestCaseDefinition: vi.fn().mockResolvedValue({}),
        createTestCaseDefinition: vi.fn().mockResolvedValue({}),
        updateTestCaseDefinition: vi.fn().mockResolvedValue({}),
        deleteTestCaseDefinition: vi.fn().mockResolvedValue(undefined),
        listBatchTests: vi.fn().mockResolvedValue({
          items: [{ test_case_batch_job_id: "bt_1" }],
          has_more: true,
          pagination_key: "batch_next",
        }),
        getBatchTest: vi.fn().mockResolvedValue({}),
        createBatchTest: vi.fn().mockResolvedValue({}),
        listTestRuns: vi.fn().mockResolvedValue({
          items: [{ test_run_id: "run_1" }],
          has_more: true,
          pagination_key: "run_next",
        }),
        getTestRun: vi.fn().mockResolvedValue({}),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("lists test case definitions through the SDK", async () => {
    const result = await listTestCaseDefinitions({
      type: "retell-llm",
      llm_id: "llm_1",
    });

    expect(mockClient.tests.listTestCaseDefinitions).toHaveBeenCalledWith({
      type: "retell-llm",
      llm_id: "llm_1",
    });
    expect(result).toEqual({
      items: [{ test_case_definition_id: "tcd_1" }],
      has_more: true,
      pagination_key: "case_next",
    });
  });

  it("routes all test helpers through client.tests", async () => {
    await getTestCaseDefinition("tcd_1");
    await createTestCaseDefinition({
      name: "Case",
      response_engine: { type: "retell-llm", llm_id: "llm_1" },
    });
    await updateTestCaseDefinition("tcd_1", { name: "Renamed" });
    await deleteTestCaseDefinition("tcd_1");
    const batchTests = await listBatchTests({
      type: "conversation-flow",
      conversation_flow_id: "flow_1",
    });
    await getBatchTest("bt_1");
    await createBatchTest({
      response_engine: { type: "retell-llm", llm_id: "llm_1" },
      test_case_definition_ids: ["tcd_1"],
    });
    const testRuns = await listTestRuns("bt_1", {
      limit: 25,
      pagination_key: "cursor",
    });
    await getTestRun("run_1");

    expect(mockClient.tests.getTestCaseDefinition).toHaveBeenCalledWith(
      "tcd_1",
    );
    expect(mockClient.tests.createTestCaseDefinition).toHaveBeenCalled();
    expect(mockClient.tests.updateTestCaseDefinition).toHaveBeenCalledWith(
      "tcd_1",
      { name: "Renamed" },
    );
    expect(mockClient.tests.deleteTestCaseDefinition).toHaveBeenCalledWith(
      "tcd_1",
    );
    expect(mockClient.tests.listBatchTests).toHaveBeenCalledWith({
      type: "conversation-flow",
      conversation_flow_id: "flow_1",
    });
    expect(batchTests).toEqual({
      items: [{ test_case_batch_job_id: "bt_1" }],
      has_more: true,
      pagination_key: "batch_next",
    });
    expect(mockClient.tests.getBatchTest).toHaveBeenCalledWith("bt_1");
    expect(mockClient.tests.createBatchTest).toHaveBeenCalled();
    expect(mockClient.tests.listTestRuns).toHaveBeenCalledWith("bt_1", {
      limit: 25,
      pagination_key: "cursor",
    });
    expect(testRuns).toEqual({
      items: [{ test_run_id: "run_1" }],
      has_more: true,
      pagination_key: "run_next",
    });
    expect(mockClient.tests.getTestRun).toHaveBeenCalledWith("run_1");
  });
});
