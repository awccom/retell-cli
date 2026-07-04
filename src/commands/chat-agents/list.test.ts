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

  it("calls chatAgent.list with the current docs channel filter by default", async () => {
    await listChatAgentsCommand();
    expect(mockClient.chatAgent.list).toHaveBeenCalledWith({
      filter_criteria: {
        channel: {
          op: "eq",
          type: "string",
          value: "chat",
        },
      },
    });
  });

  it("passes --limit", async () => {
    await listChatAgentsCommand({ limit: "25" });
    expect(mockClient.chatAgent.list).toHaveBeenCalledWith({
      limit: 25,
      filter_criteria: {
        channel: {
          op: "eq",
          type: "string",
          value: "chat",
        },
      },
    });
  });

  it("applies field filtering to paginated chat-agent items", async () => {
    const chatAgents = [{ agent_id: "agent_chat", agent_name: "Chat Agent" }];
    mockClient.chatAgent.list.mockResolvedValue({
      items: chatAgents,
      has_more: false,
      pagination_key: null,
    });

    await listChatAgentsCommand({ fields: "agent_id,agent_name" });

    expect(outputFormatter.filterFields).toHaveBeenCalledWith(chatAgents, [
      "agent_id",
      "agent_name",
    ]);
  });

  it("rejects non-numeric --limit", async () => {
    await listChatAgentsCommand({ limit: "x" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
