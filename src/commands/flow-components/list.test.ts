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
      conversationFlowComponent: { list: vi.fn().mockResolvedValue([]) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls list and outputs results", async () => {
    await listFlowComponentsCommand();
    expect(mockClient.conversationFlowComponent.list).toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([]);
  });
});
