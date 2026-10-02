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
  const local = { llm_id: "llm_1", version: 3, remote_modified_at: 1000 };
  const remote = {
    resource_id: "llm_1",
    version: 3,
    last_modification_timestamp: 1000,
  };

  it("flags a newer remote modification timestamp even when version is unchanged", () => {
    expect(
      detectRemoteConflict(local, {
        ...remote,
        last_modification_timestamp: 2000,
      }),
    ).toMatchObject({ reason: "remote_modified" });
  });

  it("returns null when timestamp, version, and resource all match", () => {
    expect(detectRemoteConflict(local, remote)).toBeNull();
  });

  it("flags a newer remote version even when timestamps match", () => {
    expect(
      detectRemoteConflict(local, { ...remote, version: 4 }),
    ).toMatchObject({ reason: "remote_version_newer" });
  });

  it("flags a repointed agent (different resource id) even if it looks older", () => {
    expect(
      detectRemoteConflict(local, {
        resource_id: "llm_2",
        version: 1,
        last_modification_timestamp: 500,
      }),
    ).toMatchObject({
      reason: "resource_changed",
      local_resource_id: "llm_1",
      remote_resource_id: "llm_2",
    });
  });

  it("falls back to version comparison for legacy metadata without a timestamp", () => {
    expect(
      detectRemoteConflict(
        { llm_id: "llm_1", version: 3 },
        { ...remote, version: 4, last_modification_timestamp: 2000 },
      ),
    ).toMatchObject({ reason: "remote_version_newer" });
    expect(
      detectRemoteConflict(
        { llm_id: "llm_1", version: 4 },
        { ...remote, version: 4, last_modification_timestamp: 2000 },
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

  function mockRemote(version: number, ts: number, llmId = "llm_1") {
    vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue({
      type: "retell-llm",
      llmId,
      agentName: "Support",
      prompts: {
        llm_id: llmId,
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

  it("refuses when the agent now points at a different LLM", async () => {
    mockRemote(1, 500, "llm_2");
    vi.mocked(outputFormatter.outputError).mockImplementation(() => {
      throw new Error("exit");
    });

    await updatePromptsCommand(agentId, { source: baseDir }).catch(() => {});

    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      expect.stringContaining("llm_2"),
      "REMOTE_CHANGED",
      expect.objectContaining({ reason: "resource_changed" }),
    );
    expect(mockClient.llm.update).not.toHaveBeenCalled();
  });

  it("reports (but does not fail on) a metadata refresh failure and keeps metadata intact", async () => {
    mockRemote(3, 1000);
    const metadataPath = join(agentDir, "metadata.json");
    const before = readFileSync(metadataPath, "utf-8");
    // A directory at the temp path makes the atomic write fail
    mkdirSync(`${metadataPath}.tmp`);

    await updatePromptsCommand(agentId, { source: baseDir });

    expect(outputFormatter.outputError).not.toHaveBeenCalled();
    expect(mockClient.llm.update).toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Prompts updated successfully (draft version)",
        warning: expect.stringContaining("could not be refreshed"),
      }),
    );
    expect(readFileSync(metadataPath, "utf-8")).toBe(before);
  });

  it("tracks the new resource after a forced update to a repointed agent", async () => {
    mockRemote(1, 500, "llm_2");
    mockClient.llm.update.mockResolvedValue({
      version: 1,
      last_modification_timestamp: 600,
    });

    await updatePromptsCommand(agentId, { source: baseDir, force: true });

    expect(mockClient.llm.update).toHaveBeenCalledWith(
      "llm_2",
      expect.anything(),
    );
    const metadata = JSON.parse(
      readFileSync(join(agentDir, "metadata.json"), "utf-8"),
    );
    expect(metadata).toMatchObject({
      llm_id: "llm_2",
      version: 1,
      remote_modified_at: 600,
    });
  });

  it("does not persist a stale baseline when the update response omits version/timestamp", async () => {
    mockRemote(3, 1000);
    mockClient.llm.update.mockResolvedValue({});
    const metadataPath = join(agentDir, "metadata.json");
    const before = readFileSync(metadataPath, "utf-8");

    await updatePromptsCommand(agentId, { source: baseDir });

    expect(mockClient.llm.update).toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        warning: expect.stringContaining("did not include the new version"),
      }),
    );
    expect(readFileSync(metadataPath, "utf-8")).toBe(before);
  });

  it("tracks the new flow after a forced update to a repointed conversation-flow agent", async () => {
    writeFileSync(
      join(agentDir, "metadata.json"),
      JSON.stringify({
        type: "conversation-flow",
        agent_name: "Support",
        conversation_flow_id: "flow_1",
        version: 3,
        remote_modified_at: 1000,
        pulled_at: "2026-01-01T00:00:00.000Z",
      }),
    );
    writeFileSync(join(agentDir, "global_prompt.md"), "local global");
    writeFileSync(join(agentDir, "nodes.json"), JSON.stringify([{ id: "n1" }]));
    vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue({
      type: "conversation-flow",
      flowId: "flow_2",
      agentName: "Support",
      prompts: {
        conversation_flow_id: "flow_2",
        version: 1,
        last_modification_timestamp: 500,
        global_prompt: "remote global",
        nodes: [],
      },
    });
    mockClient.conversationFlow = {
      update: vi
        .fn()
        .mockResolvedValue({ version: 1, last_modification_timestamp: 700 }),
    };

    await updatePromptsCommand(agentId, { source: baseDir, force: true });

    expect(mockClient.conversationFlow.update).toHaveBeenCalledWith(
      "flow_2",
      expect.objectContaining({ global_prompt: "local global" }),
    );
    const metadata = JSON.parse(
      readFileSync(join(agentDir, "metadata.json"), "utf-8"),
    );
    expect(metadata).toMatchObject({
      conversation_flow_id: "flow_2",
      version: 1,
      remote_modified_at: 700,
    });
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
