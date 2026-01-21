/**
 * Retell CLI - Command Line Interface for Retell AI
 *
 * Main entry point for the CLI application.
 * Note: Shebang is added by esbuild via --banner flag
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginCommand } from './commands/login';
import { listTranscriptsCommand } from './commands/transcripts/list';
import { getTranscriptCommand } from './commands/transcripts/get';
import { analyzeTranscriptCommand, DEFAULT_LATENCY_THRESHOLD, DEFAULT_SILENCE_THRESHOLD } from './commands/transcripts/analyze';
import { searchTranscriptsCommand } from './commands/transcripts/search';
import { listAgentsCommand } from './commands/agents/list';
import { agentInfoCommand } from './commands/agents/info';
import { pullPromptsCommand } from './commands/prompts/pull';
import { updatePromptsCommand } from './commands/prompts/update';
import { diffPromptsCommand } from './commands/prompts/diff';
import { publishAgentCommand } from './commands/agent/publish';
import { listToolsCommand } from './commands/tools/list';
import { getToolCommand } from './commands/tools/get';
import { addToolCommand } from './commands/tools/add';
import { updateToolCommand } from './commands/tools/update';
import { removeToolCommand } from './commands/tools/remove';
import { exportToolsCommand } from './commands/tools/export';
import { importToolsCommand } from './commands/tools/import';
import { listTestCasesCommand } from './commands/tests/cases/list';
import { getTestCaseCommand } from './commands/tests/cases/get';
import { createTestCaseCommand } from './commands/tests/cases/create';
import { updateTestCaseCommand } from './commands/tests/cases/update';
import { deleteTestCaseCommand } from './commands/tests/cases/delete';
import { listBatchTestsCommand } from './commands/tests/batch/list';
import { getBatchTestCommand } from './commands/tests/batch/get';
import { createBatchTestCommand } from './commands/tests/batch/create';
import { listTestRunsCommand } from './commands/tests/runs/list';
import { getTestRunCommand } from './commands/tests/runs/get';
import { listKnowledgeBasesCommand } from './commands/kb/list';
import { getKnowledgeBaseCommand } from './commands/kb/get';
import { createKnowledgeBaseCommand } from './commands/kb/create';
import { deleteKnowledgeBaseCommand } from './commands/kb/delete';
import { addKnowledgeBaseSourcesCommand } from './commands/kb/sources/add';
import { deleteKnowledgeBaseSourceCommand } from './commands/kb/sources/delete';
import { listFlowsCommand } from './commands/flows/list';
import { getFlowCommand } from './commands/flows/get';
import { createFlowCommand } from './commands/flows/create';
import { updateFlowCommand } from './commands/flows/update';
import { deleteFlowCommand } from './commands/flows/delete';

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Create main program
const program = new Command();

program
  .name('retell')
  .description('Retell AI CLI - Manage transcripts and agent prompts')
  .version(packageJson.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command')
  .option('--json', 'Output as JSON (default)', true);

// ===== PLACEHOLDER COMMANDS =====
// These will be implemented in subsequent phases

// Login command (Phase 2)
program
  .command('login')
  .description('Authenticate with Retell AI')
  .addHelpText('after', `
Examples:
  $ retell login
  # Enter your API key when prompted
  # Creates .retellrc.json in current directory
  `)
  .action(async () => {
    await loginCommand();
  });

// Transcripts commands (Phase 3)
const transcripts = program
  .command('transcripts')
  .description('Manage call transcripts');

transcripts
  .command('list')
  .description('List all call transcripts')
  .option('-l, --limit <number>', 'Maximum number of calls to return (default: 50)', '50')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,call_status,metadata.duration)')
  .addHelpText('after', `
Examples:
  $ retell transcripts list
  $ retell transcripts list --limit 100
  $ retell transcripts list --fields call_id,call_status
  $ retell transcripts list | jq '.[] | select(.call_status == "error")'
  `)
  .action(async (options) => {
    const limit = parseInt(options.limit, 10);
    if (isNaN(limit) || limit < 1) {
      console.error('Error: limit must be a positive number');
      process.exit(1);
    }
    await listTranscriptsCommand({
      limit,
      fields: options.fields,
    });
  });

transcripts
  .command('get <call_id>')
  .description('Get a specific call transcript')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,metadata.duration,analysis)')
  .addHelpText('after', `
Examples:
  $ retell transcripts get call_abc123
  $ retell transcripts get call_abc123 --fields call_id,metadata.duration
  $ retell transcripts get call_abc123 | jq '.transcript_object'
  `)
  .action(async (callId, options) => {
    await getTranscriptCommand(callId, {
      fields: options.fields,
    });
  });

transcripts
  .command('analyze <call_id>')
  .description('Analyze a call transcript with performance metrics and insights')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., call_id,performance,analysis.summary)')
  .option('--raw', 'Return unmodified API response instead of enriched analysis')
  .option('--hotspots-only', 'Return only conversation hotspots/issues for troubleshooting')
  .option('--latency-threshold <ms>', `Latency threshold in ms for hotspot detection (default: ${DEFAULT_LATENCY_THRESHOLD})`, String(DEFAULT_LATENCY_THRESHOLD))
  .option('--silence-threshold <ms>', `Silence threshold in ms for hotspot detection (default: ${DEFAULT_SILENCE_THRESHOLD})`, String(DEFAULT_SILENCE_THRESHOLD))
  .addHelpText('after', `
Examples:
  $ retell transcripts analyze call_abc123
  $ retell transcripts analyze call_abc123 --fields call_id,performance
  $ retell transcripts analyze call_abc123 --raw
  $ retell transcripts analyze call_abc123 --raw --fields call_id,transcript_object
  $ retell transcripts analyze call_abc123 --hotspots-only
  $ retell transcripts analyze call_abc123 --hotspots-only --latency-threshold 1500
  $ retell transcripts analyze call_abc123 --hotspots-only --fields hotspots
  $ retell transcripts analyze call_abc123 | jq '.performance.latency_p50_ms'
  `)
  .action(async (callId, options) => {
    await analyzeTranscriptCommand(callId, {
      fields: options.fields,
      raw: options.raw,
      hotspotsOnly: options.hotspotsOnly,
      latencyThreshold: options.latencyThreshold ? parseInt(options.latencyThreshold) : undefined,
      silenceThreshold: options.silenceThreshold ? parseInt(options.silenceThreshold) : undefined,
    });
  });

transcripts
  .command('search')
  .description('Search transcripts with advanced filtering')
  .option('--status <status>', 'Filter by call status (error, ended, ongoing)')
  .option('--agent-id <id>', 'Filter by agent ID')
  .option('--since <date>', 'Filter calls after this date (YYYY-MM-DD or ISO format)')
  .option('--until <date>', 'Filter calls before this date (YYYY-MM-DD or ISO format)')
  .option('--limit <number>', 'Maximum number of results (default: 50)', '50')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell transcripts search --status error
  $ retell transcripts search --agent-id agent_123 --since 2025-11-01
  $ retell transcripts search --status error --limit 10
  $ retell transcripts search --status error --fields call_id,agent_id,call_status
  $ retell transcripts search --since 2025-11-01 --until 2025-11-15
  `)
  .action(async (options) => {
    await searchTranscriptsCommand({
      status: options.status,
      agentId: options.agentId,
      since: options.since,
      until: options.until,
      limit: options.limit ? Number(options.limit) : undefined,
      fields: options.fields,
    });
  });

// Agents commands (Phase 4)
const agents = program
  .command('agents')
  .description('Manage agents');

agents
  .command('list')
  .description('List all agents')
  .option('-l, --limit <number>', 'Maximum number of agents to return (default: 100)', '100')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., agent_id,agent_name,response_engine_type)')
  .addHelpText('after', `
Examples:
  $ retell agents list
  $ retell agents list --limit 10
  $ retell agents list --fields agent_id,agent_name
  $ retell agents list | jq '.[] | select(.response_engine.type == "retell-llm")'
  `)
  .action(async (options) => {
    const limit = parseInt(options.limit, 10);
    if (isNaN(limit) || limit < 1) {
      console.error('Error: limit must be a positive number');
      process.exit(1);
    }
    await listAgentsCommand({
      limit,
      fields: options.fields,
    });
  });

agents
  .command('info <agent_id>')
  .description('Get detailed agent information')
  .option('--fields <fields>', 'Comma-separated list of fields to return (e.g., agent_name,response_engine.type,voice_config)')
  .addHelpText('after', `
Examples:
  $ retell agents info agent_123abc
  $ retell agents info agent_123abc --fields agent_name,response_engine.type
  $ retell agents info agent_123abc | jq '.response_engine.type'
  `)
  .action(async (agentId, options) => {
    await agentInfoCommand(agentId, {
      fields: options.fields,
    });
  });

// Prompts commands (Phase 5)
const prompts = program
  .command('prompts')
  .description('Manage agent prompts');

prompts
  .command('pull <agent_id>')
  .description('Download agent prompts to a local file')
  .option('-o, --output <path>', 'Output file path (default: .retell-prompts/<agent_id>.json)', '.retell-prompts')
  .addHelpText('after', `
Examples:
  $ retell prompts pull agent_123abc
  $ retell prompts pull agent_123abc --output my-prompts.json
  `)
  .action(async (agentId, options) => {
    await pullPromptsCommand(agentId, options);
  });

prompts
  .command('diff <agent_id>')
  .description('Show differences between local and remote prompts')
  .option('-s, --source <path>', 'Source directory path (default: .retell-prompts)', '.retell-prompts')
  .option('-f, --fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell prompts diff agent_123abc
  $ retell prompts diff agent_123abc --source ./custom-prompts
  $ retell prompts diff agent_123abc --fields has_changes,changes.general_prompt
  `)
  .action(async (agentId, options) => {
    await diffPromptsCommand(agentId, options);
  });

prompts
  .command('update <agent_id>')
  .description('Update agent prompts from a local file')
  .option('-s, --source <path>', 'Source file path (default: .retell-prompts/<agent_id>.json)', '.retell-prompts')
  .option('--dry-run', 'Preview changes without applying them', false)
  .addHelpText('after', `
Examples:
  $ retell prompts update agent_123abc --source my-prompts.json --dry-run
  $ retell prompts update agent_123abc --source my-prompts.json
  # Remember to publish: retell agent-publish agent_123abc
  `)
  .action(async (agentId, options) => {
    await updatePromptsCommand(agentId, options);
  });

// Agent publish command (Phase 5)
program
  .command('agent-publish <agent_id>')
  .description('Publish a draft agent to make changes live')
  .addHelpText('after', `
Examples:
  $ retell agent-publish agent_123abc
  # Run this after updating prompts to make changes live
  `)
  .action(async (agentId) => {
    await publishAgentCommand(agentId);
  });

// Tools commands
const tools = program
  .command('tools')
  .description('Manage agent tools (custom functions, webhooks, etc.)');

tools
  .command('list <agent_id>')
  .description('List all tools configured for an agent')
  .option('--state <name>', 'Filter by state name (Retell LLM only)')
  .option('--component <id>', 'Filter by component ID (Conversation Flow only)')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tools list agent_123abc
  $ retell tools list agent_123abc --state greeting
  $ retell tools list agent_123abc --fields total_count,general_tools
  `)
  .action(async (agentId, options) => {
    await listToolsCommand(agentId, {
      state: options.state,
      component: options.component,
      fields: options.fields,
    });
  });

tools
  .command('get <agent_id> <tool_name>')
  .description('Get detailed information about a specific tool')
  .option('--state <name>', 'State name to search within (Retell LLM only)')
  .option('--component <id>', 'Component ID to search within (Conversation Flow only)')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tools get agent_123abc lookup_customer
  $ retell tools get agent_123abc book_cal --state booking
  $ retell tools get agent_123abc my_tool --fields tool.name,tool.type
  `)
  .action(async (agentId, toolName, options) => {
    await getToolCommand(agentId, toolName, {
      state: options.state,
      component: options.component,
      fields: options.fields,
    });
  });

tools
  .command('add <agent_id>')
  .description('Add a new tool to an agent')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing tool definition')
  .option('--state <name>', 'Add to specific state (Retell LLM only)')
  .option('--component <id>', 'Add to specific component (Conversation Flow only)')
  .option('--dry-run', 'Preview changes without applying them')
  .addHelpText('after', `
Examples:
  $ retell tools add agent_123abc --file tool.json
  $ retell tools add agent_123abc --file tool.json --state booking
  $ retell tools add agent_123abc --file tool.json --dry-run
  `)
  .action(async (agentId, options) => {
    await addToolCommand(agentId, {
      file: options.file,
      state: options.state,
      component: options.component,
      dryRun: options.dryRun,
    });
  });

tools
  .command('update <agent_id> <tool_name>')
  .description('Update an existing tool')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing updated tool definition')
  .option('--state <name>', 'State where tool exists (Retell LLM only)')
  .option('--component <id>', 'Component where tool exists (Conversation Flow only)')
  .option('--dry-run', 'Preview changes without applying them')
  .addHelpText('after', `
Examples:
  $ retell tools update agent_123abc lookup_customer --file tool.json
  $ retell tools update agent_123abc book_cal --file tool.json --state booking
  $ retell tools update agent_123abc my_tool --file tool.json --dry-run
  `)
  .action(async (agentId, toolName, options) => {
    await updateToolCommand(agentId, toolName, {
      file: options.file,
      state: options.state,
      component: options.component,
      dryRun: options.dryRun,
    });
  });

tools
  .command('remove <agent_id> <tool_name>')
  .description('Remove a tool from an agent')
  .option('--state <name>', 'State where tool exists (Retell LLM only)')
  .option('--component <id>', 'Component where tool exists (Conversation Flow only)')
  .option('--dry-run', 'Preview changes without applying them')
  .addHelpText('after', `
Examples:
  $ retell tools remove agent_123abc lookup_customer
  $ retell tools remove agent_123abc book_cal --state booking
  $ retell tools remove agent_123abc my_tool --dry-run
  `)
  .action(async (agentId, toolName, options) => {
    await removeToolCommand(agentId, toolName, {
      state: options.state,
      component: options.component,
      dryRun: options.dryRun,
    });
  });

tools
  .command('export <agent_id>')
  .description('Export all tools from an agent to a JSON file')
  .option('-o, --output <path>', 'Output file path (prints to stdout if not specified)')
  .addHelpText('after', `
Examples:
  $ retell tools export agent_123abc
  $ retell tools export agent_123abc --output tools.json
  $ retell tools export agent_123abc > tools.json
  `)
  .action(async (agentId, options) => {
    await exportToolsCommand(agentId, {
      output: options.output,
    });
  });

tools
  .command('import <agent_id>')
  .description('Import tools from a JSON file to an agent')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing tools to import')
  .option('--dry-run', 'Preview changes without applying them')
  .option('--replace', 'Replace existing tools with same name instead of skipping')
  .addHelpText('after', `
Examples:
  $ retell tools import agent_123abc --file tools.json
  $ retell tools import agent_123abc --file tools.json --dry-run
  $ retell tools import agent_123abc --file tools.json --replace
  `)
  .action(async (agentId, options) => {
    await importToolsCommand(agentId, {
      file: options.file,
      dryRun: options.dryRun,
      replace: options.replace,
    });
  });

// Tests commands
const tests = program
  .command('tests')
  .description('Manage test cases, batch tests, and test runs');

// Tests cases subcommand group
const testsCases = tests
  .command('cases')
  .description('Manage test case definitions');

testsCases
  .command('list')
  .description('List all test case definitions for an LLM or flow')
  .requiredOption('-t, --type <type>', 'Response engine type (retell-llm or conversation-flow)')
  .option('--llm-id <id>', 'LLM ID (required when type is retell-llm)')
  .option('--flow-id <id>', 'Flow ID (required when type is conversation-flow)')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tests cases list --type retell-llm --llm-id llm_abc123
  $ retell tests cases list --type conversation-flow --flow-id cf_abc123
  $ retell tests cases list --type retell-llm --llm-id llm_abc123 --fields test_case_definitions
  `)
  .action(async (options) => {
    if (options.type !== 'retell-llm' && options.type !== 'conversation-flow') {
      console.error('Error: type must be "retell-llm" or "conversation-flow"');
      process.exit(1);
    }
    await listTestCasesCommand({
      type: options.type,
      llmId: options.llmId,
      flowId: options.flowId,
      fields: options.fields,
    });
  });

testsCases
  .command('get <test_case_definition_id>')
  .description('Get a specific test case definition')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tests cases get tcd_abc123
  $ retell tests cases get tcd_abc123 --fields name,user_prompt
  `)
  .action(async (testCaseDefinitionId, options) => {
    await getTestCaseCommand(testCaseDefinitionId, {
      fields: options.fields,
    });
  });

testsCases
  .command('create')
  .description('Create a new test case definition from a JSON file')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing test case definition')
  .option('--llm-id <id>', 'LLM ID (mutually exclusive with --flow-id)')
  .option('--flow-id <id>', 'Flow ID (mutually exclusive with --llm-id)')
  .option('--version <number>', 'Version of the LLM or flow (optional)')
  .addHelpText('after', `
Examples:
  $ retell tests cases create --file test-case.json --llm-id llm_abc123
  $ retell tests cases create --file test-case.json --flow-id cf_abc123
  $ retell tests cases create --file test-case.json --llm-id llm_abc123 --version 2

Test case JSON format:
  {
    "name": "Greeting Test",
    "user_prompt": "Hello, I need help with my order",
    "scenario": "User is calling about an order issue",
    "metrics": ["response_quality", "task_completion"]
  }
  `)
  .action(async (options) => {
    await createTestCaseCommand({
      file: options.file,
      llmId: options.llmId,
      flowId: options.flowId,
      version: options.version ? parseInt(options.version, 10) : undefined,
    });
  });

testsCases
  .command('update <test_case_definition_id>')
  .description('Update an existing test case definition from a JSON file')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing test case updates')
  .addHelpText('after', `
Examples:
  $ retell tests cases update tcd_abc123 --file test-case.json
  `)
  .action(async (testCaseDefinitionId, options) => {
    await updateTestCaseCommand(testCaseDefinitionId, {
      file: options.file,
    });
  });

testsCases
  .command('delete <test_case_definition_id>')
  .description('Delete a test case definition')
  .addHelpText('after', `
Examples:
  $ retell tests cases delete tcd_abc123
  `)
  .action(async (testCaseDefinitionId) => {
    await deleteTestCaseCommand(testCaseDefinitionId);
  });

// Tests batch subcommand group
const testsBatch = tests
  .command('batch')
  .description('Manage batch tests');

testsBatch
  .command('list')
  .description('List all batch tests for an LLM or flow')
  .requiredOption('-t, --type <type>', 'Response engine type (retell-llm or conversation-flow)')
  .option('--llm-id <id>', 'LLM ID (required when type is retell-llm)')
  .option('--flow-id <id>', 'Flow ID (required when type is conversation-flow)')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tests batch list --type retell-llm --llm-id llm_abc123
  $ retell tests batch list --type conversation-flow --flow-id cf_abc123
  $ retell tests batch list --type retell-llm --llm-id llm_abc123 --fields batch_tests
  `)
  .action(async (options) => {
    if (options.type !== 'retell-llm' && options.type !== 'conversation-flow') {
      console.error('Error: type must be "retell-llm" or "conversation-flow"');
      process.exit(1);
    }
    await listBatchTestsCommand({
      type: options.type,
      llmId: options.llmId,
      flowId: options.flowId,
      fields: options.fields,
    });
  });

testsBatch
  .command('get <batch_job_id>')
  .description('Get a specific batch test with its status and stats')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tests batch get bjj_abc123
  $ retell tests batch get bjj_abc123 --fields status,stats
  `)
  .action(async (batchJobId, options) => {
    await getBatchTestCommand(batchJobId, {
      fields: options.fields,
    });
  });

testsBatch
  .command('create')
  .description('Create a new batch test with specified test case definitions')
  .option('--llm-id <id>', 'LLM ID (mutually exclusive with --flow-id)')
  .option('--flow-id <id>', 'Flow ID (mutually exclusive with --llm-id)')
  .requiredOption('--cases <ids>', 'Comma-separated list of test case definition IDs')
  .option('--version <number>', 'Version of the LLM or flow (optional)')
  .addHelpText('after', `
Examples:
  $ retell tests batch create --llm-id llm_abc123 --cases tcd_xxx,tcd_yyy,tcd_zzz
  $ retell tests batch create --flow-id cf_abc123 --cases tcd_xxx,tcd_yyy
  $ retell tests batch create --llm-id llm_abc123 --cases tcd_xxx --version 2
  `)
  .action(async (options) => {
    await createBatchTestCommand({
      llmId: options.llmId,
      flowId: options.flowId,
      cases: options.cases,
      version: options.version ? parseInt(options.version, 10) : undefined,
    });
  });

// Tests runs subcommand group
const testsRuns = tests
  .command('runs')
  .description('View test run results');

testsRuns
  .command('list <batch_job_id>')
  .description('List all test runs for a batch test')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tests runs list bjj_abc123
  $ retell tests runs list bjj_abc123 --fields test_runs
  `)
  .action(async (batchJobId, options) => {
    await listTestRunsCommand(batchJobId, {
      fields: options.fields,
    });
  });

testsRuns
  .command('get <test_run_id>')
  .description('Get a specific test run result')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell tests runs get tcj_abc123
  $ retell tests runs get tcj_abc123 --fields status,metric_results
  `)
  .action(async (testRunId, options) => {
    await getTestRunCommand(testRunId, {
      fields: options.fields,
    });
  });

// Knowledge Base commands
const kb = program
  .command('kb')
  .description('Manage RAG knowledge bases');

kb
  .command('list')
  .description('List all knowledge bases')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell kb list
  $ retell kb list --fields knowledge_base_id,knowledge_base_name,status
  `)
  .action(async (options) => {
    await listKnowledgeBasesCommand({
      fields: options.fields,
    });
  });

kb
  .command('get <knowledge_base_id>')
  .description('Get a specific knowledge base')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell kb get kb_abc123
  $ retell kb get kb_abc123 --fields knowledge_base_name,status,knowledge_base_sources
  `)
  .action(async (knowledgeBaseId, options) => {
    await getKnowledgeBaseCommand(knowledgeBaseId, {
      fields: options.fields,
    });
  });

kb
  .command('create')
  .description('Create a new knowledge base')
  .requiredOption('-n, --name <name>', 'Knowledge base name (max 40 characters)')
  .option('--urls <urls>', 'Comma-separated list of URLs to scrape')
  .option('--texts <file>', 'Path to JSON file with text entries [{ title, text }, ...]')
  .option('--auto-refresh', 'Enable 12-hour automatic refresh for URL sources')
  .addHelpText('after', `
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
  `)
  .action(async (options) => {
    await createKnowledgeBaseCommand({
      name: options.name,
      urls: options.urls,
      texts: options.texts,
      autoRefresh: options.autoRefresh,
    });
  });

kb
  .command('delete <knowledge_base_id>')
  .description('Delete a knowledge base')
  .addHelpText('after', `
Examples:
  $ retell kb delete kb_abc123
  `)
  .action(async (knowledgeBaseId) => {
    await deleteKnowledgeBaseCommand(knowledgeBaseId);
  });

// Knowledge Base sources subcommand group
const kbSources = kb
  .command('sources')
  .description('Manage knowledge base sources');

kbSources
  .command('add <knowledge_base_id>')
  .description('Add sources to an existing knowledge base')
  .option('--urls <urls>', 'Comma-separated list of URLs to scrape')
  .option('--texts <file>', 'Path to JSON file with text entries [{ title, text }, ...]')
  .addHelpText('after', `
Examples:
  $ retell kb sources add kb_abc123 --urls https://docs.example.com/new
  $ retell kb sources add kb_abc123 --texts additional-texts.json
  $ retell kb sources add kb_abc123 --urls https://faq.example.com --texts more-texts.json
  `)
  .action(async (knowledgeBaseId, options) => {
    await addKnowledgeBaseSourcesCommand(knowledgeBaseId, {
      urls: options.urls,
      texts: options.texts,
    });
  });

kbSources
  .command('delete <knowledge_base_id> <source_id>')
  .description('Remove a source from a knowledge base')
  .addHelpText('after', `
Examples:
  $ retell kb sources delete kb_abc123 source_xyz789
  `)
  .action(async (knowledgeBaseId, sourceId) => {
    await deleteKnowledgeBaseSourceCommand(knowledgeBaseId, sourceId);
  });

// Conversation Flow commands
const flows = program
  .command('flows')
  .description('Manage conversation flow response engines');

flows
  .command('list')
  .description('List all conversation flows')
  .option('-l, --limit <number>', 'Maximum number of flows to return (default: 100, max: 1000)', '100')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell flows list
  $ retell flows list --limit 50
  $ retell flows list --fields conversation_flow_id,version,start_speaker
  `)
  .action(async (options) => {
    const limit = parseInt(options.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      console.error('Error: limit must be a positive number between 1 and 1000');
      process.exit(1);
    }
    await listFlowsCommand({
      limit,
      fields: options.fields,
    });
  });

flows
  .command('get <conversation_flow_id>')
  .description('Get a specific conversation flow')
  .option('--version <number>', 'Specific version to retrieve (defaults to latest)')
  .option('--fields <fields>', 'Comma-separated list of fields to return')
  .addHelpText('after', `
Examples:
  $ retell flows get cf_abc123
  $ retell flows get cf_abc123 --version 2
  $ retell flows get cf_abc123 --fields conversation_flow_id,nodes,edges
  `)
  .action(async (conversationFlowId, options) => {
    await getFlowCommand(conversationFlowId, {
      version: options.version ? parseInt(options.version, 10) : undefined,
      fields: options.fields,
    });
  });

flows
  .command('create')
  .description('Create a new conversation flow from a JSON file')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing flow configuration')
  .addHelpText('after', `
Examples:
  $ retell flows create --file flow.json

Flow JSON format (minimal):
  {
    "start_speaker": "agent",
    "start_node_id": "node_1",
    "nodes": [...],
    "edges": [...]
  }
  `)
  .action(async (options) => {
    await createFlowCommand({
      file: options.file,
    });
  });

flows
  .command('update <conversation_flow_id>')
  .description('Update an existing conversation flow from a JSON file')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing flow updates')
  .option('--version <number>', 'Specific version to update (defaults to latest)')
  .addHelpText('after', `
Examples:
  $ retell flows update cf_abc123 --file updates.json
  $ retell flows update cf_abc123 --file updates.json --version 2
  `)
  .action(async (conversationFlowId, options) => {
    await updateFlowCommand(conversationFlowId, {
      file: options.file,
      version: options.version ? parseInt(options.version, 10) : undefined,
    });
  });

flows
  .command('delete <conversation_flow_id>')
  .description('Delete a conversation flow')
  .addHelpText('after', `
Examples:
  $ retell flows delete cf_abc123
  `)
  .action(async (conversationFlowId) => {
    await deleteFlowCommand(conversationFlowId);
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
