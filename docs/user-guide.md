# Retell AI CLI - User Guide

Complete guide to using the Retell AI CLI for transcript analysis and prompt management.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Command Reference](#command-reference)
  - [Login](#login)
  - [Transcripts](#transcripts)
  - [Agents](#agents)
  - [Prompts](#prompts)
- [Workflows](#workflows)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Installation

### Global Installation

Install the CLI globally to use it from anywhere:

```bash
npm install -g retell-cli
```

Verify installation:

```bash
retell --version
# Output: 1.0.0
```

### Using npx (No Installation)

Use the CLI without installing it:

```bash
npx retell-cli@latest agents list
```

### From Source

For development or contributing:

```bash
git clone https://github.com/awccom/retell-cli.git
cd retell-cli
npm install
npm run build
npm link
```

## Authentication

The CLI requires a Retell API key to interact with your account. There are three ways to provide your API key.

### Method 1: Login Command (Recommended)

Save your API key to a local config file:

```bash
retell login
# Prompts: Enter your Retell API key:
```

This creates a `.retellrc.json` file in the current directory:

```json
{
  "apiKey": "your_api_key_here"
}
```

**Security Note:** The config file is created with permissions `0600` (readable/writable by owner only).

### Method 2: Environment Variable

Set the API key as an environment variable:

```bash
# Bash/Zsh
export RETELL_API_KEY=your_api_key_here
retell agents list

# Fish
set -x RETELL_API_KEY your_api_key_here
retell agents list
```

**For CI/CD pipelines:**

```yaml
# GitHub Actions example
env:
  RETELL_API_KEY: ${{ secrets.RETELL_API_KEY }}

steps:
  - name: Analyze calls
    run: retell transcripts list
```

### Method 3: Per-Command Override

Provide the API key for a single command:

```bash
# Bash/Zsh
RETELL_API_KEY=key_123 retell agents list

# Fish
env RETELL_API_KEY=key_123 retell agents list
```

### Precedence

The CLI checks for API keys in this order:
1. Environment variable (`RETELL_API_KEY`)
2. Local config file (`.retellrc.json`)

If no API key is found, you'll see:
```json
{
  "error": "API key is missing. Run 'retell login' or set RETELL_API_KEY environment variable."
}
```

## Command Reference

### Login

**Command:** `retell login`

**Description:** Authenticate with Retell AI by saving your API key to a local config file.

**Usage:**

```bash
retell login
```

**Interactive Prompt:**

```
Enter your Retell API key: ************************************
✓ API key saved to .retellrc.json
```

**Output:**

```json
{
  "message": "API key saved to .retellrc.json",
  "path": "/current/directory/.retellrc.json"
}
```

**Where to get your API key:**
Visit the [Retell AI Dashboard](https://app.retellai.com) → Settings → API Keys

---

### Transcripts

Commands for managing and analyzing call transcripts.

#### List Transcripts

**Command:** `retell transcripts list [options]`

**Description:** List call transcripts from your account.

**Options:**
- `-l, --limit <number>` - Maximum number of calls to return (default: 50, max: 1000)

**Usage:**

```bash
# List recent calls (default: 50)
retell transcripts list

# List up to 100 calls
retell transcripts list --limit 100

# List maximum calls
retell transcripts list --limit 1000
```

**Output:**

```json
[
  {
    "call_id": "call_abc123",
    "call_status": "ended",
    "start_timestamp": 1699000000,
    "end_timestamp": 1699001000,
    "duration_ms": 45000,
    "agent_id": "agent_123",
    "agent_name": "Customer Support Bot"
  },
  {
    "call_id": "call_xyz789",
    "call_status": "error",
    "start_timestamp": 1699002000,
    "agent_id": "agent_456",
    "agent_name": "Sales Assistant"
  }
]
```

**Filtering with jq:**

```bash
# Find error calls
retell transcripts list | jq '.[] | select(.call_status == "error")'

# Find calls longer than 1 minute
retell transcripts list | jq '.[] | select(.duration_ms > 60000)'

# Get only call IDs
retell transcripts list | jq -r '.[].call_id'
```

#### Get Transcript

**Command:** `retell transcripts get <call_id>`

**Description:** Get detailed information about a specific call.

**Usage:**

```bash
retell transcripts get call_abc123
```

**Output:**

```json
{
  "call_id": "call_abc123",
  "call_status": "ended",
  "agent_id": "agent_123",
  "agent_name": "Customer Support Bot",
  "start_timestamp": 1699000000,
  "end_timestamp": 1699001000,
  "duration_ms": 45000,
  "transcript": "User: Hi, I need help...\nAgent: Of course! How can I assist you today?",
  "transcript_object": [
    {
      "role": "user",
      "content": "Hi, I need help..."
    },
    {
      "role": "agent",
      "content": "Of course! How can I assist you today?"
    }
  ],
  "recording_url": "https://...",
  "public_log_url": "https://...",
  "call_analysis": {
    "call_summary": "Customer inquired about product pricing",
    "user_sentiment": "positive",
    "call_successful": true
  }
}
```

#### Analyze Transcript

**Command:** `retell transcripts analyze <call_id>`

**Description:** Analyze a call transcript with structured insights including sentiment, performance metrics, and cost breakdown.

**Usage:**

```bash
retell transcripts analyze call_abc123
```

**Output:**

```json
{
  "call_id": "call_abc123",
  "metadata": {
    "status": "ended",
    "duration_ms": 45000,
    "start_timestamp": 1699000000,
    "end_timestamp": 1699001000,
    "agent_name": "Customer Support Bot"
  },
  "transcript": [
    {
      "role": "user",
      "content": "Hi, I need help with my order",
      "word_count": 7
    },
    {
      "role": "agent",
      "content": "Of course! I'd be happy to help you with your order.",
      "word_count": 11
    }
  ],
  "analysis": {
    "summary": "Customer inquired about order status",
    "sentiment": "positive",
    "successful": true,
    "in_voicemail": false
  },
  "performance": {
    "latency_p50_ms": {
      "e2e": 500,
      "llm": 200,
      "tts": 100
    },
    "latency_p90_ms": {
      "e2e": 800,
      "llm": 350,
      "tts": 150
    }
  },
  "cost": {
    "total": 0.15,
    "breakdown": [
      { "product": "llm", "cost": 0.08 },
      { "product": "tts", "cost": 0.05 },
      { "product": "telephony", "cost": 0.02 }
    ]
  }
}
```

**Understanding the Output:**

- **metadata**: Basic call information (status, duration, timestamps)
- **transcript**: Conversation turns with word counts
- **analysis**: AI-generated insights
  - `summary`: Brief description of the call
  - `sentiment`: User sentiment (positive/neutral/negative)
  - `successful`: Whether the call achieved its goal
  - `in_voicemail`: Whether the call went to voicemail
- **performance**: Latency metrics at p50 and p90
  - `e2e`: End-to-end latency (total response time)
  - `llm`: LLM processing time
  - `tts`: Text-to-speech generation time
- **cost**: Cost breakdown by product

---

### Agents

Commands for managing Retell AI agents.

#### List Agents

**Command:** `retell agents list [options]`

**Description:** List all agents in your account.

**Options:**
- `-l, --limit <number>` - Maximum number of agents to return (default: 100)

**Usage:**

```bash
# List all agents
retell agents list

# Limit to 10 agents
retell agents list --limit 10
```

**Output:**

```json
[
  {
    "agent_id": "agent_123abc",
    "agent_name": "Customer Support Bot",
    "response_engine": {
      "type": "retell-llm",
      "llm_id": "llm_456def"
    },
    "voice_id": "voice_789",
    "voice_temperature": 1.0,
    "voice_speed": 1.0,
    "enable_backchannel": true,
    "last_modification_timestamp": 1699000000
  },
  {
    "agent_id": "agent_456xyz",
    "agent_name": "Sales Assistant",
    "response_engine": {
      "type": "conversation-flow",
      "conversation_flow_id": "flow_123"
    }
  }
]
```

**Filtering:**

```bash
# Find Retell LLM agents
retell agents list | jq '.[] | select(.response_engine.type == "retell-llm")'

# Find agents by name
retell agents list | jq '.[] | select(.agent_name | contains("Support"))'
```

#### Agent Info

**Command:** `retell agents info <agent_id>`

**Description:** Get detailed information about a specific agent.

**Usage:**

```bash
retell agents info agent_123abc
```

**Output:**

```json
{
  "agent_id": "agent_123abc",
  "agent_name": "Customer Support Bot",
  "response_engine": {
    "type": "retell-llm",
    "llm_id": "llm_456def",
    "begin_message": "Hello! How can I help you today?",
    "general_prompt": "You are a helpful customer support agent...",
    "general_tools": [...],
    "states": [...]
  },
  "voice_id": "voice_789",
  "voice_temperature": 1.0,
  "voice_speed": 1.0,
  "responsiveness": 0.5,
  "interruption_sensitivity": 0.5,
  "enable_backchannel": true,
  "boosted_keywords": ["product", "order", "support"],
  "ambient_sound": "office",
  "language": "en-US",
  "webhook_url": "https://...",
  "last_modification_timestamp": 1699000000
}
```

---

### Prompts

Commands for managing agent prompts.

#### Pull Prompts

**Command:** `retell prompts pull <agent_id> [options]`

**Description:** Download agent prompts to a local file.

**Options:**
- `-o, --output <path>` - Output file path (default: `.retell-prompts/<agent_id>.json`)

**Usage:**

```bash
# Pull to default location
retell prompts pull agent_123abc
# Saves to: .retell-prompts/agent_123abc.json

# Pull to specific file
retell prompts pull agent_123abc --output my-prompts.json

# Pull to custom directory
retell prompts pull agent_123abc --output ./prompts/support-bot.json
```

**Output:**

```json
{
  "message": "Prompts saved to .retell-prompts/agent_123abc.json",
  "agent_id": "agent_123abc",
  "agent_name": "Customer Support Bot",
  "type": "retell-llm",
  "path": ".retell-prompts/agent_123abc.json"
}
```

**Prompt File Format (Retell LLM):**

```json
{
  "type": "retell-llm",
  "begin_message": "Hello! How can I help you today?",
  "general_prompt": "You are a helpful customer support agent for Acme Corp...",
  "general_tools": [],
  "states": []
}
```

**Prompt File Format (Conversation Flow):**

```json
{
  "type": "conversation-flow",
  "begin_message": "Welcome to Acme Corp!",
  "nodes": [...],
  "edges": [...]
}
```

#### Update Prompts

**Command:** `retell prompts update <agent_id> [options]`

**Description:** Update agent prompts from a local file.

**Options:**
- `-s, --source <path>` - Source file path (default: `.retell-prompts/<agent_id>.json`)
- `--dry-run` - Preview changes without applying them

**Usage:**

```bash
# Update from default location
retell prompts update agent_123abc

# Update from specific file
retell prompts update agent_123abc --source my-prompts.json

# Dry run (preview changes)
retell prompts update agent_123abc --source my-prompts.json --dry-run
```

**Output (Dry Run):**

```json
{
  "message": "DRY RUN - No changes made",
  "agent_id": "agent_123abc",
  "agent_name": "Customer Support Bot",
  "changes": {
    "begin_message": {
      "old": "Hello! How can I help you today?",
      "new": "Welcome to Acme Corp! How can I assist you?"
    },
    "general_prompt": {
      "old": "You are a helpful customer support agent...",
      "new": "You are an expert customer support agent for Acme Corp..."
    }
  }
}
```

**Output (Apply):**

```json
{
  "message": "Agent updated successfully. Run 'retell agents publish agent_123abc' to publish changes.",
  "agent_id": "agent_123abc",
  "agent_name": "Customer Support Bot",
  "updated_fields": ["begin_message", "general_prompt"]
}
```

**Important:** After updating prompts, you must publish the agent to make changes live:

```bash
retell agents publish agent_123abc --version 15 --description "May prompt update"
```

#### Publish Agent

**Command:** `retell agents publish <agent_id> [--version <n>] [--description <text>]`

**Description:** Publish a draft agent version. If `--version` is omitted, the CLI publishes the newest unpublished draft.

**Usage:**

```bash
retell agents publish agent_123abc
retell agents publish agent_123abc --version 15 --description "May prompt update"
```

**Output:**

```json
{
  "message": "Agent published successfully",
  "agent_id": "agent_123abc",
  "agent_name": "Customer Support Bot",
  "published_version": 15
}
```

#### Agent and Chat Agent Version Lifecycle

```bash
retell agents versions agent_123abc
retell agents create-version agent_123abc --base-version 14
retell agents delete-version agent_123abc --version 13

retell chat-agents versions ca_123abc
retell chat-agents create-version ca_123abc --base-version 2
retell chat-agents publish ca_123abc --version 3
retell chat-agents delete-version ca_123abc --version 2
```

Dynamic-variable flags such as `--dynamic-variables` require a JSON object with string values, for example `{"customer_name":"Avery"}`.

#### Pagination and Chat Deletion

Several list commands now expose Retell SDK pagination directly:

```bash
retell phone-numbers list --limit 25 --pagination-key next --sort-order descending
retell flow-components list --limit 25 --pagination-key next --sort-order ascending
retell tests runs list batch_job_123 --limit 25 --pagination-key next
```

Chats can be ended or deleted depending on the workflow:

```bash
retell chats end chat_123abc
retell chats delete chat_123abc
```

---

## Workflows

### Workflow 1: Analyzing Call Performance

Monitor and analyze call performance metrics.

```bash
# Step 1: List recent calls
retell transcripts list --limit 100 > calls.json

# Step 2: Identify calls to analyze
jq '.[] | select(.call_status == "ended")' calls.json > ended-calls.json

# Step 3: Analyze each call
for call_id in $(jq -r '.call_id' ended-calls.json); do
  retell transcripts analyze $call_id > "analysis-${call_id}.json"
done

# Step 4: Calculate average latency
jq -s '[.[] | .performance.latency_p50_ms.e2e] | add / length' analysis-*.json
```

### Workflow 2: Prompt Iteration

Pull, edit, test, and publish updated prompts.

```bash
# Step 1: Pull current prompts
retell prompts pull agent_123abc --output prompts-v1.json

# Step 2: Edit prompts
# Open prompts-v1.json in your editor and make changes
# Save as prompts-v2.json

# Step 3: Preview changes
retell prompts update agent_123abc --source prompts-v2.json --dry-run

# Step 4: Review the diff, then apply
retell prompts update agent_123abc --source prompts-v2.json

# Step 5: Publish changes
retell agents publish agent_123abc

# Step 6: Test with a call, then analyze
# Make a test call...
retell transcripts analyze call_test123
```

### Workflow 3: Bulk Agent Management

Manage prompts for multiple agents.

```bash
# Step 1: List all agents
retell agents list > agents.json

# Step 2: Pull prompts for all agents
for agent_id in $(jq -r '.[].agent_id' agents.json); do
  retell prompts pull $agent_id --output "prompts-${agent_id}.json"
done

# Step 3: Make consistent changes across all prompt files
# (use your preferred method: sed, script, manual editing)

# Step 4: Update all agents
for agent_id in $(jq -r '.[].agent_id' agents.json); do
  echo "Updating $agent_id..."
  retell prompts update $agent_id --source "prompts-${agent_id}.json" --dry-run
done

# Step 5: Review dry runs, then apply
for agent_id in $(jq -r '.[].agent_id' agents.json); do
  retell prompts update $agent_id --source "prompts-${agent_id}.json"
  retell agents publish $agent_id
done
```

### Workflow 4: Error Investigation

Investigate and troubleshoot failed calls.

```bash
# Step 1: Find error calls
retell transcripts list | jq '.[] | select(.call_status == "error")' > errors.json

# Step 2: Get detailed info for each error
for call_id in $(jq -r '.call_id' errors.json); do
  retell transcripts get $call_id > "error-${call_id}.json"
done

# Step 3: Analyze patterns
# Check for common error types, agents, or timestamps
jq '.disconnect_reason' error-*.json | sort | uniq -c

# Step 4: Generate report
cat error-*.json | jq -s '{
  total_errors: length,
  agents: [.[].agent_name] | unique,
  disconnect_reasons: [.[].disconnect_reason] | group_by(.) | map({reason: .[0], count: length})
}'
```

## Advanced Usage

### Using with jq

The CLI outputs JSON by default, making it perfect for use with `jq`:

```bash
# Get agent IDs only
retell agents list | jq -r '.[].agent_id'

# Format output as CSV
retell transcripts list | jq -r '.[] | [.call_id, .call_status, .duration_ms] | @csv'

# Calculate total cost
retell transcripts list | jq -s 'map(.call_cost.combined_cost) | add'

# Group calls by status
retell transcripts list | jq 'group_by(.call_status) | map({status: .[0].call_status, count: length})'
```

### Scripting

Create reusable scripts for common tasks:

**daily-report.sh:**
```bash
#!/bin/bash
set -e

DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="reports/$DATE"
mkdir -p "$OUTPUT_DIR"

# Fetch calls
retell transcripts list --limit 1000 > "$OUTPUT_DIR/calls.json"

# Analyze each call
jq -r '.[].call_id' "$OUTPUT_DIR/calls.json" | while read call_id; do
  retell transcripts analyze "$call_id" > "$OUTPUT_DIR/analysis-${call_id}.json"
done

# Generate summary
jq -s '{
  total_calls: length,
  total_cost: [.[] | .cost.total] | add,
  avg_duration_ms: ([.[] | .metadata.duration_ms] | add / length),
  successful_calls: [.[] | select(.analysis.successful == true)] | length,
  sentiment_breakdown: group_by(.analysis.sentiment) | map({sentiment: .[0].analysis.sentiment, count: length})
}' "$OUTPUT_DIR"/analysis-*.json > "$OUTPUT_DIR/summary.json"

echo "Report saved to $OUTPUT_DIR"
```

### CI/CD Integration

Use the CLI in automated pipelines:

**GitHub Actions:**
```yaml
name: Daily Call Analysis

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Install Retell CLI
        run: npm install -g retell-cli

      - name: Fetch and analyze calls
        env:
          RETELL_API_KEY: ${{ secrets.RETELL_API_KEY }}
        run: |
          retell transcripts list --limit 100 > calls.json

          for call_id in $(jq -r '.[].call_id' calls.json); do
            retell transcripts analyze "$call_id" > "analysis-${call_id}.json"
          done

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: call-analysis
          path: analysis-*.json
```

## Troubleshooting

### Authentication Issues

**Error:** `API key is missing or invalid`

**Solutions:**
1. Run `retell login` to save your API key locally
2. Set `RETELL_API_KEY` environment variable
3. Verify your API key in the Retell dashboard

**Verify config file:**
```bash
cat .retellrc.json
# Should show: {"apiKey":"your_key_here"}
```

### Agent Type Errors

**Error:** `Cannot manage custom LLM agents via API`

**Cause:** Custom LLM agents use external WebSocket connections.

**Solution:** Use the [Retell dashboard](https://app.retellai.com) to manage custom LLM agents.

**Error:** `Type mismatch: expected retell-llm, got conversation-flow`

**Cause:** The prompt file type doesn't match the agent's response engine type.

**Solution:**
1. Check agent type: `retell agents info <agent_id> | jq '.response_engine.type'`
2. Ensure prompt file has matching type field
3. Pull fresh prompts: `retell prompts pull <agent_id>`

### File Permission Issues

**Error:** `EACCES: permission denied, open '.retellrc.json'`

**Cause:** The config file has restricted permissions (0600).

**Solution:**
```bash
# Check permissions
ls -la .retellrc.json
# Should show: -rw------- (owner read/write only)

# Fix ownership if needed
sudo chown $USER .retellrc.json
```

### Command Not Found

**Error:** `retell: command not found`

**Cause:** npm global bin directory is not in PATH.

**Solution:**
```bash
# Check npm global bin path
npm config get prefix

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"

# Or use npx
npx retell-cli@latest --help
```

### JSON Parsing Errors

**Error:** `Invalid JSON in prompt file`

**Cause:** Malformed JSON in prompt file.

**Solution:**
```bash
# Validate JSON
jq . my-prompts.json

# Use a JSON linter
npx jsonlint my-prompts.json

# Pull fresh prompts
retell prompts pull <agent_id> --output my-prompts.json
```

## Getting Help

### Within the CLI

```bash
# Global help
retell --help

# Command help
retell transcripts --help
retell transcripts list --help

# Version
retell --version
```

### External Resources

- [Retell AI Documentation](https://docs.retellai.com)
- [GitHub Issues](https://github.com/awccom/retell-cli/issues)
- [API Reference](https://docs.retellai.com/api-references/overview)

### Reporting Issues

When reporting issues, include:

1. **CLI version:** `retell --version`
2. **Command used:** Full command with options
3. **Error output:** Complete error message
4. **Environment:** OS, shell, Node.js version

```bash
# Gather diagnostic info
echo "CLI Version: $(retell --version)"
echo "Node Version: $(node --version)"
echo "OS: $(uname -a)"
echo "Shell: $SHELL"
```

---

**Next Steps:**
- Explore [examples](examples/) for more workflows
- Read the [contributing guide](../CONTRIBUTING.md) to contribute
- Check [architecture docs](architecture.md) for technical details
