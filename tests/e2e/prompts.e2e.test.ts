/**
 * Live end-to-end test for the prompt workflow (issue #11).
 *
 * Runs the built CLI (dist/index.js) as a subprocess against a real Retell
 * account: pull -> edit -> diff -> update -> publish, plus the REMOTE_CHANGED
 * conflict path and the conversation-flow path.
 *
 * Opt-in only. Skipped unless RETELL_E2E_API_KEY is set:
 *
 *   RETELL_E2E_API_KEY=key_... npm run test:e2e
 *
 * Every resource it touches is created by this file (names start with
 * "retell-cli-e2e-") and deleted in afterAll, even when a step fails.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import Retell from "retell-sdk";

const API_KEY = process.env.RETELL_E2E_API_KEY;
const CLI = resolve(__dirname, "../../dist/index.js");
const RUN_ID = `retell-cli-e2e-${Date.now()}`;

interface CliResult {
  status: number | null;
  json: any;
  stderr: string;
}

/** Run the built CLI with the e2e key and parse its JSON output. */
function cli(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    env: { ...process.env, RETELL_API_KEY: API_KEY },
    encoding: "utf-8",
    timeout: 60_000,
  });
  const text = result.status === 0 ? result.stdout : result.stderr;
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // leave null; assertions below will show stderr
  }
  return { status: result.status, json, stderr: result.stderr };
}

describe.skipIf(!API_KEY)("prompts workflow (live Retell API)", () => {
  let client: Retell;
  let baseDir: string;
  let voiceId: string;
  const created = {
    agents: [] as string[],
    llms: [] as string[],
    flows: [] as string[],
  };

  beforeAll(async () => {
    if (!existsSync(CLI)) {
      throw new Error(`Built CLI not found at ${CLI}. Run 'npm run build'.`);
    }
    client = new Retell({ apiKey: API_KEY! });
    baseDir = mkdtempSync(join(tmpdir(), "retell-cli-e2e-"));

    const voices = await client.voice.list();
    if (!voices.length) throw new Error("Account has no voices available");
    voiceId = voices[0].voice_id;
  }, 60_000);

  afterAll(async () => {
    if (baseDir) rmSync(baseDir, { recursive: true, force: true });
    if (!client) return;
    // Agents first: an LLM/flow can't be deleted while an agent uses it.
    for (const id of created.agents) {
      await client.agent.delete(id).catch((e) => warnCleanup("agent", id, e));
    }
    for (const id of created.llms) {
      await client.llm.delete(id).catch((e) => warnCleanup("llm", id, e));
    }
    for (const id of created.flows) {
      await client.conversationFlow
        .delete(id)
        .catch((e) => warnCleanup("conversation flow", id, e));
    }
  }, 120_000);

  describe("retell-llm agent", () => {
    let agentId: string;
    let llmId: string;
    let agentDir: string;

    beforeAll(async () => {
      const llm = await client.llm.create({
        general_prompt: "You are a test agent. Original prompt.",
        begin_message: "Hello from the e2e test.",
      });
      llmId = llm.llm_id;
      created.llms.push(llmId);

      const agent = await client.agent.create({
        agent_name: `${RUN_ID}-llm`,
        voice_id: voiceId,
        response_engine: { type: "retell-llm", llm_id: llmId },
      });
      agentId = agent.agent_id;
      created.agents.push(agentId);
      agentDir = join(baseDir, agentId);
    }, 60_000);

    it("pulls prompts to local files with a sync baseline", () => {
      const r = cli(["prompts", "pull", agentId, "--output", baseDir]);
      expect(r.status, r.stderr).toBe(0);
      expect(r.json).toMatchObject({ agent_id: agentId, type: "retell-llm" });

      expect(readFileSync(join(agentDir, "general_prompt.md"), "utf-8")).toBe(
        "You are a test agent. Original prompt.",
      );
      expect(readFileSync(join(agentDir, "begin_message.txt"), "utf-8")).toBe(
        "Hello from the e2e test.",
      );
      const metadata = JSON.parse(
        readFileSync(join(agentDir, "metadata.json"), "utf-8"),
      );
      expect(metadata).toMatchObject({ type: "retell-llm", llm_id: llmId });
      expect(typeof metadata.remote_modified_at).toBe("number");
    });

    it("shows the local edit in diff and dry-run without changing the remote", async () => {
      writeFileSync(
        join(agentDir, "general_prompt.md"),
        "You are a test agent. Edited locally.",
      );

      const diff = cli(["prompts", "diff", agentId, "--source", baseDir]);
      expect(diff.status, diff.stderr).toBe(0);
      expect(diff.json.has_changes).toBe(true);
      expect(diff.json.changes.general_prompt).toMatchObject({
        old: "You are a test agent. Original prompt.",
        new: "You are a test agent. Edited locally.",
      });

      const dry = cli([
        "prompts",
        "update",
        agentId,
        "--source",
        baseDir,
        "--dry-run",
      ]);
      expect(dry.status, dry.stderr).toBe(0);
      expect(dry.json.message).toBe("Dry run - no changes applied");
      expect(dry.json.remote_conflict).toBeUndefined();

      const remote = await client.llm.retrieve(llmId);
      expect(remote.general_prompt).toBe(
        "You are a test agent. Original prompt.",
      );
    });

    it("updates the remote, and a second update from the same copy is not flagged", async () => {
      const first = cli(["prompts", "update", agentId, "--source", baseDir]);
      expect(first.status, first.stderr).toBe(0);
      expect(first.json.warning).toBeUndefined();

      const remote = await client.llm.retrieve(llmId);
      expect(remote.general_prompt).toBe(
        "You are a test agent. Edited locally.",
      );

      // metadata was refreshed, so re-running is not a false REMOTE_CHANGED
      const second = cli(["prompts", "update", agentId, "--source", baseDir]);
      expect(second.status, second.stderr).toBe(0);
    });

    it("refuses with REMOTE_CHANGED after a remote edit, and --force overrides", async () => {
      await client.llm.update(llmId, {
        general_prompt: "You are a test agent. Edited remotely.",
      });

      const refused = cli(["prompts", "update", agentId, "--source", baseDir]);
      expect(refused.status).toBe(1);
      expect(refused.json).toMatchObject({
        code: "REMOTE_CHANGED",
        reason: "remote_modified",
      });
      expect((await client.llm.retrieve(llmId)).general_prompt).toBe(
        "You are a test agent. Edited remotely.",
      );

      const dry = cli([
        "prompts",
        "update",
        agentId,
        "--source",
        baseDir,
        "--dry-run",
      ]);
      expect(dry.status, dry.stderr).toBe(0);
      expect(dry.json.remote_conflict).toMatchObject({
        reason: "remote_modified",
      });

      const forced = cli([
        "prompts",
        "update",
        agentId,
        "--source",
        baseDir,
        "--force",
      ]);
      expect(forced.status, forced.stderr).toBe(0);
      expect((await client.llm.retrieve(llmId)).general_prompt).toBe(
        "You are a test agent. Edited locally.",
      );
    });

    it("re-pull picks up remote changes and removes stale local files", async () => {
      await client.llm.update(llmId, {
        general_prompt: "You are a test agent. Final remote prompt.",
        begin_message: null,
      });

      const r = cli(["prompts", "pull", agentId, "--output", baseDir]);
      expect(r.status, r.stderr).toBe(0);
      expect(readFileSync(join(agentDir, "general_prompt.md"), "utf-8")).toBe(
        "You are a test agent. Final remote prompt.",
      );
      expect(existsSync(join(agentDir, "begin_message.txt"))).toBe(false);

      const diff = cli(["prompts", "diff", agentId, "--source", baseDir]);
      expect(diff.status, diff.stderr).toBe(0);
      expect(diff.json.has_changes).toBe(false);
    });

    it("publishes the agent", async () => {
      const r = cli(["agents", "publish", agentId]);
      expect(r.status, r.stderr).toBe(0);
      expect(r.json).toMatchObject({ agent_id: agentId });
      expect(typeof r.json.published_version).toBe("number");

      const versions = await client.agent.listVersions(agentId);
      const published = versions.items.find(
        (v) => v.version === r.json.published_version,
      );
      expect(published?.is_published).toBe(true);
    });

    it("after publish, update creates a new draft and leaves the published version unchanged", async () => {
      const before = await client.agent.retrieve(agentId);
      expect(before.is_published).toBe(true);
      const publishedAgentVersion = before.version!;
      const publishedLlmVersion = (before.response_engine as any).version;
      const publishedPrompt = (
        await client.llm.retrieve(llmId, { version: publishedLlmVersion })
      ).general_prompt;

      // Local copy is in sync (pulled before publish); publishing alone must
      // not be treated as a remote change.
      writeFileSync(
        join(agentDir, "general_prompt.md"),
        "You are a test agent. Edited after publish.",
      );
      const dry = cli([
        "prompts",
        "update",
        agentId,
        "--source",
        baseDir,
        "--dry-run",
      ]);
      expect(dry.status, dry.stderr).toBe(0);
      expect(dry.json.would_create_draft).toBe(true);
      expect(dry.json.remote_conflict).toBeUndefined();

      const r = cli(["prompts", "update", agentId, "--source", baseDir]);
      expect(r.status, r.stderr).toBe(0);
      expect(r.json.draft_created).toEqual({
        base_version: publishedAgentVersion,
      });
      expect(r.json.agent_version).toBeGreaterThan(publishedAgentVersion);

      // Published version is untouched
      const published = await client.llm.retrieve(llmId, {
        version: publishedLlmVersion,
      });
      expect(published.general_prompt).toBe(publishedPrompt);
      expect(published.is_published).toBe(true);

      // The edit landed in the new draft
      const after = await client.agent.retrieve(agentId);
      expect(after.version).toBe(r.json.agent_version);
      expect(after.is_published).toBe(false);
      const draftLlm = await client.llm.retrieve(llmId, {
        version: (after.response_engine as any).version,
      });
      expect(draftLlm.general_prompt).toBe(
        "You are a test agent. Edited after publish.",
      );

      // A second update writes to the same draft; no extra draft is created
      writeFileSync(
        join(agentDir, "general_prompt.md"),
        "You are a test agent. Second draft edit.",
      );
      const again = cli(["prompts", "update", agentId, "--source", baseDir]);
      expect(again.status, again.stderr).toBe(0);
      expect(again.json.draft_created).toBeUndefined();
      expect(again.json.agent_version).toBe(r.json.agent_version);
    });
  });

  describe("conversation-flow agent", () => {
    let agentId: string;
    let flowId: string;
    let agentDir: string;

    beforeAll(async () => {
      const flow = await client.conversationFlow.create({
        start_speaker: "agent",
        model_choice: { type: "cascading", model: "gpt-4.1-mini" },
        global_prompt: "You are a flow test agent. Original global prompt.",
        start_node_id: "start",
        nodes: [
          {
            id: "start",
            type: "conversation",
            instruction: { type: "prompt", text: "Greet the caller." },
          },
        ],
      });
      flowId = flow.conversation_flow_id;
      created.flows.push(flowId);

      const agent = await client.agent.create({
        agent_name: `${RUN_ID}-flow`,
        voice_id: voiceId,
        response_engine: {
          type: "conversation-flow",
          conversation_flow_id: flowId,
        },
      });
      agentId = agent.agent_id;
      created.agents.push(agentId);
      agentDir = join(baseDir, agentId);
    }, 60_000);

    it("pulls, edits, and updates the global prompt and nodes", async () => {
      const pull = cli(["prompts", "pull", agentId, "--output", baseDir]);
      expect(pull.status, pull.stderr).toBe(0);
      expect(pull.json).toMatchObject({ type: "conversation-flow" });

      const nodes = JSON.parse(
        readFileSync(join(agentDir, "nodes.json"), "utf-8"),
      );
      expect(nodes).toHaveLength(1);
      nodes[0].instruction.text = "Greet the caller warmly.";
      writeFileSync(join(agentDir, "nodes.json"), JSON.stringify(nodes));
      writeFileSync(
        join(agentDir, "global_prompt.md"),
        "You are a flow test agent. Edited global prompt.",
      );

      const update = cli(["prompts", "update", agentId, "--source", baseDir]);
      expect(update.status, update.stderr).toBe(0);
      expect(update.json).toMatchObject({ conversation_flow_id: flowId });

      const remote = await client.conversationFlow.retrieve(flowId);
      expect(remote.global_prompt).toBe(
        "You are a flow test agent. Edited global prompt.",
      );
      expect((remote.nodes?.[0] as any).instruction.text).toBe(
        "Greet the caller warmly.",
      );
    });
  });
});

function warnCleanup(kind: string, id: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[e2e cleanup] failed to delete ${kind} ${id}: ${message}`);
}
