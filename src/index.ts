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
import { analyzeTranscriptCommand } from './commands/transcripts/analyze';
import { listAgentsCommand } from './commands/agents/list';
import { agentInfoCommand } from './commands/agents/info';
import { pullPromptsCommand } from './commands/prompts/pull';
import { updatePromptsCommand } from './commands/prompts/update';
import { publishAgentCommand } from './commands/agent/publish';

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
  .addHelpText('after', `
Examples:
  $ retell transcripts list
  $ retell transcripts list --limit 100
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
    });
  });

transcripts
  .command('get <call_id>')
  .description('Get a specific call transcript')
  .addHelpText('after', `
Examples:
  $ retell transcripts get call_abc123
  $ retell transcripts get call_abc123 | jq '.transcript_object'
  `)
  .action(async (callId) => {
    await getTranscriptCommand(callId);
  });

transcripts
  .command('analyze <call_id>')
  .description('Analyze a call transcript with performance metrics and insights')
  .addHelpText('after', `
Examples:
  $ retell transcripts analyze call_abc123
  $ retell transcripts analyze call_abc123 | jq '.performance.latency_p50_ms'
  `)
  .action(async (callId) => {
    await analyzeTranscriptCommand(callId);
  });

// Agents commands (Phase 4)
const agents = program
  .command('agents')
  .description('Manage agents');

agents
  .command('list')
  .description('List all agents')
  .option('-l, --limit <number>', 'Maximum number of agents to return (default: 100)', '100')
  .addHelpText('after', `
Examples:
  $ retell agents list
  $ retell agents list --limit 10
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
    });
  });

agents
  .command('info <agent_id>')
  .description('Get detailed agent information')
  .addHelpText('after', `
Examples:
  $ retell agents info agent_123abc
  $ retell agents info agent_123abc | jq '.response_engine.type'
  `)
  .action(async (agentId) => {
    await agentInfoCommand(agentId);
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

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
