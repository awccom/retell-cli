import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createChatAgentCommand } from "./create";
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

describe("createChatAgentCommand", () => {
  let mockClient: any;
  const tmpFile = join(tmpdir(), `retell-cli-ca-${process.pid}.json`);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatAgent: { create: vi.fn().mockResolvedValue({ agent_id: "ca_1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("creates with --llm-id", async () => {
    await createChatAgentCommand({ llmId: "llm_1", name: "Hello" });
    expect(mockClient.chatAgent.create).toHaveBeenCalledWith({
      response_engine: { type: "retell-llm", llm_id: "llm_1" },
      agent_name: "Hello",
    });
  });

  it("creates with --flow-id", async () => {
    await createChatAgentCommand({ flowId: "flow_1" });
    expect(mockClient.chatAgent.create).toHaveBeenCalledWith({
      response_engine: {
        type: "conversation-flow",
        conversation_flow_id: "flow_1",
      },
    });
  });

  it("rejects 0 engines", async () => {
    await createChatAgentCommand({});
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects >1 engines", async () => {
    await createChatAgentCommand({ llmId: "l", flowId: "f" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("creates from --file", async () => {
    const body = {
      response_engine: { type: "retell-llm", llm_id: "llm_file" },
      agent_name: "From file",
    };
    writeFileSync(tmpFile, JSON.stringify(body));
    await createChatAgentCommand({ file: tmpFile });
    expect(mockClient.chatAgent.create).toHaveBeenCalledWith(body);
  });

  it("rejects --file combined with simple flags", async () => {
    const body = {
      response_engine: { type: "retell-llm", llm_id: "llm_file" },
    };
    writeFileSync(tmpFile, JSON.stringify(body));
    await createChatAgentCommand({ file: tmpFile, llmId: "llm_override" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.chatAgent.create).not.toHaveBeenCalled();
  });
});
