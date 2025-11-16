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
  .action(async (callId) => {
    await getTranscriptCommand(callId);
  });

transcripts
  .command('analyze <call_id>')
  .description('Analyze a call transcript')
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
  .option('-l, --limit <number>', 'Maximum number of agents to return', '100')
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
  .description('Get agent information')
  .action(async (agentId) => {
    await agentInfoCommand(agentId);
  });

// Prompts commands (Phase 5)
const prompts = program
  .command('prompts')
  .description('Manage agent prompts');

prompts
  .command('pull <agent_id>')
  .description('Pull prompts for an agent')
  .option('-o, --output <dir>', 'Output directory', '.retell-prompts')
  .action(async (agentId, options) => {
    await pullPromptsCommand(agentId, options);
  });

prompts
  .command('update <agent_id>')
  .description('Update prompts for an agent')
  .option('-s, --source <dir>', 'Source directory', '.retell-prompts')
  .action(async (agentId, options) => {
    await updatePromptsCommand(agentId, options);
  });

// Agent publish command (Phase 5)
program
  .command('agent-publish <agent_id>')
  .description('Publish an agent')
  .action(async (agentId) => {
    await publishAgentCommand(agentId);
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
