import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createLlmCommand } from "./create";
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

describe("createLlmCommand", () => {
  let mockClient: any;
  const mockResponse = { llm_id: "llm_new" };
  const tmpFile = join(tmpdir(), `retell-cli-llm-create-${process.pid}.json`);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { llm: { create: vi.fn().mockResolvedValue(mockResponse) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("creates from individual flags", async () => {
    await createLlmCommand({
      generalPrompt: "You are a helper.",
      model: "gpt-4.1",
      startSpeaker: "agent",
      beginMessage: "Hi!",
    });
    expect(mockClient.llm.create).toHaveBeenCalledWith({
      general_prompt: "You are a helper.",
      model: "gpt-4.1",
      start_speaker: "agent",
      begin_message: "Hi!",
    });
  });

  it("creates from --file", async () => {
    const body = {
      general_prompt: "From file",
      model: "gpt-4.1",
      states: [],
    };
    writeFileSync(tmpFile, JSON.stringify(body));
    await createLlmCommand({ file: tmpFile });
    expect(mockClient.llm.create).toHaveBeenCalledWith(body);
  });

  it("rejects invalid --start-speaker", async () => {
    await createLlmCommand({ startSpeaker: "robot" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects --file combined with simple flags", async () => {
    writeFileSync(tmpFile, JSON.stringify({ general_prompt: "body" }));
    await createLlmCommand({ file: tmpFile, generalPrompt: "override" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.llm.create).not.toHaveBeenCalled();
  });
});
