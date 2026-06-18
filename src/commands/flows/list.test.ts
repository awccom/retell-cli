import { describe, expect, it, vi, beforeEach } from "vitest";
import { listFlowsCommand } from "./list";
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

describe("listFlowsCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      conversationFlow: {
        list: vi.fn().mockResolvedValue({
          items: [{ conversation_flow_id: "flow_1" }],
          has_more: false,
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("outputs flow items from the unified paginated list response", async () => {
    await listFlowsCommand({ limit: 25 });

    expect(mockClient.conversationFlow.list).toHaveBeenCalledWith({
      limit: 25,
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: [{ conversation_flow_id: "flow_1" }],
      has_more: false,
    });
  });

  it("preserves pagination metadata and passes cursor options", async () => {
    mockClient.conversationFlow.list.mockResolvedValueOnce({
      items: [{ conversation_flow_id: "flow_2" }],
      has_more: true,
      pagination_key: "flow_next",
    });

    await listFlowsCommand({
      limit: 25,
      paginationKey: "cursor",
      sortOrder: "ascending",
    });

    expect(mockClient.conversationFlow.list).toHaveBeenCalledWith({
      limit: 25,
      pagination_key: "cursor",
      sort_order: "ascending",
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: [{ conversation_flow_id: "flow_2" }],
      has_more: true,
      pagination_key: "flow_next",
    });
  });

  it("applies field filtering to flow items", async () => {
    vi.mocked(outputFormatter.filterFields).mockReturnValueOnce([
      { conversation_flow_id: "filtered_flow" },
    ] as any);

    await listFlowsCommand({ fields: "conversation_flow_id" });

    expect(outputFormatter.filterFields).toHaveBeenCalledWith(
      [{ conversation_flow_id: "flow_1" }],
      ["conversation_flow_id"],
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      items: [{ conversation_flow_id: "filtered_flow" }],
      has_more: false,
    });
  });
});
