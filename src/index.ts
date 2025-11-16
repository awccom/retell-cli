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
    await listTranscriptsCommand({
      limit: parseInt(options.limit, 10),
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
  .action(() => {
    console.log('Agents list command - to be implemented in Phase 4');
    process.exit(0);
  });

agents
  .command('info <agent_id>')
  .description('Get agent information')
  .action((agentId) => {
    console.log(`Agents info command for ${agentId} - to be implemented in Phase 4`);
    process.exit(0);
  });

// Prompts commands (Phase 5)
const prompts = program
  .command('prompts')
  .description('Manage agent prompts');

prompts
  .command('pull <agent_id>')
  .description('Pull prompts for an agent')
  .action((agentId) => {
    console.log(`Prompts pull command for ${agentId} - to be implemented in Phase 5`);
    process.exit(0);
  });

prompts
  .command('update <agent_id>')
  .description('Update prompts for an agent')
  .action((agentId) => {
    console.log(`Prompts update command for ${agentId} - to be implemented in Phase 5`);
    process.exit(0);
  });

// Agent publish command (Phase 5)
program
  .command('agent-publish <agent_id>')
  .description('Publish an agent')
  .action((agentId) => {
    console.log(`Agent publish command for ${agentId} - to be implemented in Phase 5`);
    process.exit(0);
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
