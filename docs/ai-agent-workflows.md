# AI Agent Workflows: Best Practices Guide

This guide provides best practices for AI agents using the Retell CLI to manage voice agents, analyze calls, and refine prompts.

## Table of Contents

- [Core Principles](#core-principles)
- [Safe Prompt Updates](#safe-prompt-updates)
- [Call Analysis Workflows](#call-analysis-workflows)
- [Iterative Prompt Refinement](#iterative-prompt-refinement)
- [Token Efficiency](#token-efficiency)
- [Error Handling](#error-handling)
- [Common Patterns](#common-patterns)

---

## Core Principles

### 1. Always Verify Before Applying Changes

**Never push changes blindly.** Always use diff and dry-run to preview what will change:

```bash
# ❌ Bad: Direct update without verification
retell prompts update agent_123

# ✅ Good: Verify first, then apply
retell prompts diff agent_123
retell prompts update agent_123 --dry-run
retell prompts update agent_123
```

### 2. Use Field Filtering to Reduce Token Usage

Fetch only the data you need using `--fields`:

```bash
# ❌ Bad: Fetch entire transcript (thousands of tokens)
retell transcripts analyze call_abc123

# ✅ Good: Fetch only what you need (90% fewer tokens)
retell transcripts analyze call_abc123 --fields call_id,transcript,call_analysis
```

### 3. Explain Your Changes

When modifying prompts, use diff output to show the user what changed and why:

```bash
# Show what changed
retell prompts diff agent_123

# AI should explain:
# "I've updated the general_prompt to be more empathetic when handling
# customer complaints. The new version adds acknowledgment phrases and
# asks clarifying questions before offering solutions."
```

---

## Safe Prompt Updates

### The Golden Workflow

Follow this pattern for ALL prompt updates:

```bash
# 1. Pull current prompts
retell prompts pull agent_123

# 2. Make local edits
vim .retell-prompts/agent_123/general_prompt.md

# 3. Show what changed
retell prompts diff agent_123

# 4. Dry run to verify
retell prompts update agent_123 --dry-run

# 5. Explain changes to user
# (AI describes the diff output in natural language)

# 6. Apply changes
retell prompts update agent_123

# 7. Publish to production
retell agents publish agent_123
```

### Using Diff Effectively

The `diff` command shows structured changes:

```json
{
  "agent_id": "agent_123",
  "agent_type": "retell-llm",
  "has_changes": true,
  "changes": {
    "general_prompt": {
      "old": "You are a customer service assistant.",
      "new": "You are an empathetic customer service assistant...",
      "change_type": "modified"
    },
    "states.escalation": {
      "old": null,
      "new": "Transfer to human agent when customer is frustrated.",
      "change_type": "added"
    }
  }
}
```

**AI should:**
1. Parse the diff output
2. Identify what changed (added/modified/removed)
3. Explain the rationale for each change
4. Highlight potential impacts on call behavior

### Dry Run Best Practices

Always dry-run before updating:

```bash
# Preview changes
retell prompts update agent_123 --dry-run

# If output shows unexpected changes, stop and review
# If output matches intent, proceed with update
retell prompts update agent_123
```

**When to use dry-run:**
- Before every update (mandatory)
- After making complex changes
- When working with production agents
- When uncertain about file modifications

---

## Call Analysis Workflows

### Analyzing Single Calls

**Pattern: Focus on specific aspects**

```bash
# Get full analysis
retell transcripts analyze call_abc123 --fields call_analysis

# Get only hotspots (issues)
retell transcripts analyze call_abc123 --hotspots-only

# Get transcript with minimal metadata
retell transcripts analyze call_abc123 --fields call_id,transcript
```

### Batch Analysis

**Pattern: Search + Filter + Analyze**

```bash
# Find error calls
retell transcripts search --status error --limit 10

# Find calls by agent
retell transcripts search --agent-id agent_123 --limit 20

# Find recent calls with low sentiment
retell transcripts search \
  --from-date 2025-11-15 \
  --limit 50 \
  --fields call_id,sentiment_score \
  | jq '.[] | select(.sentiment_score < 0.5)'
```

### Identifying Patterns

**Use hotspots to find systemic issues:**

```bash
# Get hotspots from multiple calls
for call_id in $(retell transcripts search --agent-id agent_123 --limit 10 --fields call_id | jq -r '.[].call_id'); do
  retell transcripts analyze $call_id --hotspots-only
done

# AI should:
# 1. Aggregate hotspots across calls
# 2. Identify common patterns (e.g., frequent interruptions, latency spikes)
# 3. Suggest prompt improvements to address root causes
```

---

## Iterative Prompt Refinement

### The Refinement Loop

```
┌─────────────────────────────────────┐
│ 1. Analyze Calls                    │
│    (identify issues)                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Pull Prompts                     │
│    retell prompts pull agent_123    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. Modify Prompts                   │
│    (edit local files)               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 4. Review Changes                   │
│    retell prompts diff agent_123    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 5. Dry Run                          │
│    retell prompts update --dry-run  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 6. Apply & Publish                  │
│    retell prompts update agent_123  │
│    retell agents publish agent_123   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 7. Monitor Results                  │
│    (wait for new calls)             │
└────────────┬────────────────────────┘
             │
             └──────► Back to Step 1
```

### Example: Improving Response Quality

**Scenario:** Calls show the agent is too verbose.

```bash
# Step 1: Identify the issue
retell transcripts analyze call_abc123 --hotspots-only
# Output shows: "long_agent_turn" hotspots

# Step 2: Pull current prompts
retell prompts pull agent_123

# Step 3: Modify general_prompt.md
# Add: "Keep responses concise. Aim for 1-2 sentences per turn."

# Step 4: Show what changed
retell prompts diff agent_123
# AI explains: "Added conciseness instruction to reduce verbosity"

# Step 5: Dry run
retell prompts update agent_123 --dry-run
# Verify only general_prompt changed

# Step 6: Apply
retell prompts update agent_123
retell agents publish agent_123

# Step 7: Monitor next 10 calls for improvement
retell transcripts search --agent-id agent_123 --limit 10 --from-date 2025-11-16
```

---

## Token Efficiency

### Minimize Token Usage

**Always use `--fields` to fetch only what you need:**

| Command | Without --fields | With --fields | Savings |
|---------|-----------------|---------------|---------|
| `transcripts analyze` | ~5000 tokens | ~500 tokens | 90% |
| `transcripts list` | ~2000 tokens | ~200 tokens | 90% |
| `agents list` | ~1500 tokens | ~300 tokens | 80% |

### Smart Field Selection

**For call analysis:**
```bash
# Full analysis workflow
--fields call_id,transcript,call_analysis,sentiment_score

# Quick issue check
--fields call_id,call_status,disconnection_reason

# Transcript only
--fields call_id,transcript
```

**For agent inspection:**
```bash
# Check current config
--fields agent_id,agent_name,llm_id,response_engine

# List agents
--fields agent_id,agent_name
```

### Batch Operations

**Use search instead of list + filter:**

```bash
# ❌ Bad: Fetch all, filter client-side
retell transcripts list --limit 100 | jq '.[] | select(.call_status == "error")'

# ✅ Good: Filter server-side
retell transcripts search --status error --limit 100
```

---

## Error Handling

### Graceful Degradation

**Always handle errors and provide clear feedback:**

```bash
# Check if agent exists before pulling
retell agents get agent_123 --fields agent_id,agent_name
# If error → explain to user that agent doesn't exist

# Verify prompts directory exists before diffing
if [ ! -d ".retell-prompts/agent_123" ]; then
  echo "Run 'retell prompts pull agent_123' first"
  exit 1
fi
```

### Type Mismatch Handling

**When local and remote types don't match:**

```bash
# This will error if types mismatch
retell prompts diff agent_123

# AI should:
# 1. Detect the error message
# 2. Explain: "Local files are retell-llm but agent now uses conversation-flow"
# 3. Suggest: "Run 'retell prompts pull agent_123' to sync"
```

### Validation Before Update

```bash
# Always validate before updating
retell prompts diff agent_123

# Check has_changes field
# If false → skip update, inform user "No changes to apply"
# If true → proceed with dry-run
```

---

## Common Patterns

### Pattern 1: Find and Fix Issues

```bash
# 1. Find problematic calls
retell transcripts search --agent-id agent_123 --status error

# 2. Analyze root causes
retell transcripts analyze <call_id> --hotspots-only

# 3. Update prompts to address issues
retell prompts pull agent_123
# ... edit prompts ...
retell prompts diff agent_123
retell prompts update agent_123 --dry-run
retell prompts update agent_123
retell agents publish agent_123
```

### Pattern 2: A/B Testing Prompt Changes

```bash
# 1. Document baseline performance
retell transcripts search --agent-id agent_123 --limit 50 --fields sentiment_score,call_analysis

# 2. Apply prompt changes
retell prompts pull agent_123
# ... edit prompts ...
retell prompts update agent_123
retell agents publish agent_123

# 3. Compare results after 24 hours
retell transcripts search --agent-id agent_123 --from-date 2025-11-17 --limit 50 --fields sentiment_score,call_analysis

# AI should:
# - Calculate average sentiment before/after
# - Identify changes in common issues
# - Recommend keeping or reverting changes
```

### Pattern 3: Multi-Agent Consistency

```bash
# Update prompts across multiple agents with similar roles

# 1. Pull all agents
retell prompts pull agent_123
retell prompts pull agent_456
retell prompts pull agent_789

# 2. Apply consistent changes to all
# ... edit all .retell-prompts/*/general_prompt.md ...

# 3. Diff each agent
retell prompts diff agent_123
retell prompts diff agent_456
retell prompts diff agent_789

# 4. Dry run all
retell prompts update agent_123 --dry-run
retell prompts update agent_456 --dry-run
retell prompts update agent_789 --dry-run

# 5. Apply all
retell prompts update agent_123
retell prompts update agent_456
retell prompts update agent_789
```

### Pattern 4: Incremental Refinement

```bash
# Make small, focused changes and verify each one

# Iteration 1: Add empathy
retell prompts pull agent_123
# Edit: Add "I understand that's frustrating" phrases
retell prompts diff agent_123  # Verify only general_prompt changed
retell prompts update agent_123 --dry-run
retell prompts update agent_123
retell agents publish agent_123

# Wait, monitor 10 calls

# Iteration 2: Add state for escalation
# Edit: Add states/escalation.md
retell prompts diff agent_123  # Verify new state added
retell prompts update agent_123 --dry-run
retell prompts update agent_123
retell agents publish agent_123

# Wait, monitor 10 calls

# Continue iterating...
```

---

## Advanced Techniques

### Custom Source Directories

**Organize prompts for multiple environments:**

```bash
# Development prompts
retell prompts pull agent_123 --source ./prompts/dev/agent_123

# Production prompts
retell prompts pull agent_123 --source ./prompts/prod/agent_123

# Diff between dev and prod
# (Manual comparison of files or custom script)
```

### Automated Monitoring

**Set up periodic analysis:**

```bash
#!/bin/bash
# monitor-agent.sh

AGENT_ID="agent_123"
DATE=$(date -I)

# Fetch recent calls
retell transcripts search \
  --agent-id $AGENT_ID \
  --from-date $DATE \
  --limit 50 \
  --fields call_id,sentiment_score,call_status \
  > daily-calls-$DATE.json

# Analyze hotspots
for call_id in $(jq -r '.[].call_id' daily-calls-$DATE.json); do
  retell transcripts analyze $call_id --hotspots-only
done > daily-hotspots-$DATE.json

# AI processes results and suggests improvements
```

### Version Control Integration

**Track prompt changes in git:**

```bash
# After each prompt update
cd .retell-prompts/agent_123
git add .
git commit -m "Improve empathy in general_prompt based on call analysis"
git push

# This creates an audit trail of all prompt changes
```

---

## Summary

### Key Takeaways

1. **Always verify before updating** - Use `diff` and `--dry-run`
2. **Minimize tokens** - Use `--fields` for focused data
3. **Explain changes** - Show users what changed and why using diff output
4. **Iterate incrementally** - Small changes, verify, repeat
5. **Monitor results** - Use search and analysis to track improvements
6. **Handle errors gracefully** - Validate before acting, provide clear messages
7. **Document everything** - Use git to track prompt evolution

### Quick Reference Commands

```bash
# Safe update workflow
retell prompts pull <agent-id>
retell prompts diff <agent-id>
retell prompts update <agent-id> --dry-run
retell prompts update <agent-id>
retell agents publish <agent-id>

# Token-efficient analysis
retell transcripts analyze <call-id> --fields call_id,transcript,call_analysis
retell transcripts analyze <call-id> --hotspots-only

# Find issues
retell transcripts search --status error --agent-id <agent-id>
retell transcripts search --from-date YYYY-MM-DD --limit N
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0.1
