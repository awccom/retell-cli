/**
 * Retell CLI - Command Line Interface for Retell AI
 *
 * Main entry point for the CLI application.
 * Note: Shebang is added by esbuild via --banner flag
 */

import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { loginCommand } from "./commands/login";
import { listTranscriptsCommand } from "./commands/transcripts/list";
import { getTranscriptCommand } from "./commands/transcripts/get";
import {
  analyzeTranscriptCommand,
  DEFAULT_LATENCY_THRESHOLD,
  DEFAULT_SILENCE_THRESHOLD,
} from "./commands/transcripts/analyze";
import { searchTranscriptsCommand } from "./commands/transcripts/search";
import { listAgentsCommand } from "./commands/agents/list";
import { agentInfoCommand } from "./commands/agents/info";
import { createAgentCommand } from "./commands/agents/create";
import { deleteAgentCommand } from "./commands/agents/delete";
import { agentVersionsCommand } from "./commands/agents/versions";
import { createAgentVersionCommand } from "./commands/agents/create-version";
import { deleteAgentVersionCommand } from "./commands/agents/delete-version";
import { pullPromptsCommand } from "./commands/prompts/pull";
import { updatePromptsCommand } from "./commands/prompts/update";
import { diffPromptsCommand } from "./commands/prompts/diff";
import { publishAgentCommand } from "./commands/agent/publish";
import { getAgentCommand } from "./commands/agent/get";
import { updateAgentCommand } from "./commands/agent/update";
import { listToolsCommand } from "./commands/tools/list";
import { getToolCommand } from "./commands/tools/get";
import { addToolCommand } from "./commands/tools/add";
import { updateToolCommand } from "./commands/tools/update";
import { removeToolCommand } from "./commands/tools/remove";
import { exportToolsCommand } from "./commands/tools/export";
import { importToolsCommand } from "./commands/tools/import";
import { listTestCasesCommand } from "./commands/tests/cases/list";
import { getTestCaseCommand } from "./commands/tests/cases/get";
import { createTestCaseCommand } from "./commands/tests/cases/create";
import { updateTestCaseCommand } from "./commands/tests/cases/update";
import { deleteTestCaseCommand } from "./commands/tests/cases/delete";
import { listBatchTestsCommand } from "./commands/tests/batch/list";
import { getBatchTestCommand } from "./commands/tests/batch/get";
import { createBatchTestCommand } from "./commands/tests/batch/create";
import { listTestRunsCommand } from "./commands/tests/runs/list";
import { getTestRunCommand } from "./commands/tests/runs/get";
import { listKnowledgeBasesCommand } from "./commands/kb/list";
import { getKnowledgeBaseCommand } from "./commands/kb/get";
import { createKnowledgeBaseCommand } from "./commands/kb/create";
import { deleteKnowledgeBaseCommand } from "./commands/kb/delete";
import { addKnowledgeBaseSourcesCommand } from "./commands/kb/sources/add";
import { deleteKnowledgeBaseSourceCommand } from "./commands/kb/sources/delete";
import { listFlowsCommand } from "./commands/flows/list";
import { getFlowCommand } from "./commands/flows/get";
import { createFlowCommand } from "./commands/flows/create";
import { updateFlowCommand } from "./commands/flows/update";
import { deleteFlowCommand } from "./commands/flows/delete";
import { listPhoneNumbersCommand } from "./commands/phone-numbers/list";
import { getPhoneNumberCommand } from "./commands/phone-numbers/get";
import { importPhoneNumberCommand } from "./commands/phone-numbers/import";
import { createPhoneNumberCommand } from "./commands/phone-numbers/create";
import { updatePhoneNumberCommand } from "./commands/phone-numbers/update";
import { deletePhoneNumberCommand } from "./commands/phone-numbers/delete";
import { createPhoneCallCommand } from "./commands/calls/create-phone";
import { createWebCallCommand } from "./commands/calls/create-web";
import { registerPhoneCallCommand } from "./commands/calls/register-phone";
import { updateCallCommand } from "./commands/calls/update";
import { deleteCallCommand } from "./commands/calls/delete";
import { stopCallCommand } from "./commands/calls/stop";
import { createBatchCallCommand } from "./commands/batch-calls/create";
import { listExportRequestsCommand } from "./commands/export-requests/list";
import { listLlmsCommand } from "./commands/llms/list";
import { getLlmCommand } from "./commands/llms/get";
import { createLlmCommand } from "./commands/llms/create";
import { updateLlmCommand } from "./commands/llms/update";
import { deleteLlmCommand } from "./commands/llms/delete";
import { listVoicesCommand } from "./commands/voices/list";
import { getVoiceCommand } from "./commands/voices/get";
import { addVoiceResourceCommand } from "./commands/voices/add-resource";
import { cloneVoiceCommand } from "./commands/voices/clone";
import { searchVoicesCommand } from "./commands/voices/search";
import { createChatCommand } from "./commands/chats/create";
import { getChatCommand } from "./commands/chats/get";
import { listChatsCommand } from "./commands/chats/list";
import { updateChatCommand } from "./commands/chats/update";
import { chatCompleteCommand } from "./commands/chats/complete";
import { createSmsChatCommand } from "./commands/chats/sms";
import { endChatCommand } from "./commands/chats/end";
import { deleteChatCommand } from "./commands/chats/delete";
import { createChatAgentCommand } from "./commands/chat-agents/create";
import { getChatAgentCommand } from "./commands/chat-agents/get";
import { updateChatAgentCommand } from "./commands/chat-agents/update";
import { listChatAgentsCommand } from "./commands/chat-agents/list";
import { deleteChatAgentCommand } from "./commands/chat-agents/delete";
import { chatAgentVersionsCommand } from "./commands/chat-agents/versions";
import { publishChatAgentCommand } from "./commands/chat-agents/publish";
import { createChatAgentVersionCommand } from "./commands/chat-agents/create-version";
import { deleteChatAgentVersionCommand } from "./commands/chat-agents/delete-version";
import { listFlowComponentsCommand } from "./commands/flow-components/list";
import { getFlowComponentCommand } from "./commands/flow-components/get";
import { createFlowComponentCommand } from "./commands/flow-components/create";
import { updateFlowComponentCommand } from "./commands/flow-components/update";
import { deleteFlowComponentCommand } from "./commands/flow-components/delete";
import { getConcurrencyCommand } from "./commands/concurrency/get";
import { agentMcpToolsCommand } from "./commands/agents/mcp-tools";
import { playgroundCompleteCommand } from "./commands/playground/complete";
import {
  parseNumericFlag,
  parsePositiveIntegerFlag,
} from "./services/numeric-flag";

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);

function parseFlagOrExit(
  value: string | undefined,
  flagName: string,
): number | undefined {
  if (value === undefined) return undefined;
  try {
    return parseNumericFlag(value, flagName);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function parsePositiveIntegerFlagOrExit(
  value: string | undefined,
  flagName: string,
): number | undefined {
  if (value === undefined) return undefined;
  try {
    return parsePositiveIntegerFlag(value, flagName);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Create main program
const program = new Command();

program
  .name("retell")
  .description("Retell AI CLI - Manage transcripts and agent prompts")
  .version(packageJson.version, "-v, --version", "Display version number")
  .helpOption("-h, --help", "Display help for command")
  .option("--json", "Output as JSON (default)", true);

// Login command
program
  .command("login")
  .description("Authenticate with Retell AI")
  .option("--global", "Save credentials to ~/.retellrc.json (default)")
  .option(
    "--local",
    "Save credentials to ./.retellrc.json for this directory only",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell login
  # Enter your API key when prompted
  # Creates ~/.retellrc.json for use from any directory

  $ retell login --local
  # Creates .retellrc.json in the current directory for project-specific override
  `,
  )
  .action(async (options) => {
    await loginCommand({
      global: options.global,
      local: options.local,
    });
  });

// Transcripts commands
const transcripts = program
  .command("transcripts")
  .description("Manage call transcripts");

transcripts
  .command("list")
  .description("List all call transcripts")
  .option(
    "-l, --limit <number>",
    "Maximum number of calls to return (default: 50)",
    "50",
  )
  .option(
    "--fields <fields>",
    "Comma-separated list of fields to return (e.g., call_id,call_status,metadata.duration)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell transcripts list
  $ retell transcripts list --limit 100
  $ retell transcripts list --fields call_id,call_status
  $ retell transcripts list | jq '.[] | select(.call_status == "error")'
  `,
  )
  .action(async (options) => {
    const limit = parseFlagOrExit(options.limit, "--limit") ?? 50;
    if (limit < 1) {
      console.error("Error: --limit must be a positive number");
      process.exit(1);
    }
    await listTranscriptsCommand({
      limit,
      fields: options.fields,
    });
  });

transcripts
  .command("get <call_id>")
  .description("Get a specific call transcript")
  .option(
    "--fields <fields>",
    "Comma-separated list of fields to return (e.g., call_id,metadata.duration,analysis)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell transcripts get call_abc123
  $ retell transcripts get call_abc123 --fields call_id,metadata.duration
  $ retell transcripts get call_abc123 | jq '.transcript_object'
  `,
  )
  .action(async (callId, options) => {
    await getTranscriptCommand(callId, {
      fields: options.fields,
    });
  });

transcripts
  .command("analyze <call_id>")
  .description(
    "Analyze a call transcript with performance metrics and insights",
  )
  .option(
    "--fields <fields>",
    "Comma-separated list of fields to return (e.g., call_id,performance,analysis.summary)",
  )
  .option(
    "--raw",
    "Return unmodified API response instead of enriched analysis",
  )
  .option(
    "--hotspots-only",
    "Return only conversation hotspots/issues for troubleshooting",
  )
  .option(
    "--latency-threshold <ms>",
    `Latency threshold in ms for hotspot detection (default: ${DEFAULT_LATENCY_THRESHOLD})`,
    String(DEFAULT_LATENCY_THRESHOLD),
  )
  .option(
    "--silence-threshold <ms>",
    `Silence threshold in ms for hotspot detection (default: ${DEFAULT_SILENCE_THRESHOLD})`,
    String(DEFAULT_SILENCE_THRESHOLD),
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell transcripts analyze call_abc123
  $ retell transcripts analyze call_abc123 --fields call_id,performance
  $ retell transcripts analyze call_abc123 --raw
  $ retell transcripts analyze call_abc123 --raw --fields call_id,transcript_object
  $ retell transcripts analyze call_abc123 --hotspots-only
  $ retell transcripts analyze call_abc123 --hotspots-only --latency-threshold 1500
  $ retell transcripts analyze call_abc123 --hotspots-only --fields hotspots
  $ retell transcripts analyze call_abc123 | jq '.performance.latency_p50_ms'
  `,
  )
  .action(async (callId, options) => {
    await analyzeTranscriptCommand(callId, {
      fields: options.fields,
      raw: options.raw,
      hotspotsOnly: options.hotspotsOnly,
      latencyThreshold: parseFlagOrExit(
        options.latencyThreshold,
        "--latency-threshold",
      ),
      silenceThreshold: parseFlagOrExit(
        options.silenceThreshold,
        "--silence-threshold",
      ),
    });
  });

transcripts
  .command("search")
  .description("Search transcripts with advanced filtering")
  .option("--status <status>", "Filter by call status (error, ended, ongoing)")
  .option("--agent-id <id>", "Filter by agent ID")
  .option(
    "--since <date>",
    "Filter calls after this date (YYYY-MM-DD or ISO format)",
  )
  .option(
    "--until <date>",
    "Filter calls before this date (YYYY-MM-DD or ISO format)",
  )
  .option("--limit <number>", "Maximum number of results (default: 50)", "50")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell transcripts search --status error
  $ retell transcripts search --agent-id agent_123 --since 2025-11-01
  $ retell transcripts search --status error --limit 10
  $ retell transcripts search --status error --fields call_id,agent_id,call_status
  $ retell transcripts search --since 2025-11-01 --until 2025-11-15
  `,
  )
  .action(async (options) => {
    await searchTranscriptsCommand({
      status: options.status,
      agentId: options.agentId,
      since: options.since,
      until: options.until,
      limit: parseFlagOrExit(options.limit, "--limit"),
      fields: options.fields,
    });
  });

// Agents commands
const agents = program.command("agents").description("Manage agents");

agents
  .command("list")
  .description("List all agents")
  .option(
    "-l, --limit <number>",
    "Maximum number of agents to return (default: 100)",
    "100",
  )
  .option(
    "--fields <fields>",
    "Comma-separated list of fields to return (e.g., agent_id,agent_name,response_engine_type)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell agents list
  $ retell agents list --limit 10
  $ retell agents list --fields agent_id,agent_name
  $ retell agents list | jq '.[] | select(.response_engine.type == "retell-llm")'
  `,
  )
  .action(async (options) => {
    const limit = parseFlagOrExit(options.limit, "--limit") ?? 50;
    if (limit < 1) {
      console.error("Error: --limit must be a positive number");
      process.exit(1);
    }
    await listAgentsCommand({
      limit,
      fields: options.fields,
    });
  });

agents
  .command("info <agent_id>")
  .description("Get detailed agent information")
  .option(
    "--fields <fields>",
    "Comma-separated list of fields to return (e.g., agent_name,response_engine.type,voice_config)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell agents info agent_123abc
  $ retell agents info agent_123abc --fields agent_name,response_engine.type
  $ retell agents info agent_123abc | jq '.response_engine.type'
  `,
  )
  .action(async (agentId, options) => {
    await agentInfoCommand(agentId, {
      fields: options.fields,
    });
  });

agents
  .command("create")
  .description("Create a new agent")
  .requiredOption("--voice <voice_id>", "Voice ID for the agent")
  .option("--name <name>", "Agent name")
  .option("--llm-id <id>", "Retell LLM ID (creates retell-llm response engine)")
  .option(
    "--flow-id <id>",
    "Conversation Flow ID (creates conversation-flow response engine)",
  )
  .option("--custom-llm <url>", "Custom LLM WebSocket URL")
  .option(
    "-f, --file <path>",
    "Full agent config from JSON file (overrides other options)",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell agents create --voice 11labs-Adrian --llm-id llm_xxx --name "Test Agent"
  $ retell agents create --voice 11labs-Adrian --flow-id cf_xxx
  $ retell agents create --file agent-config.json
  `,
  )
  .action(async (options) => {
    await createAgentCommand(options);
  });

agents
  .command("delete <agent_id>")
  .description("Delete an agent")
  .addHelpText(
    "after",
    `
Examples:
  $ retell agents delete agent_123abc
  `,
  )
  .action(async (agentId) => {
    await deleteAgentCommand(agentId);
  });

agents
  .command("versions <agent_id>")
  .description("List all versions of an agent")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell agents versions agent_123abc
  $ retell agents versions agent_123abc --fields version,is_published
  `,
  )
  .action(async (agentId, options) => {
    await agentVersionsCommand(agentId, options);
  });

agents
  .command("create-version <agent_id>")
  .description("Create a draft agent version from a base version")
  .requiredOption("--base-version <n>", "Existing version to copy")
  .action(async (agentId, options) => {
    await createAgentVersionCommand(agentId, options);
  });

agents
  .command("delete-version <agent_id>")
  .description("Delete a specific agent version")
  .requiredOption("--version <n>", "Version to delete")
  .action(async (agentId, options) => {
    await deleteAgentVersionCommand(agentId, options);
  });

agents
  .command("publish <agent_id>")
  .description("Publish a draft agent version")
  .option("--version <n>", "Draft version to publish")
  .option("--description <text>", "Version description")
  .action(async (agentId, options) => {
    await publishAgentCommand(agentId, options);
  });

// Prompts commands
const prompts = program.command("prompts").description("Manage agent prompts");

prompts
  .command("pull <agent_id>")
  .description("Download agent prompts to a local file")
  .option(
    "-o, --output <path>",
    "Output file path (default: .retell-prompts/<agent_id>.json)",
    ".retell-prompts",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell prompts pull agent_123abc
  $ retell prompts pull agent_123abc --output my-prompts.json
  `,
  )
  .action(async (agentId, options) => {
    await pullPromptsCommand(agentId, options);
  });

prompts
  .command("diff <agent_id>")
  .description("Show differences between local and remote prompts")
  .option(
    "-s, --source <path>",
    "Source directory path (default: .retell-prompts)",
    ".retell-prompts",
  )
  .option("-f, --fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell prompts diff agent_123abc
  $ retell prompts diff agent_123abc --source ./custom-prompts
  $ retell prompts diff agent_123abc --fields has_changes,changes.general_prompt
  `,
  )
  .action(async (agentId, options) => {
    await diffPromptsCommand(agentId, options);
  });

prompts
  .command("update <agent_id>")
  .description("Update agent prompts from a local file")
  .option(
    "-s, --source <path>",
    "Source file path (default: .retell-prompts/<agent_id>.json)",
    ".retell-prompts",
  )
  .option("--dry-run", "Preview changes without applying them", false)
  .addHelpText(
    "after",
    `
Examples:
  $ retell prompts update agent_123abc --source my-prompts.json --dry-run
  $ retell prompts update agent_123abc --source my-prompts.json
  # Remember to publish: retell agents publish agent_123abc
  `,
  )
  .action(async (agentId, options) => {
    await updatePromptsCommand(agentId, options);
  });

// Agent publish command
program
  .command("agent-publish <agent_id>")
  .description("Publish a draft agent to make changes live")
  .option("--version <n>", "Draft version to publish")
  .option("--description <text>", "Version description")
  .addHelpText(
    "after",
    `
Examples:
  $ retell agents publish agent_123abc
  $ retell agents publish agent_123abc --version 15 --description "May prompt update"
  # Run this after updating prompts to make changes live
  `,
  )
  .action(async (agentId, options) => {
    await publishAgentCommand(agentId, options);
  });

// Agent commands (for agent-level configuration)
const agent = program
  .command("agent")
  .description(
    "Manage agent-level configuration (voice, webhooks, post-call analysis, etc.)",
  );

agent
  .command("get <agent_id>")
  .description("Get agent configuration")
  .option(
    "--engine-version <number>",
    "Specific version to retrieve (defaults to latest)",
  )
  .option(
    "--fields <fields>",
    "Comma-separated list of fields to return (e.g., agent_name,post_call_analysis_data)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell agent get agent_123abc
  $ retell agent get agent_123abc --engine-version 2
  $ retell agent get agent_123abc --fields agent_name,post_call_analysis_data
  $ retell agent get agent_123abc > config.json
  `,
  )
  .action(async (agentId, options) => {
    await getAgentCommand(agentId, {
      version: parseFlagOrExit(options.engineVersion, "--engine-version"),
      fields: options.fields,
    });
  });

agent
  .command("update <agent_id>")
  .description("Update agent configuration from a JSON file")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing agent configuration updates",
  )
  .option("--dry-run", "Preview changes without applying them")
  .option(
    "--engine-version <number>",
    "Specific version to update (defaults to latest draft)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell agent update agent_123abc --file config.json
  $ retell agent update agent_123abc --file config.json --dry-run
  $ retell agent update agent_123abc --file analysis.json --engine-version 2

Example JSON for post-call analysis:
  {
    "post_call_analysis_model": "claude-4.5-sonnet",
    "post_call_analysis_data": [
      {
        "type": "system-presets",
        "name": "call_summary",
        "description": "Summarize the call outcome in 2 sentences."
      },
      {
        "type": "system-presets",
        "name": "call_successful",
        "description": "Determine if the issue was resolved."
      },
      {
        "name": "call_outcome",
        "type": "enum",
        "description": "Result of the call",
        "choices": ["successful", "unsuccessful", "callback_needed"]
      }
    ]
  }

Note: Run 'retell agents publish <agent_id>' after updating to publish changes.
  `,
  )
  .action(async (agentId, options) => {
    await updateAgentCommand(agentId, {
      file: options.file,
      dryRun: options.dryRun,
      version: parseFlagOrExit(options.engineVersion, "--engine-version"),
    });
  });

// Tools commands
const tools = program
  .command("tools")
  .description("Manage agent tools (custom functions, webhooks, etc.)");

tools
  .command("list <agent_id>")
  .description("List all tools configured for an agent")
  .option("--state <name>", "Filter by state name (Retell LLM only)")
  .option("--component <id>", "Filter by component ID (Conversation Flow only)")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools list agent_123abc
  $ retell tools list agent_123abc --state greeting
  $ retell tools list agent_123abc --fields total_count,general_tools
  `,
  )
  .action(async (agentId, options) => {
    await listToolsCommand(agentId, {
      state: options.state,
      component: options.component,
      fields: options.fields,
    });
  });

tools
  .command("get <agent_id> <tool_name>")
  .description("Get detailed information about a specific tool")
  .option("--state <name>", "State name to search within (Retell LLM only)")
  .option(
    "--component <id>",
    "Component ID to search within (Conversation Flow only)",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools get agent_123abc lookup_customer
  $ retell tools get agent_123abc book_cal --state booking
  $ retell tools get agent_123abc my_tool --fields tool.name,tool.type
  `,
  )
  .action(async (agentId, toolName, options) => {
    await getToolCommand(agentId, toolName, {
      state: options.state,
      component: options.component,
      fields: options.fields,
    });
  });

tools
  .command("add <agent_id>")
  .description("Add a new tool to an agent")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing tool definition",
  )
  .option("--state <name>", "Add to specific state (Retell LLM only)")
  .option(
    "--component <id>",
    "Add to specific component (Conversation Flow only)",
  )
  .option("--dry-run", "Preview changes without applying them")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools add agent_123abc --file tool.json
  $ retell tools add agent_123abc --file tool.json --state booking
  $ retell tools add agent_123abc --file tool.json --dry-run
  `,
  )
  .action(async (agentId, options) => {
    await addToolCommand(agentId, {
      file: options.file,
      state: options.state,
      component: options.component,
      dryRun: options.dryRun,
    });
  });

tools
  .command("update <agent_id> <tool_name>")
  .description("Update an existing tool")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing updated tool definition",
  )
  .option("--state <name>", "State where tool exists (Retell LLM only)")
  .option(
    "--component <id>",
    "Component where tool exists (Conversation Flow only)",
  )
  .option("--dry-run", "Preview changes without applying them")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools update agent_123abc lookup_customer --file tool.json
  $ retell tools update agent_123abc book_cal --file tool.json --state booking
  $ retell tools update agent_123abc my_tool --file tool.json --dry-run
  `,
  )
  .action(async (agentId, toolName, options) => {
    await updateToolCommand(agentId, toolName, {
      file: options.file,
      state: options.state,
      component: options.component,
      dryRun: options.dryRun,
    });
  });

tools
  .command("remove <agent_id> <tool_name>")
  .description("Remove a tool from an agent")
  .option("--state <name>", "State where tool exists (Retell LLM only)")
  .option(
    "--component <id>",
    "Component where tool exists (Conversation Flow only)",
  )
  .option("--dry-run", "Preview changes without applying them")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools remove agent_123abc lookup_customer
  $ retell tools remove agent_123abc book_cal --state booking
  $ retell tools remove agent_123abc my_tool --dry-run
  `,
  )
  .action(async (agentId, toolName, options) => {
    await removeToolCommand(agentId, toolName, {
      state: options.state,
      component: options.component,
      dryRun: options.dryRun,
    });
  });

tools
  .command("export <agent_id>")
  .description("Export all tools from an agent to a JSON file")
  .option(
    "-o, --output <path>",
    "Output file path (prints to stdout if not specified)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools export agent_123abc
  $ retell tools export agent_123abc --output tools.json
  $ retell tools export agent_123abc > tools.json
  `,
  )
  .action(async (agentId, options) => {
    await exportToolsCommand(agentId, {
      output: options.output,
    });
  });

tools
  .command("import <agent_id>")
  .description("Import tools from a JSON file to an agent")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing tools to import",
  )
  .option("--dry-run", "Preview changes without applying them")
  .option(
    "--replace",
    "Replace existing tools with same name instead of skipping",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell tools import agent_123abc --file tools.json
  $ retell tools import agent_123abc --file tools.json --dry-run
  $ retell tools import agent_123abc --file tools.json --replace
  `,
  )
  .action(async (agentId, options) => {
    await importToolsCommand(agentId, {
      file: options.file,
      dryRun: options.dryRun,
      replace: options.replace,
    });
  });

// Tests commands
const tests = program
  .command("tests")
  .description("Manage test cases, batch tests, and test runs");

// Tests cases subcommand group
const testsCases = tests
  .command("cases")
  .description("Manage test case definitions");

testsCases
  .command("list")
  .description("List all test case definitions for an LLM or flow")
  .requiredOption(
    "-t, --type <type>",
    "Response engine type (retell-llm or conversation-flow)",
  )
  .option("--llm-id <id>", "LLM ID (required when type is retell-llm)")
  .option("--flow-id <id>", "Flow ID (required when type is conversation-flow)")
  .option("--limit <n>", "Maximum number of test case definitions to return")
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests cases list --type retell-llm --llm-id llm_abc123
  $ retell tests cases list --type conversation-flow --flow-id cf_abc123
  $ retell tests cases list --type retell-llm --llm-id llm_abc123 --limit 25 --pagination-key next
  $ retell tests cases list --type retell-llm --llm-id llm_abc123 --fields test_case_definitions
  `,
  )
  .action(async (options) => {
    if (options.type !== "retell-llm" && options.type !== "conversation-flow") {
      console.error('Error: type must be "retell-llm" or "conversation-flow"');
      process.exit(1);
    }
    await listTestCasesCommand({
      type: options.type,
      llmId: options.llmId,
      flowId: options.flowId,
      limit: parsePositiveIntegerFlagOrExit(options.limit, "--limit"),
      paginationKey: options.paginationKey,
      fields: options.fields,
    });
  });

testsCases
  .command("get <test_case_definition_id>")
  .description("Get a specific test case definition")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests cases get tcd_abc123
  $ retell tests cases get tcd_abc123 --fields name,user_prompt
  `,
  )
  .action(async (testCaseDefinitionId, options) => {
    await getTestCaseCommand(testCaseDefinitionId, {
      fields: options.fields,
    });
  });

testsCases
  .command("create")
  .description("Create a new test case definition from a JSON file")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing test case definition",
  )
  .option("--llm-id <id>", "LLM ID (mutually exclusive with --flow-id)")
  .option("--flow-id <id>", "Flow ID (mutually exclusive with --llm-id)")
  .option("--engine-version <number>", "Version of the LLM or flow (optional)")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests cases create --file test-case.json --llm-id llm_abc123
  $ retell tests cases create --file test-case.json --flow-id cf_abc123
  $ retell tests cases create --file test-case.json --llm-id llm_abc123 --engine-version 2

Test case JSON format:
  {
    "name": "Greeting Test",
    "user_prompt": "Hello, I need help with my order",
    "scenario": "User is calling about an order issue",
    "metrics": ["response_quality", "task_completion"]
  }
  `,
  )
  .action(async (options) => {
    await createTestCaseCommand({
      file: options.file,
      llmId: options.llmId,
      flowId: options.flowId,
      version: parseFlagOrExit(options.engineVersion, "--engine-version"),
    });
  });

testsCases
  .command("update <test_case_definition_id>")
  .description("Update an existing test case definition from a JSON file")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing test case updates",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests cases update tcd_abc123 --file test-case.json
  `,
  )
  .action(async (testCaseDefinitionId, options) => {
    await updateTestCaseCommand(testCaseDefinitionId, {
      file: options.file,
    });
  });

testsCases
  .command("delete <test_case_definition_id>")
  .description("Delete a test case definition")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests cases delete tcd_abc123
  `,
  )
  .action(async (testCaseDefinitionId) => {
    await deleteTestCaseCommand(testCaseDefinitionId);
  });

// Tests batch subcommand group
const testsBatch = tests.command("batch").description("Manage batch tests");

testsBatch
  .command("list")
  .description("List all batch tests for an LLM or flow")
  .requiredOption(
    "-t, --type <type>",
    "Response engine type (retell-llm or conversation-flow)",
  )
  .option("--llm-id <id>", "LLM ID (required when type is retell-llm)")
  .option("--flow-id <id>", "Flow ID (required when type is conversation-flow)")
  .option("--limit <n>", "Maximum number of batch tests to return")
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests batch list --type retell-llm --llm-id llm_abc123
  $ retell tests batch list --type conversation-flow --flow-id cf_abc123
  $ retell tests batch list --type retell-llm --llm-id llm_abc123 --limit 25 --pagination-key next
  $ retell tests batch list --type retell-llm --llm-id llm_abc123 --fields batch_tests
  `,
  )
  .action(async (options) => {
    if (options.type !== "retell-llm" && options.type !== "conversation-flow") {
      console.error('Error: type must be "retell-llm" or "conversation-flow"');
      process.exit(1);
    }
    await listBatchTestsCommand({
      type: options.type,
      llmId: options.llmId,
      flowId: options.flowId,
      limit: parsePositiveIntegerFlagOrExit(options.limit, "--limit"),
      paginationKey: options.paginationKey,
      fields: options.fields,
    });
  });

testsBatch
  .command("get <batch_job_id>")
  .description("Get a specific batch test with its status and stats")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests batch get bjj_abc123
  $ retell tests batch get bjj_abc123 --fields status,stats
  `,
  )
  .action(async (batchJobId, options) => {
    await getBatchTestCommand(batchJobId, {
      fields: options.fields,
    });
  });

testsBatch
  .command("create")
  .description("Create a new batch test with specified test case definitions")
  .option("--llm-id <id>", "LLM ID (mutually exclusive with --flow-id)")
  .option("--flow-id <id>", "Flow ID (mutually exclusive with --llm-id)")
  .requiredOption(
    "--cases <ids>",
    "Comma-separated list of test case definition IDs",
  )
  .option("--engine-version <number>", "Version of the LLM or flow (optional)")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests batch create --llm-id llm_abc123 --cases tcd_xxx,tcd_yyy,tcd_zzz
  $ retell tests batch create --flow-id cf_abc123 --cases tcd_xxx,tcd_yyy
  $ retell tests batch create --llm-id llm_abc123 --cases tcd_xxx --engine-version 2
  `,
  )
  .action(async (options) => {
    await createBatchTestCommand({
      llmId: options.llmId,
      flowId: options.flowId,
      cases: options.cases,
      version: parseFlagOrExit(options.engineVersion, "--engine-version"),
    });
  });

// Tests runs subcommand group
const testsRuns = tests.command("runs").description("View test run results");

testsRuns
  .command("list <batch_job_id>")
  .description("List all test runs for a batch test")
  .option("--limit <n>", "Maximum number of test runs to return")
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests runs list bjj_abc123
  $ retell tests runs list bjj_abc123 --limit 25 --pagination-key next
  $ retell tests runs list bjj_abc123 --fields test_runs
  `,
  )
  .action(async (batchJobId, options) => {
    await listTestRunsCommand(batchJobId, {
      limit: parsePositiveIntegerFlagOrExit(options.limit, "--limit"),
      paginationKey: options.paginationKey,
      fields: options.fields,
    });
  });

testsRuns
  .command("get <test_run_id>")
  .description("Get a specific test run result")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell tests runs get tcj_abc123
  $ retell tests runs get tcj_abc123 --fields status,metric_results
  `,
  )
  .action(async (testRunId, options) => {
    await getTestRunCommand(testRunId, {
      fields: options.fields,
    });
  });

// Knowledge Base commands
const kb = program.command("kb").description("Manage RAG knowledge bases");

kb.command("list")
  .description("List all knowledge bases")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell kb list
  $ retell kb list --fields knowledge_base_id,knowledge_base_name,status
  `,
  )
  .action(async (options) => {
    await listKnowledgeBasesCommand({
      fields: options.fields,
    });
  });

kb.command("get <knowledge_base_id>")
  .description("Get a specific knowledge base")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell kb get kb_abc123
  $ retell kb get kb_abc123 --fields knowledge_base_name,status,knowledge_base_sources
  `,
  )
  .action(async (knowledgeBaseId, options) => {
    await getKnowledgeBaseCommand(knowledgeBaseId, {
      fields: options.fields,
    });
  });

kb.command("create")
  .description("Create a new knowledge base")
  .requiredOption(
    "-n, --name <name>",
    "Knowledge base name (max 40 characters)",
  )
  .option("--urls <urls>", "Comma-separated list of URLs to scrape")
  .option(
    "--texts <file>",
    "Path to JSON file with text entries [{ title, text }, ...]",
  )
  .option("--auto-refresh", "Enable 12-hour automatic refresh for URL sources")
  .addHelpText(
    "after",
    `
Examples:
  $ retell kb create --name "Product Docs"
  $ retell kb create --name "Support KB" --urls https://docs.example.com,https://help.example.com
  $ retell kb create --name "FAQ" --texts texts.json
  $ retell kb create --name "Docs" --urls https://docs.example.com --auto-refresh

Text file format (texts.json):
  [
    { "title": "Getting Started", "text": "Welcome to our product..." },
    { "title": "FAQ", "text": "Frequently asked questions..." }
  ]
  `,
  )
  .action(async (options) => {
    await createKnowledgeBaseCommand({
      name: options.name,
      urls: options.urls,
      texts: options.texts,
      autoRefresh: options.autoRefresh,
    });
  });

kb.command("delete <knowledge_base_id>")
  .description("Delete a knowledge base")
  .addHelpText(
    "after",
    `
Examples:
  $ retell kb delete kb_abc123
  `,
  )
  .action(async (knowledgeBaseId) => {
    await deleteKnowledgeBaseCommand(knowledgeBaseId);
  });

// Knowledge Base sources subcommand group
const kbSources = kb
  .command("sources")
  .description("Manage knowledge base sources");

kbSources
  .command("add <knowledge_base_id>")
  .description("Add sources to an existing knowledge base")
  .option("--urls <urls>", "Comma-separated list of URLs to scrape")
  .option(
    "--texts <file>",
    "Path to JSON file with text entries [{ title, text }, ...]",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell kb sources add kb_abc123 --urls https://docs.example.com/new
  $ retell kb sources add kb_abc123 --texts additional-texts.json
  $ retell kb sources add kb_abc123 --urls https://faq.example.com --texts more-texts.json
  `,
  )
  .action(async (knowledgeBaseId, options) => {
    await addKnowledgeBaseSourcesCommand(knowledgeBaseId, {
      urls: options.urls,
      texts: options.texts,
    });
  });

kbSources
  .command("delete <knowledge_base_id> <source_id>")
  .description("Remove a source from a knowledge base")
  .addHelpText(
    "after",
    `
Examples:
  $ retell kb sources delete kb_abc123 source_xyz789
  `,
  )
  .action(async (knowledgeBaseId, sourceId) => {
    await deleteKnowledgeBaseSourceCommand(knowledgeBaseId, sourceId);
  });

// Conversation Flow commands
const flows = program
  .command("flows")
  .description("Manage conversation flow response engines");

flows
  .command("list")
  .description("List all conversation flows")
  .option(
    "-l, --limit <number>",
    "Maximum number of flows to return (default: 100, max: 1000)",
    "100",
  )
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--sort-order <order>", "ascending or descending")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell flows list
  $ retell flows list --limit 50
  $ retell flows list --limit 50 --pagination-key next --sort-order ascending
  $ retell flows list --fields conversation_flow_id,version,start_speaker
  `,
  )
  .action(async (options) => {
    const limit = parseFlagOrExit(options.limit, "--limit") ?? 50;
    if (limit < 1 || limit > 1000) {
      console.error(
        "Error: --limit must be a positive number between 1 and 1000",
      );
      process.exit(1);
    }
    await listFlowsCommand({
      limit,
      paginationKey: options.paginationKey,
      sortOrder: options.sortOrder,
      fields: options.fields,
    });
  });

flows
  .command("get <conversation_flow_id>")
  .description("Get a specific conversation flow")
  .option(
    "--engine-version <number>",
    "Specific version to retrieve (defaults to latest)",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell flows get cf_abc123
  $ retell flows get cf_abc123 --engine-version 2
  $ retell flows get cf_abc123 --fields conversation_flow_id,nodes,edges
  `,
  )
  .action(async (conversationFlowId, options) => {
    await getFlowCommand(conversationFlowId, {
      version: parseFlagOrExit(options.engineVersion, "--engine-version"),
      fields: options.fields,
    });
  });

flows
  .command("create")
  .description("Create a new conversation flow from a JSON file")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing flow configuration",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell flows create --file flow.json

Flow JSON format (minimal):
  {
    "start_speaker": "agent",
    "start_node_id": "node_1",
    "nodes": [...],
    "edges": [...]
  }
  `,
  )
  .action(async (options) => {
    await createFlowCommand({
      file: options.file,
    });
  });

flows
  .command("update <conversation_flow_id>")
  .description("Update an existing conversation flow from a JSON file")
  .requiredOption(
    "-f, --file <path>",
    "Path to JSON file containing flow updates",
  )
  .option(
    "--engine-version <number>",
    "Specific version to update (defaults to latest)",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ retell flows update cf_abc123 --file updates.json
  $ retell flows update cf_abc123 --file updates.json --engine-version 2
  `,
  )
  .action(async (conversationFlowId, options) => {
    await updateFlowCommand(conversationFlowId, {
      file: options.file,
      version: parseFlagOrExit(options.engineVersion, "--engine-version"),
    });
  });

flows
  .command("delete <conversation_flow_id>")
  .description("Delete a conversation flow")
  .addHelpText(
    "after",
    `
Examples:
  $ retell flows delete cf_abc123
  `,
  )
  .action(async (conversationFlowId) => {
    await deleteFlowCommand(conversationFlowId);
  });

// Phone Numbers commands
const phoneNumbers = program
  .command("phone-numbers")
  .description("Manage phone numbers");

phoneNumbers
  .command("list")
  .description("List all phone numbers")
  .option("--limit <n>", "Maximum number of phone numbers to return")
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--sort-order <order>", "ascending or descending")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell phone-numbers list
  $ retell phone-numbers list --limit 25 --sort-order descending
  $ retell phone-numbers list --fields phone_number,nickname,inbound_agents
  `,
  )
  .action(async (options) => {
    await listPhoneNumbersCommand(options);
  });

phoneNumbers
  .command("get <phone_number>")
  .description("Get phone number details")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell phone-numbers get +14157774444
  $ retell phone-numbers get +14157774444 --fields phone_number,inbound_agents
  `,
  )
  .action(async (phoneNumber, options) => {
    await getPhoneNumberCommand(phoneNumber, options);
  });

phoneNumbers
  .command("import")
  .description("Import a phone number from custom telephony")
  .requiredOption("--number <number>", "Phone number in E.164 format")
  .requiredOption("--termination-uri <uri>", "SIP trunk termination URI")
  .option("--nickname <name>", "Friendly name for reference")
  .option(
    "--inbound-agent <id>",
    "Single agent for inbound calls (shorthand for weight 1)",
  )
  .option(
    "--outbound-agent <id>",
    "Single agent for outbound calls (shorthand for weight 1)",
  )
  .option(
    "--inbound-agents <spec>",
    "Weighted inbound agents (format: id:weight,id:weight)",
  )
  .option(
    "--outbound-agents <spec>",
    "Weighted outbound agents (format: id:weight,id:weight)",
  )
  .option("--sip-username <user>", "SIP trunk auth username")
  .option("--sip-password <pass>", "SIP trunk auth password")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell phone-numbers import --number +14157774444 --termination-uri someuri.pstn.twilio.com
  $ retell phone-numbers import --number +14157774444 --termination-uri someuri.pstn.twilio.com --nickname "Support Line"
  $ retell phone-numbers import --number +14157774444 --termination-uri someuri.pstn.twilio.com --inbound-agent agent_xxx
  $ retell phone-numbers import --number +14157774444 --termination-uri someuri.pstn.twilio.com --inbound-agents "agent_1:0.6,agent_2:0.4"

SMS agent bindings are not supported on import. Use \`phone-numbers update\` after import to bind SMS agents.
  `,
  )
  .action(async (options) => {
    await importPhoneNumberCommand(options);
  });

phoneNumbers
  .command("create")
  .description("Purchase a new phone number and bind agents")
  .option("--country-code <code>", "Country code: US or CA")
  .option("--area-code <code>", "3-digit US area code")
  .option("--number-provider <provider>", "twilio or telnyx")
  .option("--toll-free", "Purchase a toll-free number")
  .option("--nickname <name>", "Friendly name for reference")
  .option("--phone-number <number>", "Specific E.164 number to purchase")
  .option(
    "--fallback-number <number>",
    "Enterprise: fallback destination during outage",
  )
  .option("--inbound-webhook-url <url>", "Inbound call webhook URL")
  .option("--transport <proto>", "SIP transport: TLS, TCP, or UDP")
  .option(
    "--inbound-agent <id>",
    "Single inbound agent (shorthand for weight 1)",
  )
  .option(
    "--outbound-agent <id>",
    "Single outbound agent (shorthand for weight 1)",
  )
  .option(
    "--inbound-agents <spec>",
    "Weighted inbound agents (format: id:weight,id:weight)",
  )
  .option(
    "--outbound-agents <spec>",
    "Weighted outbound agents (format: id:weight,id:weight)",
  )
  .option(
    "--allowed-inbound-country-list <csv>",
    "Comma-separated ISO-2 country codes",
  )
  .option(
    "--allowed-outbound-country-list <csv>",
    "Comma-separated ISO-2 country codes",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell phone-numbers create --area-code 415 --nickname "Frontdesk"
  $ retell phone-numbers create --country-code US --toll-free --inbound-agent agent_xxx
    `,
  )
  .action(async (options) => {
    await createPhoneNumberCommand(options);
  });

phoneNumbers
  .command("update <phone_number>")
  .description("Update agents and settings bound to a phone number")
  .option(
    "--nickname <name>",
    "Friendly name for reference (use empty string to clear)",
  )
  .option(
    "--termination-uri <uri>",
    "SIP trunk termination URI (custom telephony)",
  )
  .option("--sip-username <user>", "SIP trunk auth username")
  .option("--sip-password <pass>", "SIP trunk auth password")
  .option(
    "--transport <proto>",
    "SIP transport: TLS, TCP, or UDP (use empty string to clear)",
  )
  .option(
    "--inbound-webhook-url <url>",
    "Inbound call webhook URL (use empty string to clear)",
  )
  .option(
    "--inbound-sms-webhook-url <url>",
    "Inbound SMS webhook URL (use empty string to clear)",
  )
  .option(
    "--fallback-number <number>",
    "Enterprise: fallback destination during outage (use empty string to clear)",
  )
  .option(
    "--allowed-inbound-country-list <csv>",
    "Comma-separated ISO-2 country codes (use empty string to clear)",
  )
  .option(
    "--allowed-outbound-country-list <csv>",
    "Comma-separated ISO-2 country codes (use empty string to clear)",
  )
  .option(
    "--inbound-agent <id>",
    "Single inbound agent (shorthand for weight 1)",
  )
  .option(
    "--outbound-agent <id>",
    "Single outbound agent (shorthand for weight 1)",
  )
  .option(
    "--inbound-agents <spec>",
    "Weighted inbound agents (format: id:weight,id:weight)",
  )
  .option(
    "--outbound-agents <spec>",
    "Weighted outbound agents (format: id:weight,id:weight)",
  )
  .option("--inbound-sms-agents <spec>", "Weighted inbound SMS agents")
  .option("--outbound-sms-agents <spec>", "Weighted outbound SMS agents")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell phone-numbers update +14157774444 --inbound-agent agent_new
  $ retell phone-numbers update +14157774444 --inbound-agents "a:0.7,b:0.3" --nickname Support
  $ retell phone-numbers update +14157774444 --fallback-number "" (clear)
    `,
  )
  .action(async (phoneNumber, options) => {
    await updatePhoneNumberCommand(phoneNumber, options);
  });

phoneNumbers
  .command("delete <phone_number>")
  .description("Release an existing phone number")
  .addHelpText(
    "after",
    `
Examples:
  $ retell phone-numbers delete +14157774444
    `,
  )
  .action(async (phoneNumber) => {
    await deletePhoneNumberCommand(phoneNumber);
  });

// Calls commands (create/update/delete; list and get stay under `transcripts`)
const calls = program
  .command("calls")
  .description("Create and manage calls (list/get are under `transcripts`)");

calls
  .command("create-phone")
  .description("Create a new outbound phone call")
  .requiredOption("--from-number <number>", "Caller number in E.164 format")
  .requiredOption("--to-number <number>", "Callee number in E.164 format")
  .option("--override-agent-id <id>", "One-time agent override for this call")
  .option(
    "--override-agent-version <n>",
    "Override agent version for this call",
  )
  .option("--metadata <json>", "Inline JSON or @path for call metadata")
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path for dynamic variables",
  )
  .option(
    "--custom-sip-headers <json>",
    "Inline JSON or @path for custom SIP headers",
  )
  .option(
    "--agent-override <path>",
    "Path to JSON file with agent_override block",
  )
  .option(
    "--ignore-e164-validation",
    "Skip E.164 validation for from-number (custom telephony)",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell calls create-phone --from-number +14157774444 --to-number +12137774445
  $ retell calls create-phone --from-number +1 --to-number +1 --metadata '{"customer_id":"c_1"}'
    `,
  )
  .action(async (options) => {
    await createPhoneCallCommand(options);
  });

calls
  .command("create-web")
  .description("Create a new web call for a browser-based agent")
  .requiredOption("--agent-id <id>", "Agent to use for this web call")
  .option("--agent-version <n>", "Specific agent version")
  .option("--metadata <json>", "Inline JSON or @path for call metadata")
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path for dynamic variables",
  )
  .option(
    "--agent-override <path>",
    "Path to JSON file with agent_override block",
  )
  .option("--current-node-id <id>", "Start at this conversation-flow node")
  .option("--current-state <name>", "Start at this Retell-LLM state")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await createWebCallCommand(options);
  });

calls
  .command("register-phone")
  .description("Register a phone call for custom telephony (you dial)")
  .requiredOption("--agent-id <id>", "Agent to use for this call")
  .option("--agent-version <n>", "Specific agent version")
  .option("--direction <dir>", "inbound or outbound")
  .option("--from-number <n>", "Tracking from-number")
  .option("--to-number <n>", "Tracking to-number")
  .option("--metadata <json>", "Inline JSON or @path for call metadata")
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path for dynamic variables",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await registerPhoneCallCommand(options);
  });

calls
  .command("update <call_id>")
  .description("Update metadata and storage settings on an existing call")
  .option("--metadata <json>", "Inline JSON or @path for call metadata")
  .option(
    "--custom-attributes <json>",
    "Inline JSON or @path for custom attributes",
  )
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path overriding dynamic variables",
  )
  .option(
    "--data-storage-setting <value>",
    "everything | everything_except_pii | basic_attributes_only",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (callId, options) => {
    await updateCallCommand(callId, options);
  });

calls
  .command("stop <call_id>")
  .description("Stop an ongoing call")
  .action(async (callId) => {
    await stopCallCommand(callId);
  });

calls
  .command("delete <call_id>")
  .description("Delete a call and its associated data")
  .action(async (callId) => {
    await deleteCallCommand(callId);
  });

// Export request commands
const exportsCommand = program
  .command("exports")
  .description("Manage export requests");

exportsCommand
  .command("list")
  .description("List export requests")
  .option("--limit <number>", "Maximum number of export requests to return")
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--sort-order <order>", "ascending or descending")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell exports list
  $ retell exports list --limit 20 --sort-order descending
  $ retell exports list --fields items.0.export_request_id,pagination_key
    `,
  )
  .action(async (options) => {
    await listExportRequestsCommand(options);
  });

// Batch Calls commands
const batchCalls = program
  .command("batch-calls")
  .description("Schedule bulk outbound calls");

batchCalls
  .command("create")
  .description("Create a new batch call")
  .requiredOption("--from-number <number>", "Caller number in E.164 format")
  .requiredOption(
    "--tasks <path>",
    "Path to JSON array of task objects ({to_number, ...})",
  )
  .option("--name <name>", "Friendly name for your reference")
  .option(
    "--reserved-concurrency <n>",
    "Concurrency reserved for non-batch calls",
  )
  .option("--trigger-timestamp <ms>", "Scheduled send time (unix ms)")
  .option(
    "--call-time-window <path>",
    "Path to JSON file with call_time_window object",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell batch-calls create --from-number +14157774444 --tasks tasks.json
  $ retell batch-calls create --from-number +1 --tasks tasks.json --name "Outreach Apr"
    `,
  )
  .action(async (options) => {
    await createBatchCallCommand(options);
  });

// LLM commands
const llms = program
  .command("llms")
  .description("Manage Retell LLM response engines");

llms
  .command("list")
  .description("List Retell LLMs")
  .option("-l, --limit <n>", "Maximum number to return")
  .option("--pagination-key <key>", "LLM id to start from")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await listLlmsCommand(options);
  });

llms
  .command("get <llm_id>")
  .description("Get a specific Retell LLM")
  .option("--version <n>", "Specific version to retrieve (defaults to latest)")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (llmId, options) => {
    await getLlmCommand(llmId, options);
  });

llms
  .command("create")
  .description("Create a new Retell LLM (simple flags or full --file)")
  .option("-f, --file <path>", "Path to JSON file with the full LLM body")
  .option("--general-prompt <text>", "General system prompt")
  .option("--model <model>", "Text LLM model (e.g. gpt-4.1)")
  .option("--s2s-model <model>", "Speech-to-speech model")
  .option("--start-speaker <who>", "'user' or 'agent'")
  .option("--begin-message <msg>", "First agent utterance")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await createLlmCommand(options);
  });

llms
  .command("update <llm_id>")
  .description("Update a Retell LLM (body via --file)")
  .requiredOption("-f, --file <path>", "Path to JSON file with LLM update body")
  .option("--version <n>", "Specific version to update")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (llmId, options) => {
    await updateLlmCommand(llmId, options);
  });

llms
  .command("delete <llm_id>")
  .description("Delete a Retell LLM")
  .action(async (llmId) => {
    await deleteLlmCommand(llmId);
  });

// Voices commands
const voices = program
  .command("voices")
  .description("Manage and search voice resources");

voices
  .command("list")
  .description("List all voices available to this account")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await listVoicesCommand(options);
  });

voices
  .command("get <voice_id>")
  .description("Get a specific voice")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (voiceId, options) => {
    await getVoiceCommand(voiceId, options);
  });

voices
  .command("add-resource")
  .description("Add a community voice to the account's library")
  .requiredOption(
    "--provider-voice-id <id>",
    "Voice id assigned by the provider",
  )
  .requiredOption("--voice-name <name>", "Custom name for the voice")
  .option(
    "--voice-provider <p>",
    "elevenlabs, cartesia, minimax, or fish_audio",
  )
  .option(
    "--public-user-id <id>",
    "ElevenLabs only: public user id of the owner",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await addVoiceResourceCommand(options);
  });

voices
  .command("clone")
  .description("Clone a voice from one or more audio files")
  .requiredOption("--voice-name <name>", "Name for the cloned voice")
  .requiredOption(
    "--voice-provider <p>",
    "elevenlabs, cartesia, minimax, fish_audio, or platform",
  )
  .option(
    "--file <path>",
    "Audio file to use for cloning (repeat for multiple files)",
    (value: string, previous: string[] = []) => [...previous, value],
    [] as string[],
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell voices clone --voice-name "Dev Clone" --voice-provider elevenlabs --file sample.wav
  $ retell voices clone --voice-name "Multi" --voice-provider elevenlabs --file one.wav --file two.wav
    `,
  )
  .action(async (options) => {
    await cloneVoiceCommand(options);
  });

voices
  .command("search")
  .description("Search community voices from a provider")
  .requiredOption(
    "--search-query <query>",
    "Search query (name, description, or id)",
  )
  .option(
    "--voice-provider <p>",
    "elevenlabs, cartesia, minimax, or fish_audio",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await searchVoicesCommand(options);
  });

// Chats commands
const chats = program
  .command("chats")
  .description("Manage chat sessions with chat agents");

chats
  .command("create")
  .description("Start a new chat session")
  .requiredOption("--agent-id <id>", "Chat agent id")
  .option("--agent-version <n>", "Specific chat agent version")
  .option("--metadata <json>", "Inline JSON or @path for chat metadata")
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path for dynamic variables",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await createChatCommand(options);
  });

chats
  .command("get <chat_id>")
  .description("Get a chat by id")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (chatId, options) => {
    await getChatCommand(chatId, options);
  });

chats
  .command("list")
  .description("List chats")
  .option("-l, --limit <n>", "Maximum number to return")
  .option("--pagination-key <key>", "Chat id to start from")
  .option("--sort-order <order>", "ascending or descending")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await listChatsCommand(options);
  });

chats
  .command("update <chat_id>")
  .description("Update metadata and storage settings on a chat")
  .option("--metadata <json>", "Inline JSON or @path for chat metadata")
  .option(
    "--custom-attributes <json>",
    "Inline JSON or @path for custom attributes",
  )
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path overriding dynamic variables",
  )
  .option(
    "--data-storage-setting <value>",
    "everything | basic_attributes_only",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (chatId, options) => {
    await updateChatCommand(chatId, options);
  });

chats
  .command("complete")
  .description("Send a user message and get the agent's completion")
  .requiredOption("--chat-id <id>", "Chat id")
  .requiredOption("--content <text>", "User message content")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await chatCompleteCommand(options);
  });

chats
  .command("sms")
  .description("Create an SMS-backed chat session")
  .requiredOption(
    "--from-number <number>",
    "Sender number (must be SMS-capable)",
  )
  .requiredOption("--to-number <number>", "Recipient number")
  .option("--override-agent-id <id>", "One-time agent override")
  .option("--override-agent-version <n>", "Override agent version")
  .option("--metadata <json>", "Inline JSON or @path for chat metadata")
  .option(
    "--dynamic-variables <json>",
    "Inline JSON or @path for dynamic variables",
  )
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await createSmsChatCommand(options);
  });

chats
  .command("end <chat_id>")
  .description("End an active chat session")
  .action(async (chatId) => {
    await endChatCommand(chatId);
  });

chats
  .command("delete <chat_id>")
  .description("Delete a chat and its associated data")
  .action(async (chatId) => {
    await deleteChatCommand(chatId);
  });

// Playground commands
const playground = program
  .command("playground")
  .description("Run stateless playground completions");

playground
  .command("complete <agent_id>")
  .description("Run a stateless playground completion")
  .requiredOption(
    "--messages <json>",
    "Conversation history as inline JSON array or @path",
  )
  .option(
    "--dynamic-variables <json>",
    "Inline JSON object or @path for dynamic variables",
  )
  .option("--tool-mocks <json>", "Inline JSON array or @path for tool mocks")
  .option("--current-state <name>", "Current Retell-LLM state")
  .option("--current-node-id <id>", "Current conversation-flow node id")
  .option("--component-id <id>", "Conversation-flow component id")
  .option("--version <number>", "Agent version to use")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .addHelpText(
    "after",
    `
Examples:
  $ retell playground complete agent_abc --messages '[{"role":"user","content":"Hi"}]'
  $ retell playground complete agent_abc --messages @messages.json --dynamic-variables '{"name":"Ada"}'
    `,
  )
  .action(async (agentId, options) => {
    await playgroundCompleteCommand(agentId, options);
  });

// Chat Agents commands
const chatAgents = program
  .command("chat-agents")
  .description("Manage chat agents (text/SMS mode)");

chatAgents
  .command("list")
  .description("List chat agents")
  .option("-l, --limit <n>", "Maximum number to return")
  .option("--pagination-key <key>", "Pagination key for fetching the next page")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await listChatAgentsCommand(options);
  });

chatAgents
  .command("get <agent_id>")
  .description("Get a chat agent")
  .option("--version <n>", "Specific version to retrieve")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (agentId, options) => {
    await getChatAgentCommand(agentId, options);
  });

chatAgents
  .command("create")
  .description("Create a new chat agent")
  .option("-f, --file <path>", "Path to JSON file with full agent body")
  .option("--name <name>", "Agent name")
  .option("--llm-id <id>", "Attach a retell-llm response engine")
  .option("--flow-id <id>", "Attach a conversation-flow response engine")
  .option("--custom-llm <url>", "Custom-LLM websocket URL")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await createChatAgentCommand(options);
  });

chatAgents
  .command("update <agent_id>")
  .description("Update a chat agent (body via --file)")
  .requiredOption("-f, --file <path>", "Path to JSON file with update body")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (agentId, options) => {
    await updateChatAgentCommand(agentId, options);
  });

chatAgents
  .command("delete <agent_id>")
  .description("Delete a chat agent")
  .action(async (agentId) => {
    await deleteChatAgentCommand(agentId);
  });

chatAgents
  .command("versions <agent_id>")
  .description("List all versions of a chat agent")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (agentId, options) => {
    await chatAgentVersionsCommand(agentId, options);
  });

chatAgents
  .command("create-version <agent_id>")
  .description("Create a draft chat agent version from a base version")
  .requiredOption("--base-version <n>", "Existing version to copy")
  .action(async (agentId, options) => {
    await createChatAgentVersionCommand(agentId, options);
  });

chatAgents
  .command("delete-version <agent_id>")
  .description("Delete a specific chat agent version")
  .requiredOption("--version <n>", "Version to delete")
  .action(async (agentId, options) => {
    await deleteChatAgentVersionCommand(agentId, options);
  });

chatAgents
  .command("publish <agent_id>")
  .description("Publish a draft chat agent version")
  .option("--version <n>", "Draft version to publish")
  .option("--description <text>", "Version description")
  .action(async (agentId, options) => {
    await publishChatAgentCommand(agentId, options);
  });

// Flow Components commands
const flowComponents = program
  .command("flow-components")
  .description("Manage reusable conversation-flow components");

flowComponents
  .command("list")
  .description("List flow components")
  .option("--limit <n>", "Maximum number of flow components to return")
  .option("--pagination-key <key>", "Pagination key for the next page")
  .option("--sort-order <order>", "ascending or descending")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await listFlowComponentsCommand(options);
  });

flowComponents
  .command("get <component_id>")
  .description("Get a flow component")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (componentId, options) => {
    await getFlowComponentCommand(componentId, options);
  });

flowComponents
  .command("create")
  .description("Create a new flow component (body via --file)")
  .requiredOption("-f, --file <path>", "Path to JSON file with the full body")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await createFlowComponentCommand(options);
  });

flowComponents
  .command("update <component_id>")
  .description("Update a flow component (body via --file)")
  .requiredOption("-f, --file <path>", "Path to JSON file with update body")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (componentId, options) => {
    await updateFlowComponentCommand(componentId, options);
  });

flowComponents
  .command("delete <component_id>")
  .description("Delete a flow component")
  .action(async (componentId) => {
    await deleteFlowComponentCommand(componentId);
  });

// Concurrency commands
const concurrency = program
  .command("concurrency")
  .description("View the org's call concurrency and limits");

concurrency
  .command("get")
  .description("Get current call concurrency and limits")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (options) => {
    await getConcurrencyCommand(options);
  });

// Agents: MCP tools sub-command
program.commands
  .find((c) => c.name() === "agents")!
  .command("mcp-tools <agent_id>")
  .description("List the MCP tools available to an agent")
  .requiredOption("--mcp-id <id>", "ID of the MCP server")
  .option("--component-id <id>", "Component id (if MCP is under a component)")
  .option("--version <n>", "Agent version (defaults to latest)")
  .option("--fields <fields>", "Comma-separated list of fields to return")
  .action(async (agentId, options) => {
    await agentMcpToolsCommand(agentId, options);
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
