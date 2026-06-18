import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFlowComponentsCommand } from "./list";
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

describe("listFlowComponentsCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      conversationFlowComponent: {
        list: vi.fn().mockResolvedValue({
          items: [{ component_id: "comp_1" }],
          has_more: true,
          pagination_key: "component_next",
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls list and outputs results", async () => {
    await listFlowComponentsCommand();
    expect(mockClient.conversationFlowComponent.list).toHaveBeenCalledWith({});
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: [{ component_id: "comp_1" }],
      has_more: true,
      pagination_key: "component_next",
    });
  });

  it("passes pagination options to the SDK", async () => {
    await listFlowComponentsCommand({
      limit: "10",
      paginationKey: "cursor",
      sortOrder: "ascending",
    });

    expect(mockClient.conversationFlowComponent.list).toHaveBeenCalledWith({
      limit: 10,
      pagination_key: "cursor",
      sort_order: "ascending",
    });
  });

  it("routes SDK errors through handleSdkError", async () => {
    mockClient.conversationFlowComponent.list.mockRejectedValue(
      new Error("api"),
    );
    await listFlowComponentsCommand();
    expect(outputFormatter.handleSdkError).toHaveBeenCalled();
  });

  it("rejects invalid sort order before calling the SDK", async () => {
    await listFlowComponentsCommand({ sortOrder: "newest" });

    expect(mockClient.conversationFlowComponent.list).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects non-positive or fractional limits before calling the SDK", async () => {
    await listFlowComponentsCommand({ limit: "0" });
    await listFlowComponentsCommand({ limit: "1.5" });

    expect(mockClient.conversationFlowComponent.list).not.toHaveBeenCalled();
    expect(outputFormatter.handleSdkError).toHaveBeenCalledTimes(2);
  });
});
