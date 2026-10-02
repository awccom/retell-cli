import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvePromptSource } from "./prompt-resolver";
import * as retellClient from "./retell-client";

vi.mock("./retell-client");

describe("resolvePromptSource", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      agent: { retrieve: vi.fn() },
      llm: {
        retrieve: vi.fn().mockResolvedValue({
          llm_id: "llm_1",
          version: 2,
          last_modification_timestamp: 1000,
          general_prompt: "pinned prompt",
        }),
      },
      conversationFlow: {
        retrieve: vi.fn().mockResolvedValue({
          conversation_flow_id: "flow_1",
          version: 5,
          last_modification_timestamp: 1000,
          global_prompt: "g",
          nodes: [],
        }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("reads the LLM version the agent version is pinned to", async () => {
    mockClient.agent.retrieve.mockResolvedValue({
      agent_name: "Support",
      version: 4,
      is_published: false,
      response_engine: { type: "retell-llm", llm_id: "llm_1", version: 2 },
    });

    const result = await resolvePromptSource("agent_1");

    expect(mockClient.llm.retrieve).toHaveBeenCalledWith("llm_1", {
      version: 2,
    });
    expect(result).toMatchObject({
      type: "retell-llm",
      agent: { version: 4, isPublished: false, engineVersion: 2 },
    });
  });

  it("reads the flow version the agent version is pinned to", async () => {
    mockClient.agent.retrieve.mockResolvedValue({
      agent_name: "Support",
      version: 1,
      is_published: true,
      response_engine: {
        type: "conversation-flow",
        conversation_flow_id: "flow_1",
        version: 5,
      },
    });

    const result = await resolvePromptSource("agent_1");

    expect(mockClient.conversationFlow.retrieve).toHaveBeenCalledWith(
      "flow_1",
      { version: 5 },
    );
    expect(result).toMatchObject({
      type: "conversation-flow",
      agent: { version: 1, isPublished: true, engineVersion: 5 },
    });
  });

  it("falls back to the latest version when the agent has no engine version", async () => {
    mockClient.agent.retrieve.mockResolvedValue({
      agent_name: "Support",
      version: 0,
      is_published: false,
      response_engine: { type: "retell-llm", llm_id: "llm_1" },
    });

    await resolvePromptSource("agent_1");

    expect(mockClient.llm.retrieve).toHaveBeenCalledWith("llm_1", undefined);
  });
});
