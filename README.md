# Retell AI CLI

[![npm version](https://badge.fury.io/js/retell-cli.svg)](https://www.npmjs.com/package/retell-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Community-built command-line tool for Retell AI - designed to give AI assistants efficient access to transcripts, agents, and prompts without using context-expensive MCP servers.

## Features

- **Transcript Management** - List, retrieve, and analyze call transcripts
- **Agent Management** - View and configure Retell AI agents
- **Prompt Engineering** - Pull, edit, and update agent prompts
- **Tool Management** - Full CRUD for agent tools (webhooks, custom functions, etc.)
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
retell prompts pull agent_123abc

# Edit .retell-prompts/agent_123abc/general_prompt.md with your changes

# Check what changed
retell prompts diff agent_123abc

# Dry run to preview changes
retell prompts update agent_123abc --dry-run

# Apply changes
retell prompts update agent_123abc

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

#### `retell prompts diff <agent_id> [options]`

Show differences between local and remote prompts before applying updates.

**Options:**
- `-s, --source <path>` - Source directory path (default: `.retell-prompts`)
- `-f, --fields <fields>` - Comma-separated list of fields to return

**Examples:**
```bash
# Compare local and remote prompts
retell prompts diff agent_123abc

# Use custom source directory
retell prompts diff agent_123abc --source ./custom-prompts

# Show only specific fields
retell prompts diff agent_123abc --fields has_changes,changes.general_prompt
```

**Output:**
```json
{
  "agent_id": "agent_123abc",
  "agent_type": "retell-llm",
  "has_changes": true,
  "changes": {
    "general_prompt": {
      "old": "You are a helpful assistant...",
      "new": "You are a helpful assistant specializing in...",
      "change_type": "modified"
    }
  }
}
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

### Agent Configuration

Manage agent-level settings that aren't part of prompts (voice, webhooks, post-call analysis, etc.).

#### `retell agent get <agent_id> [options]`

Get agent configuration including all agent-level settings.

**Options:**
- `--version <number>` - Specific version to retrieve (defaults to latest)
- `--fields <fields>` - Comma-separated list of fields to return

**Examples:**
```bash
# Get full agent config
retell agent get agent_123abc

# Get specific version
retell agent get agent_123abc --version 2

# Get specific fields only
retell agent get agent_123abc --fields agent_name,post_call_analysis_data

# Save config to file for editing
retell agent get agent_123abc > config.json
```

#### `retell agent update <agent_id> [options]`

Update agent configuration from a JSON file. This is useful for updating agent-level fields that aren't accessible through `prompts update`, such as:
- `post_call_analysis_data` - Custom data extraction from calls
- `post_call_analysis_model` - Model for analysis
- `analysis_successful_prompt` - Success criteria prompt
- `analysis_summary_prompt` - Summary generation prompt
- Voice settings, language, webhooks, and more

**Options:**
- `-f, --file <path>` - Path to JSON file containing agent configuration updates (required)
- `--dry-run` - Preview changes without applying them
- `--version <number>` - Specific version to update (defaults to latest draft)

**Example JSON for post-call analysis:**
```json
{
  "post_call_analysis_model": "claude-4.5-sonnet",
  "post_call_analysis_data": [
    {
      "name": "call_outcome",
      "type": "enum",
      "description": "Result of the call",
      "choices": ["successful", "unsuccessful", "callback_needed"]
    },
    {
      "name": "customer_sentiment",
      "type": "string",
      "description": "Overall customer sentiment"
    }
  ],
  "analysis_successful_prompt": "Determine if the issue was resolved.",
  "analysis_summary_prompt": "Summarize the call in 2 sentences."
}
```

**Examples:**
```bash
# Preview changes first (recommended)
retell agent update agent_123abc --file config.json --dry-run

# Apply changes
retell agent update agent_123abc --file config.json

# Remember to publish after updating
retell agent-publish agent_123abc
```

### Tools

Manage agent tools (custom functions, webhooks, etc.). Tools are embedded within Retell LLM and Conversation Flow configurations.

#### `retell tools list <agent_id> [options]`

List all tools configured for an agent.

**Options:**
- `--state <name>` - Filter by state name (Retell LLM only)
- `--component <id>` - Filter by component ID (Conversation Flow only)
- `--fields <fields>` - Comma-separated list of fields to return

**Examples:**
```bash
# List all tools
retell tools list agent_123abc

# Filter by state (Retell LLM)
retell tools list agent_123abc --state greeting

# Show only total count
retell tools list agent_123abc --fields total_count,general_tools
```

#### `retell tools get <agent_id> <tool_name> [options]`

Get detailed information about a specific tool.

**Options:**
- `--state <name>` - State name to search within (Retell LLM only)
- `--component <id>` - Component ID to search within (Conversation Flow only)
- `--fields <fields>` - Comma-separated list of fields to return

**Example:**
```bash
retell tools get agent_123abc lookup_customer
```

#### `retell tools add <agent_id> [options]`

Add a new tool to an agent from a JSON file.

**Options:**
- `-f, --file <path>` - Path to JSON file containing tool definition (required)
- `--state <name>` - Add to specific state (Retell LLM only)
- `--component <id>` - Add to specific component (Conversation Flow only)
- `--dry-run` - Preview changes without applying them

**Example tool.json:**
```json
{
  "name": "lookup_customer",
  "type": "custom",
  "description": "Look up customer information in CRM",
  "url": "https://api.example.com/customers/lookup",
  "method": "POST",
  "speak_after_execution": true,
  "parameters": {
    "type": "object",
    "properties": {
      "phone_number": { "type": "string", "description": "Customer phone" }
    },
    "required": ["phone_number"]
  }
}
```

**Examples:**
```bash
# Add to general tools
retell tools add agent_123abc --file tool.json

# Add to specific state
retell tools add agent_123abc --file tool.json --state booking

# Preview changes first
retell tools add agent_123abc --file tool.json --dry-run
```

#### `retell tools update <agent_id> <tool_name> [options]`

Update an existing tool with a new definition.

**Options:**
- `-f, --file <path>` - Path to JSON file containing updated tool definition (required)
- `--state <name>` - State where tool exists (Retell LLM only)
- `--component <id>` - Component where tool exists (Conversation Flow only)
- `--dry-run` - Preview changes without applying them

**Example:**
```bash
retell tools update agent_123abc lookup_customer --file updated-tool.json
```

#### `retell tools remove <agent_id> <tool_name> [options]`

Remove a tool from an agent.

**Options:**
- `--state <name>` - State where tool exists (Retell LLM only)
- `--component <id>` - Component where tool exists (Conversation Flow only)
- `--dry-run` - Preview changes without applying them

**Examples:**
```bash
# Remove from general tools
retell tools remove agent_123abc lookup_customer

# Remove from specific state
retell tools remove agent_123abc book_cal --state booking

# Preview removal
retell tools remove agent_123abc my_tool --dry-run
```

#### `retell tools export <agent_id> [options]`

Export all tools from an agent to a JSON file.

**Options:**
- `-o, --output <path>` - Output file path (prints to stdout if not specified)

**Examples:**
```bash
# Export to stdout
retell tools export agent_123abc

# Export to file
retell tools export agent_123abc --output tools.json
```

#### `retell tools import <agent_id> [options]`

Import tools from a JSON file to an agent.

**Options:**
- `-f, --file <path>` - Path to JSON file containing tools to import (required)
- `--dry-run` - Preview changes without applying them
- `--replace` - Replace existing tools with same name instead of skipping

**Examples:**
```bash
# Import tools
retell tools import agent_123abc --file tools.json

# Preview import
retell tools import agent_123abc --file tools.json --dry-run

# Replace existing tools
retell tools import agent_123abc --file tools.json --replace
```

**Important:** After modifying tools, remember to publish the agent:
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
- Tools commands (`list`, `get`)

**Features:**
- Dot notation for nested fields (e.g., `metadata.duration`)
- Works with arrays
- Reduces token usage by 50-90% for AI workflows
- Backward compatible (no --fields = full output)

### Raw Output Mode

Get the unmodified API response instead of enriched analysis:

```bash
# Raw API response (useful for debugging)
retell transcripts analyze abc123 --raw

# Combine with field selection for minimal output
retell transcripts analyze abc123 --raw --fields call_id,transcript_object

# Compare raw vs enriched
retell transcripts analyze abc123 --raw > raw.json
retell transcripts analyze abc123 > enriched.json
diff raw.json enriched.json
```

**When to use:**
- Debugging issues with API responses
- When tools expect the official Retell API schema
- Accessing new API fields before CLI enrichment support
- Comparing raw data to enriched output for validation

**Supported commands:**
- `transcripts analyze` - returns the raw [Call Object](https://docs.retellai.com/api-references/retrieve-call) exactly as documented in the Retell API reference

**Note:** The `--raw` flag works seamlessly with `--fields` for precise data extraction. Raw output returns the official Retell API schema, allowing you to access all fields documented in the [API reference](https://docs.retellai.com/api-references/list-calls).

### Hotspot Detection

Identify conversation issues for focused troubleshooting:

```bash
# Find all issues in a call
retell transcripts analyze abc123 --hotspots-only

# Combine with field selection
retell transcripts analyze abc123 --hotspots-only --fields hotspots

# Set custom thresholds
retell transcripts analyze abc123 --hotspots-only --latency-threshold 1500
retell transcripts analyze abc123 --hotspots-only --silence-threshold 3000
```

**Detected issues:**
- **Latency spikes** - When p90 latency exceeds threshold (default: 2000ms)
- **Long silences** - Gaps between turns exceeding threshold (default: 5000ms)
- **Sentiment** - Negative sentiment indicators

**Use cases:**
- Rapid troubleshooting of failed calls
- Prompt iteration and refinement
- Performance monitoring across calls
- AI agent workflow optimization

**Note:** The `--hotspots-only` flag works seamlessly with `--fields` for token efficiency.

### Search Transcripts

Find calls with advanced filtering - no need for jq or grep:

```bash
# Find all error calls
retell transcripts search --status error

# Find calls for specific agent in date range
retell transcripts search \
  --agent-id agent_123 \
  --since 2025-11-01 \
  --until 2025-11-15

# Combine multiple filters
retell transcripts search \
  --status error \
  --agent-id agent_123 \
  --since 2025-11-01 \
  --limit 20

# Use field selection for minimal output
retell transcripts search \
  --status error \
  --fields call_id,call_status,agent_id
```

**Available filters:**
- `--status` - Call status (error, ended, ongoing)
- `--agent-id` - Filter by agent
- `--since` - Calls after date (YYYY-MM-DD or ISO format)
- `--until` - Calls before date (YYYY-MM-DD or ISO format)
- `--limit` - Max results (default: 50)
- `--fields` - Select specific fields (from Phase 2)

**AI Agent Workflow Example:**
```bash
# 1. Find all recent error calls
retell transcripts search --status error --since 2025-11-08 --fields call_id

# 2. For each call, get hotspots
retell transcripts analyze <call_id> --hotspots-only

# 3. No jq or grep needed - direct JSON parsing!
```

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

**This CLI was specifically designed for AI assistants** to access Retell AI efficiently without the token overhead of MCP servers. All commands output JSON by default, making it perfect for Claude Code, Cursor, Aider, and other AI coding assistants.

### Why This Tool Exists

Traditional MCP (Model Context Protocol) servers can consume significant context windows when working with Retell AI data. This CLI provides a lightweight, token-efficient alternative that:

- **Reduces token usage by 50-90%** with field selection (`--fields`)
- **Provides structured JSON output** for easy parsing
- **Offers hotspot detection** for focused troubleshooting
- **Enables safe prompt updates** with diff and dry-run features
- **Works across all shells** (bash, zsh, fish) for maximum compatibility

### Example AI Workflow

```bash
# AI agent lists all calls and finds issues
retell transcripts list | jq '.[] | select(.call_status == "error")'

# AI analyzes a problematic call
retell transcripts analyze call_123

# AI pulls current prompts
retell prompts pull agent_456

# AI reads and suggests improvements to prompts
# (Edits .retell-prompts/agent_456/general_prompt.md)

# AI shows what changed
retell prompts diff agent_456

# AI explains the changes and uses dry-run to verify
retell prompts update agent_456 --dry-run

# Apply changes
retell prompts update agent_456
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

Built by the community for AI-assisted Retell AI development. Not affiliated with or endorsed by Retell AI.
