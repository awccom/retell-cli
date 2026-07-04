# Retell AI CLI

[![npm version](https://badge.fury.io/js/retell-cli.svg)](https://www.npmjs.com/package/retell-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Community-built command-line tool for Retell AI - designed to give AI assistants efficient access to transcripts, agents, and prompts without using context-expensive MCP servers.

## Features

- **Transcript Management** - List, retrieve, and analyze call transcripts
- **Agent Management** - Full CRUD for Retell AI agents (create, list, update, delete, versions, MCP tools)
- **Call Creation** - Launch phone, web, and SMS-chat calls; register custom-telephony calls; schedule batch calls
- **Phone Number Management** - Purchase, import, list, update, and release phone numbers (with weighted agent routing)
- **Chat Sessions** - Create and manage chat sessions, chat agents, SMS chats, and LLM completions
- **LLM + Voice Resources** - CRUD Retell LLMs; browse, search, add, and clone voice resources
- **Prompt Engineering** - Pull, edit, and update agent prompts
- **Tool Management** - Full CRUD for agent tools (webhooks, custom functions, etc.)
- **Flow Components** - Reusable conversation-flow components (CRUD)
- **Concurrency Monitoring** - Check org-wide call concurrency and limits
- **Multi-format Support** - Works with Retell LLM and Conversation Flows
- **AI-Friendly** - JSON output by default for AI coding assistants
- **Cross-Shell** - Works in bash, fish, zsh, and more

## Installation

```bash
npm install -g retell-cli
```

The installed command is `retell`. After `retell login`, credentials are saved to your home config by default so the globally installed command works from any directory.

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

Your API key will be saved to `~/.retellrc.json` by default so `retell` works from any directory. Use `retell login --local` if you intentionally want a cwd-local `.retellrc.json` project override.

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
retell agents publish agent_123abc

# Or publish a specific draft version
retell agents publish agent_123abc --version 15 --description "May prompt update"
```

## Authentication

The CLI supports these authentication methods (in order of precedence):

### 1. Environment Variable (Best for CI/CD)

```bash
export RETELL_API_KEY=your_api_key_here
retell agents list
```

A per-command environment override uses the same top-priority mechanism:

```bash
RETELL_API_KEY=key_abc123 retell agents list
```

**Note for Fish shell users:**
```fish
env RETELL_API_KEY=key_abc123 retell agents list
```

### 2. Local Config File (Project-Specific Override)

```bash
retell login --local
# Creates .retellrc.json in the current directory
```

Local config is checked before home config to preserve backward compatibility and to allow project-specific credentials.

### 3. Home/Global Config File (Best for Global CLI Use)

```bash
retell login
# Creates ~/.retellrc.json by default
```

This is the recommended default for a globally installed `retell` command because it works from any directory.

### 4. XDG Config File (Optional Fallback)

If present, the CLI also checks `$XDG_CONFIG_HOME/retell/config.json`, or `~/.config/retell/config.json` when `XDG_CONFIG_HOME` is unset.

The config file format is the same for all config file locations:
```json
{
  "apiKey": "your_api_key_here",
  "defaultFormat": "json"
}
```

### Safe migration from old cwd-local auth

Older versions of `retell login` wrote `.retellrc.json` in the directory where login was run. That file still works and still overrides home config when commands are run from that directory. To make the global CLI work everywhere, run `retell login` once to create `~/.retellrc.json`, then keep or remove old local `.retellrc.json` files based on whether you need per-project overrides.

## Command Reference

### Authentication

#### `retell login`

Save your API key to the home/global config file by default.

```bash
retell login
# Prompts: Enter your Retell API key:
# Writes ~/.retellrc.json

retell login --local
# Writes ./.retellrc.json for the current directory only
```

**Options:**
- `--global` - Save credentials to `~/.retellrc.json` (default)
- `--local` - Save credentials to `./.retellrc.json` for the current directory

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

#### `retell agents create [options]`

Create a new agent with the specified configuration.

**Options:**
- `--voice <voice_id>` - Voice ID for the agent (required)
- `--name <name>` - Agent name
- `--llm-id <id>` - Retell LLM ID (creates retell-llm response engine)
- `--flow-id <id>` - Conversation Flow ID (creates conversation-flow response engine)
- `--custom-llm <url>` - Custom LLM WebSocket URL
- `-f, --file <path>` - Full agent config from JSON file (overrides other options)
- `--fields <fields>` - Comma-separated list of fields to return

**Note:** You must specify exactly one of `--llm-id`, `--flow-id`, `--custom-llm`, or `--file`.

**Examples:**
```bash
# Create agent with Retell LLM
retell agents create --voice 11labs-Adrian --llm-id llm_xxx --name "Support Agent"

# Create agent with Conversation Flow
retell agents create --voice 11labs-Adrian --flow-id cf_xxx

# Create agent from JSON config file
retell agents create --file agent-config.json
```

#### `retell agents delete <agent_id>`

Delete an agent.

**Example:**
```bash
retell agents delete agent_123abc
```

#### `retell agents versions <agent_id> [options]`

List all versions of an agent.

**Options:**
- `--fields <fields>` - Comma-separated list of fields to return

**Example:**
```bash
retell agents versions agent_123abc
retell agents versions agent_123abc --fields version,is_published
```

#### `retell agents create-version <agent_id> --base-version <n>`

Create a new draft agent version from an existing version.

#### `retell agents delete-version <agent_id> --version <n>`

Delete a specific agent version.

#### `retell agents publish <agent_id> [options]`

Publish a draft agent version. If `--version` is omitted, the CLI publishes the newest unpublished draft.

**Options:**
- `--version <n>` - Draft version to publish
- `--description <text>` - Optional version description

**Example:**
```bash
retell agents publish agent_123abc --version 15 --description "May prompt update"
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
retell agents publish agent_123abc
```

#### `retell agents publish <agent_id> [options]`

Publish a draft agent version. If `--version` is omitted, the CLI publishes the newest unpublished draft.

The legacy `retell agent-publish <agent_id>` alias is still available, but `retell agents publish` is preferred for version-aware workflows.

**Example:**
```bash
retell agents publish agent_123abc --version 15
```

### Agent Configuration

Manage agent-level settings that aren't part of prompts (voice, webhooks, post-call analysis, etc.).

#### `retell agent get <agent_id> [options]`

Get agent configuration including all agent-level settings.

**Options:**
- `--engine-version <number>` - Specific version to retrieve (defaults to latest)
- `--fields <fields>` - Comma-separated list of fields to return

**Examples:**
```bash
# Get full agent config
retell agent get agent_123abc

# Get specific version
retell agent get agent_123abc --engine-version 2

# Get specific fields only
retell agent get agent_123abc --fields agent_name,post_call_analysis_data

# Save config to file for editing
retell agent get agent_123abc > config.json
```

#### `retell agent update <agent_id> [options]`

Update agent configuration from a JSON file. This is useful for updating agent-level fields that aren't accessible through `prompts update`, such as:
- `post_call_analysis_data` - Custom data extraction and system preset analysis fields for calls
- `post_call_analysis_model` - Model for analysis
- Voice settings, language, webhooks, and more

Retell deprecated the old top-level `analysis_summary_prompt`, `analysis_successful_prompt`, and `analysis_user_sentiment_prompt` fields. Use `system-presets` entries inside `post_call_analysis_data` instead.

**Options:**
- `-f, --file <path>` - Path to JSON file containing agent configuration updates (required)
- `--dry-run` - Preview changes without applying them
- `--engine-version <number>` - Specific version to update (defaults to latest draft)

**Example JSON for post-call analysis:**
```json
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
    },
    {
      "name": "customer_sentiment",
      "type": "string",
      "description": "Overall customer sentiment"
    }
  ]
}
```

**Examples:**
```bash
# Preview changes first (recommended)
retell agent update agent_123abc --file config.json --dry-run

# Apply changes
retell agent update agent_123abc --file config.json

# Remember to publish after updating
retell agents publish agent_123abc
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
retell agents publish agent_123abc
```

### Phone Numbers

Manage phone numbers for your Retell AI agents.

#### `retell phone-numbers list [options]`

List all phone numbers in your account.

**Options:**
- `--limit <n>` - Maximum number of phone numbers to return
- `--pagination-key <key>` - Pagination key for the next page
- `--sort-order <order>` - `ascending` or `descending`
- `--fields <fields>` - Comma-separated list of fields to return

**Example:**
```bash
retell phone-numbers list
retell phone-numbers list --limit 25 --sort-order descending
retell phone-numbers list --fields phone_number,nickname,inbound_agents,outbound_agents
```

#### `retell phone-numbers get <phone_number> [options]`

Get details of a specific phone number.

**Options:**
- `--fields <fields>` - Comma-separated list of fields to return

**Example:**
```bash
retell phone-numbers get +14157774444
retell phone-numbers get +14157774444 --fields phone_number,inbound_agents,outbound_agents
```

#### `retell phone-numbers import [options]`

Import a phone number from custom telephony (e.g., Twilio, Vonage).

**Options:**
- `--number <number>` - Phone number in E.164 format (required)
- `--termination-uri <uri>` - SIP trunk termination URI (required)
- `--nickname <name>` - Friendly name for reference
- `--inbound-agent <id>` - Agent ID for inbound calls
- `--outbound-agent <id>` - Agent ID for outbound calls
- `--inbound-agents <spec>` - Weighted inbound agents, e.g. `agent_1:0.6,agent_2:0.4` (mutually exclusive with `--inbound-agent`)
- `--outbound-agents <spec>` - Weighted outbound agents (same spec format as `--inbound-agents`)
- `--sip-username <user>` - SIP trunk auth username
- `--sip-password <pass>` - SIP trunk auth password
- `--fields <fields>` - Comma-separated list of fields to return

**Examples:**
```bash
# Basic import
retell phone-numbers import --number +14157774444 --termination-uri someuri.pstn.twilio.com

# Import with nickname and agent assignment
retell phone-numbers import \
  --number +14157774444 \
  --termination-uri someuri.pstn.twilio.com \
  --nickname "Support Line" \
  --inbound-agent agent_123abc

# Import with SIP authentication
retell phone-numbers import \
  --number +14157774444 \
  --termination-uri someuri.pstn.twilio.com \
  --sip-username myuser \
  --sip-password mypass
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

### Calls (create / update / delete)

Call listing and retrieval stay under `transcripts`. Use `calls` to create and mutate calls.

```bash
# Outbound phone call
retell calls create-phone --from-number +14157774444 --to-number +12137774445

# Web call (browser-based agent)
retell calls create-web --agent-id agent_xxx --metadata '{"session_id":"s1"}'

# Register a call for custom telephony
retell calls register-phone --agent-id agent_xxx --direction outbound

# Update metadata / data storage on an existing call
retell calls update call_abc123 --metadata '{"customer_id":"c_1"}' \
  --data-storage-setting everything_except_pii

# Delete a call and its data
retell calls delete call_abc123
```

Shared on create/register/update: `--metadata`, `--dynamic-variables`, `--fields`.
`--dynamic-variables` must be a JSON object with string values, for example `{"customer_name":"Avery"}`.

**Retell deprecation note:** `retell calls update --dynamic-variables` maps to Update Call's `override_dynamic_variables`, which Retell is deprecating for ongoing calls on 2026-08-31. Use it only for ended-call updates; add a dedicated Update Live Call command before relying on runtime dynamic-variable or data-storage changes for active calls.

- `create-phone` also: `--override-agent-id`, `--override-agent-version`, `--custom-sip-headers`, `--agent-override <path>` (path to JSON), `--ignore-e164-validation`.
- `create-web` also: `--agent-version`, `--agent-override <path>`, `--current-node-id`, `--current-state`.
- `register-phone` also: `--agent-version`, `--direction`, `--from-number`, `--to-number`.

### Batch Calls

```bash
# Schedule a batch of outbound calls from a JSON tasks file
retell batch-calls create \
  --from-number +14157774444 \
  --tasks tasks.json \
  --name "April outreach" \
  --reserved-concurrency 10

# Optional: restrict calling windows
retell batch-calls create --from-number +1 --tasks tasks.json \
  --call-time-window window.json
```

### LLMs

```bash
retell llms list --fields llm_id,is_published
retell llms get llm_abc
retell llms create --general-prompt "You are a helpful agent." --model gpt-4.1
retell llms create --file my-llm.json
retell llms update llm_abc --file updates.json
retell llms update llm_abc --file updates.json --version 3
retell llms delete llm_abc
```

### Voices

```bash
retell voices list --fields voice_id,voice_name,provider
retell voices get voice_abc
retell voices search --search-query "warm female" --voice-provider elevenlabs
retell voices add-resource --provider-voice-id pv_1 --voice-name "Allie"
retell voices clone --voice-name "Dev Clone" --voice-provider elevenlabs --file sample.wav
```

### Chats

```bash
retell chats create --agent-id agent_xxx
retell chats list --limit 10 --sort-order descending
retell chats get chat_abc
retell chats complete --chat-id chat_abc --content "What's the status?"
retell chats sms --from-number +14157774444 --to-number +12137774445
retell chats update chat_abc --metadata '{"k":"v"}'
retell chats end chat_abc
retell chats delete chat_abc
```

### Chat Agents

```bash
retell chat-agents list
retell chat-agents create --llm-id llm_abc --name "Support Chat"
retell chat-agents get ca_abc --version 2
retell chat-agents update ca_abc --file updates.json
retell chat-agents versions ca_abc
retell chat-agents create-version ca_abc --base-version 2
retell chat-agents publish ca_abc --version 3
retell chat-agents delete-version ca_abc --version 2
retell chat-agents delete ca_abc
```

### Phone Numbers (Full CRUD)

```bash
# Purchase a new number
retell phone-numbers create --area-code 415 --nickname "Frontdesk" \
  --inbound-agent agent_xxx

# Update a purchased number (weighted agents + SIP)
retell phone-numbers update +14157774444 \
  --inbound-agents "agent_1:0.6,agent_2:0.4" \
  --nickname "Support"

# Release a number
retell phone-numbers delete +14157774444
```

### Flow Components

```bash
retell flow-components list --limit 25 --sort-order descending
retell flow-components get comp_abc
retell flow-components create --file component.json
retell flow-components update comp_abc --file updates.json
retell flow-components delete comp_abc
```

### Concurrency

```bash
retell concurrency get
retell concurrency get --fields concurrency_limit,current_concurrency
```

### Agent MCP Tools

```bash
retell agents mcp-tools agent_abc --mcp-id mcp_1
retell agents mcp-tools agent_abc --mcp-id mcp_1 --component-id comp_1 --version 3
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
  retell agents publish $agent_id
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
retell agents publish agent_456
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
