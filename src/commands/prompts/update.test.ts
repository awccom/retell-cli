import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { updatePromptsCommand, detectRemoteConflict } from "./update";
import * as retellClient from "../../services/retell-client";
import * as promptResolver from "../../services/prompt-resolver";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/prompt-resolver");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    outputError: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe("detectRemoteConflict", () => {
  it("flags a newer remote modification timestamp even when version is unchanged", () => {
    expect(
      detectRemoteConflict(
        { version: 3, remote_modified_at: 1000 },
        { version: 3, last_modification_timestamp: 2000 },
      ),
    ).toMatchObject({ reason: "remote_modified" });
  });

  it("returns null when the timestamp matches", () => {
    expect(
      detectRemoteConflict(
        { version: 3, remote_modified_at: 1000 },
        { version: 3, last_modification_timestamp: 1000 },
      ),
    ).toBeNull();
  });

  it("falls back to version comparison for legacy metadata without a timestamp", () => {
    expect(
      detectRemoteConflict(
        { version: 3 },
        { version: 4, last_modification_timestamp: 2000 },
      ),
    ).toMatchObject({ reason: "remote_version_newer" });
    expect(
      detectRemoteConflict(
        { version: 4 },
        { version: 4, last_modification_timestamp: 2000 },
      ),
    ).toBeNull();
  });
});

describe("updatePromptsCommand", () => {
  let baseDir: string;
  let agentDir: string;
  let mockClient: any;
  const agentId = "agent_1";

  function writeMetadata(extra: Record<string, unknown> = {}) {
    writeFileSync(
      join(agentDir, "metadata.json"),
      JSON.stringify({
        type: "retell-llm",
        agent_name: "Support",
        llm_id: "llm_1",
        version: 3,
        remote_modified_at: 1000,
        pulled_at: "2026-01-01T00:00:00.000Z",
        ...extra,
      }),
    );
  }

  function mockRemote(version: number, ts: number) {
    vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue({
      type: "retell-llm",
      llmId: "llm_1",
      agentName: "Support",
      prompts: {
        llm_id: "llm_1",
        version,
        last_modification_timestamp: ts,
        general_prompt: "remote prompt",
      },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    baseDir = mkdtempSync(join(tmpdir(), "retell-prompts-"));
    agentDir = join(baseDir, agentId);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "general_prompt.md"), "local prompt");
    writeMetadata();
    mockClient = {
      llm: {
        update: vi
          .fn()
          .mockResolvedValue({ version: 3, last_modification_timestamp: 5000 }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it("updates when the remote is unchanged and records the new remote state", async () => {
    mockRemote(3, 1000);

    await updatePromptsCommand(agentId, { source: baseDir });

    expect(outputFormatter.outputError).not.toHaveBeenCalled();
    expect(mockClient.llm.update).toHaveBeenCalledWith(
      "llm_1",
      expect.objectContaining({ general_prompt: "local prompt" }),
    );
    const metadata = JSON.parse(
      readFileSync(join(agentDir, "metadata.json"), "utf-8"),
    );
    expect(metadata.remote_modified_at).toBe(5000);
  });

  it("refuses with REMOTE_CHANGED when the remote was modified after pull", async () => {
    mockRemote(3, 2000);
    // outputError exits the process in real runs; emulate that here
    vi.mocked(outputFormatter.outputError).mockImplementation(() => {
      throw new Error("exit");
    });

    await updatePromptsCommand(agentId, { source: baseDir }).catch(() => {});

    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      expect.stringContaining("changed since they were pulled"),
      "REMOTE_CHANGED",
      expect.objectContaining({ reason: "remote_modified" }),
    );
    expect(mockClient.llm.update).not.toHaveBeenCalled();
  });

  it("overwrites the remote when --force is set", async () => {
    mockRemote(4, 2000);

    await updatePromptsCommand(agentId, { source: baseDir, force: true });

    expect(outputFormatter.outputError).not.toHaveBeenCalled();
    expect(mockClient.llm.update).toHaveBeenCalled();
  });

  it("reports the conflict in dry-run output without updating", async () => {
    mockRemote(3, 2000);

    await updatePromptsCommand(agentId, { source: baseDir, dryRun: true });

    expect(mockClient.llm.update).not.toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Dry run - no changes applied",
        remote_conflict: expect.objectContaining({ reason: "remote_modified" }),
      }),
    );
  });

  it("uses version comparison for metadata from older CLI releases", async () => {
    writeMetadata({ remote_modified_at: undefined });
    mockRemote(4, 2000);
    vi.mocked(outputFormatter.outputError).mockImplementation(() => {
      throw new Error("exit");
    });

    await updatePromptsCommand(agentId, { source: baseDir }).catch(() => {});

    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      expect.any(String),
      "REMOTE_CHANGED",
      expect.objectContaining({ reason: "remote_version_newer" }),
    );
    expect(mockClient.llm.update).not.toHaveBeenCalled();
  });
});
