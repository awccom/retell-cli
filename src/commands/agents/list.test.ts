import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAgentsCommand, normalizeAgentsResponse } from "./list";
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

describe("normalizeAgentsResponse", () => {
  const agents = [{ agent_id: "agent_1" }];

  it("accepts a raw array response", () => {
    expect(normalizeAgentsResponse(agents)).toBe(agents);
  });

  it("accepts an { agents: [...] } response", () => {
    expect(normalizeAgentsResponse({ agents })).toBe(agents);
  });

  it("accepts a { data: [...] } response", () => {
    expect(normalizeAgentsResponse({ data: agents })).toBe(agents);
  });

  it("accepts a paginated { items: [...] } response", () => {
    expect(
      normalizeAgentsResponse({
        items: agents,
        has_more: false,
        pagination_key: null,
      }),
    ).toBe(agents);
  });

  it("accepts one-level nested list wrappers", () => {
    expect(normalizeAgentsResponse({ data: { items: agents } })).toBe(agents);
  });

  it("throws on unknown response shapes", () => {
    expect(() => normalizeAgentsResponse({ object: true })).toThrow(
      "Unexpected agents list response shape",
    );
  });
});

describe("listAgentsCommand", () => {
  let mockClient: any;

  const mockAgents = [
    {
      agent_id: "agent_1",
      agent_name: "Support Agent",
      version: 2,
      is_published: true,
      response_engine: {
        type: "retell-llm",
        llm_id: "llm_1",
      },
    },
    {
      agent_id: "agent_2",
      agent_name: "Flow Agent",
      version: 1,
      is_published: false,
      response_engine: {
        type: "conversation-flow",
        conversation_flow_id: "cf_1",
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      agent: {
        list: vi.fn().mockResolvedValue({ items: mockAgents }),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("outputs formatted agents from a paginated SDK response", async () => {
    await listAgentsCommand({ limit: 25 });

    expect(mockClient.agent.list).toHaveBeenCalledWith({
      limit: 25,
      filter_criteria: {
        channel: {
          op: "eq",
          type: "string",
          value: "voice",
        },
      },
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith([
      {
        agent_id: "agent_1",
        agent_name: "Support Agent",
        version: 2,
        is_published: true,
        response_engine_type: "retell-llm",
        response_engine_id: "llm_1",
      },
      {
        agent_id: "agent_2",
        agent_name: "Flow Agent",
        version: 1,
        is_published: false,
        response_engine_type: "conversation-flow",
        response_engine_id: "cf_1",
      },
    ]);
  });

  it("applies field filtering to normalized formatted agents", async () => {
    await listAgentsCommand({
      limit: 25,
      fields: "agent_id,agent_name",
    });

    expect(outputFormatter.filterFields).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          agent_id: "agent_1",
          agent_name: "Support Agent",
        }),
      ]),
      ["agent_id", "agent_name"],
    );
  });

  it("handles missing response_engine defensively", async () => {
    mockClient.agent.list.mockResolvedValue({
      agents: [{ agent_id: "agent_3" }],
    });

    await listAgentsCommand();

    expect(outputFormatter.outputJson).toHaveBeenCalledWith([
      {
        agent_id: "agent_3",
        response_engine_type: "unknown",
        response_engine_id: "unknown",
      },
    ]);
  });

  it("handles API errors via handleSdkError", async () => {
    const apiError = new Error("API Error");
    mockClient.agent.list.mockRejectedValue(apiError);

    await listAgentsCommand({ limit: 25 });

    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
  });
});
