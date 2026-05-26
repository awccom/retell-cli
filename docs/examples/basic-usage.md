# Basic Usage Examples

Common tasks and basic usage patterns for the Retell AI CLI.

## Table of Contents

- [Authentication](#authentication)
- [Viewing Transcripts](#viewing-transcripts)
- [Managing Agents](#managing-agents)
- [Working with Prompts](#working-with-prompts)

## Authentication

### Set Up API Key

```bash
# Method 1: Save API key locally (recommended)
retell login
# Enter your API key when prompted

# Method 2: Use environment variable
export RETELL_API_KEY=your_api_key_here

# Method 3: Fish shell
set -x RETELL_API_KEY your_api_key_here
```

### Verify Authentication

```bash
# Test authentication by listing agents
retell agents list

# Expected output:
# [
#   {
#     "agent_id": "agent_123",
#     "agent_name": "My Agent"
#   }
# ]
```

## Viewing Transcripts

### List Recent Calls

```bash
# Get last 10 calls
retell transcripts list --limit 10
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
  }
]
```

### Get Specific Call Details

```bash
# Get full transcript
retell transcripts get call_abc123
```

**Output:**
```json
{
  "call_id": "call_abc123",
  "call_status": "ended",
  "transcript": "User: Hello\nAgent: Hi! How can I help you?",
  "transcript_object": [
    {"role": "user", "content": "Hello"},
    {"role": "agent", "content": "Hi! How can I help you?"}
  ],
  "recording_url": "https://..."
}
```

### Analyze a Call

```bash
# Get detailed analysis with metrics
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
  },
  "cost": {
    "total": 0.15,
    "breakdown": [
      {"product": "llm", "cost": 0.08},
      {"product": "tts", "cost": 0.05}
    ]
  }
}
```

## Managing Agents

### List All Agents

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
      "type": "retell-llm",
      "llm_id": "llm_456def"
    }
  },
  {
    "agent_id": "agent_456xyz",
    "agent_name": "Sales Assistant",
    "response_engine": {
      "type": "conversation-flow"
    }
  }
]
```

### Get Agent Details

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
    "general_prompt": "You are a helpful customer support agent..."
  },
  "voice_id": "voice_789",
  "voice_temperature": 1.0,
  "language": "en-US"
}
```

### Find Specific Agent Types

```bash
# Find all Retell LLM agents (requires jq)
retell agents list | jq '.[] | select(.response_engine.type == "retell-llm")'

# Find agents by name
retell agents list | jq '.[] | select(.agent_name | contains("Support"))'
```

## Working with Prompts

### Download Prompts

```bash
# Download to default location (.retell-prompts/)
retell prompts pull agent_123abc

# Download to specific file
retell prompts pull agent_123abc --output my-prompts.json
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

**Prompt File Format:**
```json
{
  "type": "retell-llm",
  "begin_message": "Hello! How can I help you today?",
  "general_prompt": "You are a helpful customer support agent for Acme Corp. Always be polite and professional.",
  "general_tools": [],
  "states": []
}
```

### Update Prompts

```bash
# Step 1: Pull current prompts
retell prompts pull agent_123abc --output prompts.json

# Step 2: Edit prompts.json
# Change "begin_message" or "general_prompt"

# Step 3: Preview changes (dry run)
retell prompts update agent_123abc --source prompts.json --dry-run

# Step 4: Apply changes
retell prompts update agent_123abc --source prompts.json

# Step 5: Publish the newest unpublished draft
retell agents publish agent_123abc

# Or publish an explicit draft version
retell agents publish agent_123abc --version 15 --description "Prompt refresh"
```

**Dry Run Output:**
```json
{
  "message": "DRY RUN - No changes made",
  "agent_id": "agent_123abc",
  "changes": {
    "begin_message": {
      "old": "Hello! How can I help you today?",
      "new": "Welcome to Acme Corp! How can I assist you?"
    }
  }
}
```

### Publish Agent

```bash
# After updating prompts, publish to make changes live
retell agents publish agent_123abc
```

**Output:**
```json
{
  "message": "Agent published successfully",
  "agent_id": "agent_123abc",
  "agent_name": "Customer Support Bot"
}
```

## Filtering and Processing Output

### Using jq for JSON Processing

```bash
# Get only call IDs
retell transcripts list | jq -r '.[].call_id'

# Get calls longer than 1 minute
retell transcripts list | jq '.[] | select(.duration_ms > 60000)'

# Count error calls
retell transcripts list | jq '[.[] | select(.call_status == "error")] | length'

# Get agent names only
retell agents list | jq -r '.[].agent_name'

# Format as CSV
retell transcripts list | jq -r '.[] | [.call_id, .call_status, .duration_ms] | @csv'
```

### Save to File

```bash
# Save transcript list
retell transcripts list > calls.json

# Save agent info
retell agents info agent_123abc > agent-details.json

# Save analysis
retell transcripts analyze call_abc123 > analysis.json
```

## Common Patterns

### Check Recent Call Status

```bash
# Get last 5 calls and their status
retell transcripts list --limit 5 | jq '.[] | {call_id, call_status, duration_ms}'
```

### Find Your Most Active Agent

```bash
# Count calls per agent
retell transcripts list --limit 100 | jq 'group_by(.agent_id) | map({agent: .[0].agent_name, calls: length}) | sort_by(.calls) | reverse'
```

### Calculate Total Call Duration

```bash
# Sum duration of all calls (in milliseconds)
retell transcripts list | jq '[.[] | .duration_ms] | add'

# Convert to minutes
retell transcripts list | jq '[.[] | .duration_ms] | add / 60000'
```

### Calculate Total Cost

```bash
# Analyze all recent calls and sum costs
retell transcripts list --limit 100 | jq -r '.[].call_id' | while read call_id; do
  retell transcripts analyze $call_id
done | jq -s '[.[] | .cost.total] | add'
```

## Tips and Best Practices

### 1. Always Use Dry Run

Before updating prompts, always use `--dry-run` to preview changes:

```bash
retell prompts update agent_123abc --source prompts.json --dry-run
```

### 2. Keep Prompt Backups

Save prompt versions before making changes:

```bash
retell prompts pull agent_123abc --output "prompts-$(date +%Y%m%d).json"
```

### 3. Use Environment Variables in Scripts

For scripts and automation, use environment variables:

```bash
#!/bin/bash
export RETELL_API_KEY="${RETELL_API_KEY:-$(cat .retellrc.json | jq -r '.apiKey')}"
retell agents list
```

### 4. Validate JSON Before Updating

Always validate JSON files before updating:

```bash
# Validate with jq
jq . prompts.json

# Or use jsonlint
npx jsonlint prompts.json
```

### 5. Monitor Performance Regularly

Set up a cron job or scheduled task to monitor performance:

```bash
# Add to crontab
0 0 * * * cd /path/to/project && retell transcripts list --limit 100 > daily-calls.json
```

## Next Steps

- Learn about advanced workflows in [prompt-management.md](prompt-management.md)
- Explore troubleshooting in [troubleshooting.md](troubleshooting.md)
- Read the complete [User Guide](../user-guide.md)
