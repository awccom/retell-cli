# Retell AI CLI

[![npm version](https://badge.fury.io/js/retell-cli.svg)](https://www.npmjs.com/package/retell-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official command-line tool for Retell AI - analyze call transcripts and manage agent prompts.

## Features

- **Transcript Management** - List, retrieve, and analyze call transcripts
- **Agent Management** - View and configure Retell AI agents
- **Prompt Engineering** - Pull, edit, and update agent prompts
- **Multi-format Support** - Works with Retell LLM and Conversation Flows
- **AI-Friendly** - JSON output by default for AI coding assistants
- **Cross-Shell** - Works in bash, fish, zsh, and more

## Installation

```bash
npm install -g retell-cli
```

Or use directly with npx (no installation required):

```bash
npx retell-cli@latest --help
```

## Quick Start

### 1. Authenticate

```bash
retell login
# Enter your Retell API key when prompted
```

Your API key will be saved to `.retellrc.json` in the current directory.

### 2. List Your Agents

```bash
retell agents list
```

**Output:**
```json
[
  {
    "agent_id": "agent_123abc",
    "agent_name": "Customer Support Bot",
    "response_engine": {
      "type": "retell-llm"
    }
  }
]
```

### 3. Analyze a Call Transcript

```bash
# List recent calls
retell transcripts list --limit 10

# Analyze a specific call
retell transcripts analyze call_abc123
```

**Output:**
```json
{
  "call_id": "call_abc123",
  "metadata": {
    "status": "ended",
    "duration_ms": 45000,
    "agent_name": "Customer Support Bot"
  },
  "analysis": {
    "summary": "Customer inquired about product pricing",
    "sentiment": "positive",
    "successful": true
  },
  "performance": {
    "latency_p50_ms": {
      "e2e": 500,
      "llm": 200,
      "tts": 100
    }
  }
}
```

### 4. Manage Agent Prompts

```bash
# Pull current prompts
retell prompts pull agent_123abc --output prompts.json

# Edit prompts.json with your changes

# Update agent with new prompts (dry run first)
retell prompts update agent_123abc --source prompts.json --dry-run

# Apply changes
retell prompts update agent_123abc --source prompts.json

# Publish the updated agent
retell agent-publish agent_123abc
```

## Authentication

The CLI supports three authentication methods (in order of precedence):

### 1. Environment Variable (Best for CI/CD)

```bash
export RETELL_API_KEY=your_api_key_here
retell agents list
```

### 2. Local Config File (Best for Development)

```bash
retell login
# Creates .retellrc.json in current directory
```

The config file format:
```json
{
  "apiKey": "your_api_key_here"
}
```

### 3. Per-Command Override

```bash
RETELL_API_KEY=key_abc123 retell agents list
```

**Note for Fish shell users:**
```fish
env RETELL_API_KEY=key_abc123 retell agents list
```

## Command Reference

### Authentication

#### `retell login`

Save your API key to a local config file.

```bash
retell login
# Prompts: Enter your Retell API key:
```

### Transcripts

#### `retell transcripts list [options]`

List call transcripts with optional filtering.

**Options:**
- `-l, --limit <number>` - Maximum number of calls to return (default: 50)

**Examples:**
```bash
# List recent calls
retell transcripts list

# List up to 100 calls
retell transcripts list --limit 100
```

#### `retell transcripts get <call_id>`

Get detailed information about a specific call.

**Example:**
```bash
retell transcripts get call_abc123
```

#### `retell transcripts analyze <call_id>`

Analyze a call transcript with structured insights including sentiment, performance metrics, and cost breakdown.

**Example:**
```bash
retell transcripts analyze call_abc123
```

### Agents

#### `retell agents list [options]`

List all agents in your account.

**Options:**
- `-l, --limit <number>` - Maximum number of agents to return (default: 100)

**Example:**
```bash
retell agents list
```

#### `retell agents info <agent_id>`

Get detailed information about a specific agent.

**Example:**
```bash
retell agents info agent_123abc
```

### Prompts

#### `retell prompts pull <agent_id> [options]`

Download agent prompts to a local file.

**Options:**
- `-o, --output <path>` - Output file path (default: `.retell-prompts/<agent_id>.json`)

**Examples:**
```bash
# Pull to default location
retell prompts pull agent_123abc

# Pull to specific file
retell prompts pull agent_123abc --output my-prompts.json
```

#### `retell prompts update <agent_id> [options]`

Update agent prompts from a local file.

**Options:**
- `-s, --source <path>` - Source file path (default: `.retell-prompts/<agent_id>.json`)
- `--dry-run` - Preview changes without applying them

**Examples:**
```bash
# Dry run first (recommended)
retell prompts update agent_123abc --source my-prompts.json --dry-run

# Apply changes
retell prompts update agent_123abc --source my-prompts.json
```

**Important:** After updating prompts, remember to publish the agent:
```bash
retell agent-publish agent_123abc
```

#### `retell agent-publish <agent_id>`

Publish a draft agent to make changes live.

**Example:**
```bash
retell agent-publish agent_123abc
```

### Field Selection

Reduce output size and token usage by selecting specific fields:

```bash
# Get only call_id and status
retell transcripts list --fields call_id,call_status

# Select nested fields with dot notation
retell transcripts get abc123 --fields metadata.duration,analysis.summary

# Combine with other options
retell agents list --limit 10 --fields agent_id,agent_name
```

**Supported commands:**
- All transcript commands (`list`, `get`, `analyze`)
- All agent commands (`list`, `info`)

**Features:**
- Dot notation for nested fields (e.g., `metadata.duration`)
- Works with arrays
- Reduces token usage by 50-90% for AI workflows
- Backward compatible (no --fields = full output)

## Common Workflows

### Analyzing Failed Calls

```bash
# List recent calls (look for error status)
retell transcripts list --limit 50 > calls.json

# Filter for failed calls (using jq)
jq '.[] | select(.call_status == "error")' calls.json

# Analyze each failed call
retell transcripts analyze call_xyz789
```

### Bulk Prompt Updates

```bash
# Pull prompts for all agents
for agent_id in $(retell agents list | jq -r '.[].agent_id'); do
  retell prompts pull $agent_id --output "prompts-${agent_id}.json"
done

# ... edit prompt files ...

# Update all agents
for file in prompts-*.json; do
  agent_id=$(echo $file | sed 's/prompts-//;s/.json//')
  retell prompts update $agent_id --source $file
  retell agent-publish $agent_id
done
```

### Daily Performance Monitoring

```bash
#!/bin/bash
# Save as: daily-report.sh

# Get all calls from today
retell transcripts list --limit 100 > today-calls.json

# Analyze each call and save report
for call_id in $(jq -r '.[].call_id' today-calls.json); do
  retell transcripts analyze $call_id > "analysis-${call_id}.json"
done

# Generate summary report (using jq)
echo "Performance Summary:"
jq -s '[.[] | .performance.latency_p50_ms.e2e] | add / length' analysis-*.json
```

## For AI Agents

All commands output JSON by default, making this CLI perfect for AI coding assistants like Claude Code, Cursor, and GitHub Copilot.

### Example AI Workflow

```bash
# AI agent lists all calls and finds issues
retell transcripts list | jq '.[] | select(.call_status == "error")'

# AI analyzes a problematic call
retell transcripts analyze call_123

# AI pulls current prompts
retell prompts pull agent_456 --output current-prompts.json

# AI reads and suggests improvements to prompts
# Then updates with improved version
retell prompts update agent_456 --source improved-prompts.json --dry-run
retell prompts update agent_456 --source improved-prompts.json
retell agent-publish agent_456
```

### Error Format

All errors are returned as JSON for easy parsing:

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

**Common error codes:**
- `AUTHENTICATION_ERROR` - Invalid API key
- `NOT_FOUND` - Resource not found
- `CUSTOM_LLM_ERROR` - Cannot manage custom LLM agents
- `TYPE_MISMATCH` - Prompt file type doesn't match agent type

## Troubleshooting

### "API key is missing or invalid"

**Solution:**
1. Run `retell login` to set up authentication
2. Or set `RETELL_API_KEY` environment variable
3. Verify your API key in the [Retell dashboard](https://app.retellai.com)

### "Cannot manage custom LLM agents"

**Cause:** Custom LLM agents use external WebSocket connections and cannot be managed via the API.

**Solution:** Use the [Retell dashboard](https://app.retellai.com) to manage custom LLM agents.

### "Type mismatch" error

**Cause:** The prompt file type must match the agent's response engine type.

**Solution:** Check your agent type:
```bash
retell agents info <agent_id> | jq '.response_engine.type'
```

Ensure your prompt file has the correct type:
- `retell-llm` - For Retell LLM agents
- `conversation-flow` - For Conversation Flow agents

### Permission denied on config file

**Cause:** The CLI creates `.retellrc.json` with restricted permissions (0600) for security.

**Solution:** Check file ownership and permissions:
```bash
ls -la .retellrc.json
# Should show: -rw------- (readable/writable by owner only)
```

### Command not found after installation

**Solution:** Ensure npm global bin directory is in your PATH:
```bash
npm config get prefix
# Add this path to your PATH environment variable
```

For npm global installs:
```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

## Development

Want to contribute or run the CLI locally? See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

```bash
# Clone the repository
git clone https://github.com/awccom/retell-cli.git
cd retell-cli

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link for local development
npm link
retell --version
```

## Shell Compatibility

The Retell CLI is fully compatible with:
- **Bash** (GNU Bash 5.x)
- **Zsh** (5.x)
- **Fish** (3.x)

See [docs/shell-compatibility.md](docs/shell-compatibility.md) for detailed test results.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Resources

- [Documentation](https://docs.retellai.com)
- [User Guide](docs/user-guide.md)
- [GitHub Issues](https://github.com/awccom/retell-cli/issues)
- [Retell AI Dashboard](https://app.retellai.com)
- [Retell AI API Docs](https://docs.retellai.com/api-references/overview)

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [User Guide](docs/user-guide.md)
3. Search [existing issues](https://github.com/awccom/retell-cli/issues)
4. Open a [new issue](https://github.com/awccom/retell-cli/issues/new)

---

Built with by the Retell AI community.
