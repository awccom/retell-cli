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
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([
      { conversation_flow_id: "flow_1" },
    ]);
  });

  it("applies field filtering to flow items", async () => {
    await listFlowsCommand({ fields: "conversation_flow_id" });

    expect(outputFormatter.filterFields).toHaveBeenCalledWith(
      [{ conversation_flow_id: "flow_1" }],
      ["conversation_flow_id"],
    );
  });
});
