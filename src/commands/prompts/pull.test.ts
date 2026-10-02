import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { pullPromptsCommand } from "./pull";
import * as promptResolver from "../../services/prompt-resolver";

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

describe("pullPromptsCommand", () => {
  let baseDir: string;
  let agentDir: string;
  const agentId = "agent_1";

  beforeEach(() => {
    vi.clearAllMocks();
    baseDir = mkdtempSync(join(tmpdir(), "retell-pull-"));
    agentDir = join(baseDir, agentId);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it("records the remote modification timestamp and removes stale optional files", async () => {
    // Leftovers from an earlier pull that the remote no longer has
    mkdirSync(join(agentDir, "states"), { recursive: true });
    writeFileSync(join(agentDir, "begin_message.txt"), "old hello");
    writeFileSync(join(agentDir, "states", "removed.md"), "# State: removed");

    vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue({
      type: "retell-llm",
      llmId: "llm_1",
      agentName: "Support",
      prompts: {
        llm_id: "llm_1",
        version: 4,
        last_modification_timestamp: 2000,
        general_prompt: "remote prompt",
        states: [{ name: "kept", state_prompt: "kept prompt" }],
      },
    });

    await pullPromptsCommand(agentId, { output: baseDir });

    const metadata = JSON.parse(
      readFileSync(join(agentDir, "metadata.json"), "utf-8"),
    );
    expect(metadata).toMatchObject({
      llm_id: "llm_1",
      version: 4,
      remote_modified_at: 2000,
    });
    expect(existsSync(join(agentDir, "begin_message.txt"))).toBe(false);
    expect(existsSync(join(agentDir, "states", "removed.md"))).toBe(false);
    expect(readFileSync(join(agentDir, "states", "kept.md"), "utf-8")).toBe(
      "# State: kept\n\nkept prompt",
    );
  });

  it("leaves no sync baseline when a prompt file write fails", async () => {
    mkdirSync(agentDir, { recursive: true });
    const oldMetadata = JSON.stringify({
      llm_id: "llm_1",
      version: 1,
      remote_modified_at: 100,
    });
    writeFileSync(join(agentDir, "metadata.json"), oldMetadata);
    // A directory where general_prompt.md should go makes that write fail
    mkdirSync(join(agentDir, "general_prompt.md"));

    vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue({
      type: "retell-llm",
      llmId: "llm_1",
      agentName: "Support",
      prompts: {
        llm_id: "llm_1",
        version: 4,
        last_modification_timestamp: 2000,
        general_prompt: "remote prompt",
      },
    });

    await pullPromptsCommand(agentId, { output: baseDir });

    // Old baseline removed and no new one written, so update will refuse
    expect(existsSync(join(agentDir, "metadata.json"))).toBe(false);
  });

  it("removes the states directory when the remote has no states", async () => {
    mkdirSync(join(agentDir, "states"), { recursive: true });
    writeFileSync(join(agentDir, "states", "old.md"), "# State: old");

    vi.mocked(promptResolver.resolvePromptSource).mockResolvedValue({
      type: "retell-llm",
      llmId: "llm_1",
      agentName: "Support",
      prompts: {
        llm_id: "llm_1",
        version: 4,
        last_modification_timestamp: 2000,
        general_prompt: "remote prompt",
      },
    });

    await pullPromptsCommand(agentId, { output: baseDir });

    expect(existsSync(join(agentDir, "states"))).toBe(false);
  });
});
