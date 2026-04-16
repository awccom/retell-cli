import { describe, it, expect, vi, beforeEach } from "vitest";
import { listChatAgentsCommand } from "./list";
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

describe("listChatAgentsCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { chatAgent: { list: vi.fn().mockResolvedValue([]) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls chatAgent.list with empty query by default", async () => {
    await listChatAgentsCommand();
    expect(mockClient.chatAgent.list).toHaveBeenCalledWith({});
  });

  it("passes --limit", async () => {
    await listChatAgentsCommand({ limit: "25" });
    expect(mockClient.chatAgent.list).toHaveBeenCalledWith({ limit: 25 });
  });

  it("rejects non-numeric --limit", async () => {
    await listChatAgentsCommand({ limit: "x" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
