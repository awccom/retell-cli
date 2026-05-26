import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { updateLlmCommand } from "./update";
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

describe("updateLlmCommand", () => {
  let mockClient: any;
  const tmpFile = join(tmpdir(), `retell-cli-llm-update-${process.pid}.json`);

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      llm: { update: vi.fn().mockResolvedValue({ llm_id: "llm_1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("sends body from --file", async () => {
    writeFileSync(tmpFile, JSON.stringify({ general_prompt: "new prompt" }));
    await updateLlmCommand("llm_1", { file: tmpFile });
    expect(mockClient.llm.update).toHaveBeenCalledWith("llm_1", {
      general_prompt: "new prompt",
    });
  });

  it("rejects non-numeric --version", async () => {
    writeFileSync(tmpFile, JSON.stringify({ general_prompt: "p" }));
    await updateLlmCommand("llm_1", { file: tmpFile, version: "latest" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty body file even when --version is provided", async () => {
    writeFileSync(tmpFile, JSON.stringify({}));
    await updateLlmCommand("llm_1", { file: tmpFile, version: "1" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.llm.update).not.toHaveBeenCalled();
  });

  it("passes --version as version in the SDK params object", async () => {
    writeFileSync(tmpFile, JSON.stringify({ general_prompt: "p" }));
    await updateLlmCommand("llm_1", { file: tmpFile, version: "3" });
    expect(mockClient.llm.update).toHaveBeenCalledWith("llm_1", {
      general_prompt: "p",
      version: 3,
    });
  });
});
