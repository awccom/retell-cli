# Prompt Management Workflows

Advanced workflows for managing and updating agent prompts at scale.

## Table of Contents

- [Single Agent Prompt Updates](#single-agent-prompt-updates)
- [Bulk Prompt Management](#bulk-prompt-management)
- [Version Control for Prompts](#version-control-for-prompts)
- [Testing Prompt Changes](#testing-prompt-changes)
- [A/B Testing Prompts](#ab-testing-prompts)

## Single Agent Prompt Updates

### Basic Prompt Update Workflow

```bash
# Step 1: Pull current prompts
retell prompts pull agent_123abc --output current-prompts.json

# Step 2: Create a backup
cp current-prompts.json backup-$(date +%Y%m%d-%H%M%S).json

# Step 3: Edit prompts
# Open current-prompts.json in your editor
# Modify "begin_message" and "general_prompt"

# Step 4: Preview changes with dry run
retell prompts update agent_123abc \
  --source current-prompts.json \
  --dry-run

# Step 5: Review the diff output
# The dry run shows exactly what will change

# Step 6: Apply changes
retell prompts update agent_123abc \
  --source current-prompts.json

# Step 7: Publish agent
retell agents publish agent_123abc --version 15 --description "Prompt update"
```

### Iterative Prompt Refinement

```bash
#!/bin/bash
# refine-prompts.sh - Iterative prompt improvement workflow

AGENT_ID="agent_123abc"
VERSION=1

while true; do
  # Pull current prompts
  retell prompts pull $AGENT_ID --output "prompts-v${VERSION}.json"

  echo "Edit prompts-v${VERSION}.json and press Enter when done..."
  read

  # Preview changes
  retell prompts update $AGENT_ID \
    --source "prompts-v${VERSION}.json" \
    --dry-run

  echo "Apply changes? (y/n)"
  read apply

  if [ "$apply" = "y" ]; then
    retell prompts update $AGENT_ID --source "prompts-v${VERSION}.json"
    retell agents publish $AGENT_ID
    echo "Version ${VERSION} published"
    VERSION=$((VERSION + 1))
  else
    echo "Changes discarded"
  fi

  echo "Continue refining? (y/n)"
  read continue
  [ "$continue" != "y" ] && break
done
```

## Bulk Prompt Management

### Update Multiple Agents

```bash
#!/bin/bash
# bulk-update.sh - Update prompts for multiple agents

# List of agent IDs
AGENTS=(
  "agent_123abc"
  "agent_456def"
  "agent_789ghi"
)

# Pull prompts for all agents
for agent_id in "${AGENTS[@]}"; do
  echo "Pulling prompts for $agent_id..."
  retell prompts pull $agent_id --output "prompts-${agent_id}.json"
done

echo "Edit all prompt files, then press Enter to continue..."
read

# Update all agents
for agent_id in "${AGENTS[@]}"; do
  echo "Updating $agent_id..."

  # Dry run first
  retell prompts update $agent_id \
    --source "prompts-${agent_id}.json" \
    --dry-run | tee "diff-${agent_id}.json"
done

echo "Review diffs above. Proceed with updates? (y/n)"
read proceed

if [ "$proceed" = "y" ]; then
  for agent_id in "${AGENTS[@]}"; do
    echo "Publishing $agent_id..."
    retell prompts update $agent_id --source "prompts-${agent_id}.json"
    retell agents publish $agent_id
  done
  echo "All agents updated and published"
else
  echo "Bulk update cancelled"
fi
```

### Sync Prompts Across Agents

Apply consistent changes across multiple agents:

```bash
#!/bin/bash
# sync-common-prompts.sh - Apply common changes to all agents

# Common prefix to add to all agent prompts
COMMON_INSTRUCTIONS="Always be polite and professional. If you don't know the answer, say so clearly."

# Get all Retell LLM agents
retell agents list | jq -r '.[] | select(.response_engine.type == "retell-llm") | .agent_id' | while read agent_id; do
  echo "Processing $agent_id..."

  # Pull current prompts
  retell prompts pull $agent_id --output "temp-${agent_id}.json"

  # Modify general_prompt to include common instructions
  jq --arg instructions "$COMMON_INSTRUCTIONS" \
    '.general_prompt = ($instructions + "\n\n" + .general_prompt)' \
    "temp-${agent_id}.json" > "updated-${agent_id}.json"

  # Update agent
  retell prompts update $agent_id --source "updated-${agent_id}.json"
  retell agents publish $agent_id

  # Cleanup
  rm "temp-${agent_id}.json" "updated-${agent_id}.json"
done

echo "All agents synchronized"
```

## Version Control for Prompts

### Git-Based Prompt Management

```bash
# Initialize git repository for prompts
mkdir retell-prompts && cd retell-prompts
git init

# Create directory structure
mkdir -p agents

# Pull all agent prompts
retell agents list | jq -r '.[].agent_id' | while read agent_id; do
  retell prompts pull $agent_id --output "agents/${agent_id}.json"
done

# Commit initial version
git add agents/
git commit -m "Initial commit: current agent prompts"

# Create a new branch for changes
git checkout -b update-support-agent

# Edit prompts
vim agents/agent_123abc.json

# Review changes
git diff

# Commit changes
git add agents/agent_123abc.json
git commit -m "Update support agent: improve greeting message"

# Apply changes to Retell
retell prompts update agent_123abc --source agents/agent_123abc.json
retell agents publish agent_123abc --version 15

# Merge to main
git checkout main
git merge update-support-agent
```

### Automated Prompt Backups

```bash
#!/bin/bash
# backup-prompts.sh - Daily automated prompt backups

BACKUP_DIR="prompt-backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Pull all agent prompts
retell agents list | jq -r '.[].agent_id' | while read agent_id; do
  agent_name=$(retell agents info $agent_id | jq -r '.agent_name' | tr ' ' '-')
  retell prompts pull $agent_id --output "$BACKUP_DIR/${agent_id}-${agent_name}.json"
done

# Create archive
tar -czf "prompt-backups-$(date +%Y%m%d).tar.gz" "$BACKUP_DIR"

echo "Backup complete: $BACKUP_DIR"

# Optional: upload to cloud storage
# aws s3 cp "prompt-backups-$(date +%Y%m%d).tar.gz" s3://my-bucket/retell-backups/
```

## Testing Prompt Changes

### Compare Before and After

```bash
#!/bin/bash
# compare-prompts.sh - Compare prompt changes

AGENT_ID="agent_123abc"

# Pull current prompts
retell prompts pull $AGENT_ID --output before.json

# Make changes (edit the file)
echo "Edit before.json, save as after.json, then press Enter..."
read

# Show differences
echo "=== Changes ==="
diff <(jq -S . before.json) <(jq -S . after.json)

# Dry run to see what will change
echo "=== Dry Run ==="
retell prompts update $AGENT_ID --source after.json --dry-run

echo "Apply changes? (y/n)"
read apply

if [ "$apply" = "y" ]; then
  retell prompts update $AGENT_ID --source after.json
  retell agents publish $AGENT_ID
  echo "Changes applied"
else
  echo "Changes discarded"
fi
```

### Test Prompts with Sample Calls

```bash
#!/bin/bash
# test-prompts.sh - Test prompt changes with sample calls

AGENT_ID="agent_123abc"
TEST_CALLS=10

# Update prompts
retell prompts update $AGENT_ID --source new-prompts.json
retell agents publish $AGENT_ID

echo "Agent updated. Make $TEST_CALLS test calls, then press Enter..."
read

# Get recent calls
retell transcripts list --limit $TEST_CALLS > test-calls.json

# Analyze each call
jq -r '.[].call_id' test-calls.json | while read call_id; do
  retell transcripts analyze $call_id > "analysis-${call_id}.json"
done

# Generate test report
jq -s '{
  total_calls: length,
  successful: [.[] | select(.analysis.successful == true)] | length,
  avg_latency_e2e: ([.[] | .performance.latency_p50_ms.e2e] | add / length),
  avg_cost: ([.[] | .cost.total] | add / length),
  sentiment_distribution: group_by(.analysis.sentiment) | map({sentiment: .[0].analysis.sentiment, count: length})
}' analysis-*.json > test-report.json

echo "Test report:"
cat test-report.json

# Cleanup
rm analysis-*.json
```

## A/B Testing Prompts

### Create Two Agent Variants

```bash
#!/bin/bash
# ab-test-setup.sh - Set up A/B test with two prompt variants

AGENT_A="agent_123abc"
AGENT_B="agent_456def"

# Pull prompts from Agent A
retell prompts pull $AGENT_A --output prompts-a.json

# Create variant B
cp prompts-a.json prompts-b.json

# Edit prompts-b.json with variant B changes
echo "Edit prompts-b.json with variant B, then press Enter..."
read

# Apply prompts to Agent B
retell prompts update $AGENT_B --source prompts-b.json
retell agents publish $AGENT_B

echo "A/B test agents ready:"
echo "  Agent A (control): $AGENT_A"
echo "  Agent B (variant): $AGENT_B"
```

### Analyze A/B Test Results

```bash
#!/bin/bash
# ab-test-analysis.sh - Compare performance of two agents

AGENT_A="agent_123abc"
AGENT_B="agent_456def"
SAMPLE_SIZE=50

# Get calls for both agents
retell transcripts list --limit 1000 | \
  jq --arg agent_a "$AGENT_A" --arg agent_b "$AGENT_B" \
    '[.[] | select(.agent_id == $agent_a or .agent_id == $agent_b)] | .[:100]' \
  > ab-test-calls.json

# Analyze calls
jq -r '.[].call_id' ab-test-calls.json | while read call_id; do
  retell transcripts analyze $call_id > "ab-analysis-${call_id}.json"
done

# Compare results
jq -s --arg agent_a "$AGENT_A" --arg agent_b "$AGENT_B" '
  {
    agent_a: {
      id: $agent_a,
      calls: [.[] | select(.metadata.agent_id == $agent_a)] | length,
      success_rate: ([.[] | select(.metadata.agent_id == $agent_a and .analysis.successful == true)] | length) / ([.[] | select(.metadata.agent_id == $agent_a)] | length),
      avg_latency: ([.[] | select(.metadata.agent_id == $agent_a) | .performance.latency_p50_ms.e2e] | add / length),
      avg_cost: ([.[] | select(.metadata.agent_id == $agent_a) | .cost.total] | add / length),
      positive_sentiment: ([.[] | select(.metadata.agent_id == $agent_a and .analysis.sentiment == "positive")] | length)
    },
    agent_b: {
      id: $agent_b,
      calls: [.[] | select(.metadata.agent_id == $agent_b)] | length,
      success_rate: ([.[] | select(.metadata.agent_id == $agent_b and .analysis.successful == true)] | length) / ([.[] | select(.metadata.agent_id == $agent_b)] | length),
      avg_latency: ([.[] | select(.metadata.agent_id == $agent_b) | .performance.latency_p50_ms.e2e] | add / length),
      avg_cost: ([.[] | select(.metadata.agent_id == $agent_b) | .cost.total] | add / length),
      positive_sentiment: ([.[] | select(.metadata.agent_id == $agent_b and .analysis.sentiment == "positive")] | length)
    }
  }
' ab-analysis-*.json > ab-test-results.json

echo "A/B Test Results:"
cat ab-test-results.json

# Cleanup
rm ab-analysis-*.json
```

## Advanced Prompt Patterns

### Conditional Prompt Updates

```bash
#!/bin/bash
# conditional-update.sh - Update prompts based on performance

AGENT_ID="agent_123abc"
THRESHOLD_SUCCESS_RATE=0.8

# Get recent calls
retell transcripts list --limit 100 > recent-calls.json

# Calculate success rate
success_rate=$(jq --arg agent "$AGENT_ID" '
  ([.[] | select(.agent_id == $agent)] | length) as $total |
  ([.[] | select(.agent_id == $agent and .call_analysis.call_successful == true)] | length) as $successful |
  $successful / $total
' recent-calls.json)

echo "Current success rate: $success_rate"

if (( $(echo "$success_rate < $THRESHOLD_SUCCESS_RATE" | bc -l) )); then
  echo "Success rate below threshold. Updating prompts..."

  # Pull current prompts
  retell prompts pull $AGENT_ID --output current.json

  # Add improvement instructions
  jq '.general_prompt = .general_prompt + "\n\nFocus on active listening and clear communication to improve call success."' \
    current.json > improved.json

  # Apply update
  retell prompts update $AGENT_ID --source improved.json
  retell agents publish $AGENT_ID

  echo "Prompts updated to improve success rate"
else
  echo "Success rate is good. No changes needed."
fi
```

### Scheduled Prompt Rotation

```bash
#!/bin/bash
# rotate-prompts.sh - Rotate between different prompt versions

AGENT_ID="agent_123abc"
PROMPT_DIR="prompt-variants"

# Array of prompt files
PROMPTS=(
  "$PROMPT_DIR/professional.json"
  "$PROMPT_DIR/friendly.json"
  "$PROMPT_DIR/concise.json"
)

# Current index file
INDEX_FILE=".current-prompt-index"

# Read current index
if [ -f "$INDEX_FILE" ]; then
  CURRENT_INDEX=$(cat "$INDEX_FILE")
else
  CURRENT_INDEX=0
fi

# Calculate next index
NEXT_INDEX=$(( (CURRENT_INDEX + 1) % ${#PROMPTS[@]} ))

# Apply next prompt
echo "Rotating to prompt: ${PROMPTS[$NEXT_INDEX]}"
retell prompts update $AGENT_ID --source "${PROMPTS[$NEXT_INDEX]}"
retell agents publish $AGENT_ID

# Save new index
echo $NEXT_INDEX > "$INDEX_FILE"

echo "Prompt rotation complete"
```

## Best Practices

### 1. Always Use Dry Run First

```bash
# GOOD: Preview changes before applying
retell prompts update agent_123abc --source prompts.json --dry-run
retell prompts update agent_123abc --source prompts.json

# BAD: Apply changes without preview
retell prompts update agent_123abc --source prompts.json
```

### 2. Keep Version History

```bash
# Save with timestamps
retell prompts pull agent_123abc --output "prompts-$(date +%Y%m%d-%H%M%S).json"

# Use git for version control
git add prompts/
git commit -m "Update: improve greeting message"
```

### 3. Test Before Deploying

```bash
# Pull prompts
retell prompts pull agent_123abc --output test-prompts.json

# Edit and test on a staging agent first
retell prompts update agent_staging --source test-prompts.json
retell agents publish agent_staging

# Test with sample calls

# Deploy to production
retell prompts update agent_123abc --source test-prompts.json
retell agents publish agent_123abc --version 15
```

### 4. Document Changes

```bash
# Create a changelog
cat >> CHANGELOG.md <<EOF
## $(date +%Y-%m-%d) - Agent agent_123abc

### Changed
- Updated begin_message to be more welcoming
- Added specific instructions for handling refunds

### Metrics (before → after)
- Success rate: 82% → 89%
- Avg latency: 520ms → 485ms
EOF
```

### 5. Monitor After Changes

```bash
# After updating prompts, monitor performance
retell prompts update agent_123abc --source new-prompts.json
retell agents publish agent_123abc

# Wait for some calls
sleep 3600  # 1 hour

# Check performance
retell transcripts list --limit 50 | \
  jq --arg agent "agent_123abc" \
    '[.[] | select(.agent_id == $agent)] | {
      total_calls: length,
      successful: [.[] | select(.call_analysis.call_successful == true)] | length,
      success_rate: ([.[] | select(.call_analysis.call_successful == true)] | length) / length
    }'
```

## Troubleshooting

### "Type mismatch" Error

```bash
# Check agent type
retell agents info agent_123abc | jq '.response_engine.type'

# Ensure prompt file has matching type
jq '.type' prompts.json

# Pull fresh prompts if needed
retell prompts pull agent_123abc --output fresh-prompts.json
```

### Changes Not Reflecting

```bash
# Ensure you published the agent
retell agents publish agent_123abc

# Verify the update was applied
retell agents info agent_123abc | jq '.response_engine.general_prompt'
```

### Invalid JSON

```bash
# Validate JSON before updating
jq . prompts.json

# Fix formatting
jq . prompts.json > formatted-prompts.json
```

## Next Steps

- Learn about basic usage in [basic-usage.md](basic-usage.md)
- Troubleshoot issues in [troubleshooting.md](troubleshooting.md)
- Read the complete [User Guide](../user-guide.md)
