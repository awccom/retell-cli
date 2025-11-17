# Phase 6: Diff Command & Dry Run

**Duration:** 3-4 days
**Dependencies:** Phase 1 (requires `generateDiff()` utility)

---

## Objective

Add diff inspection and dry-run capabilities for prompt updates, preventing accidental changes and enabling AI-assisted prompt refinement workflows.

---

## Two Components

1. **New command:** `retell prompts diff <agent-id>`
2. **Enhancement:** Add `--dry-run` flag to `retell prompts update`

---

## Part 1: Diff Command (Days 1-2)

### Command Structure

```bash
retell prompts diff <agent-id> [options]
```

**Options:**
- `--source <path>` - Custom path to local prompts (default: `.retell-prompts/<agent-id>/`)
- `--fields <fields>` - Select specific diff fields

---

### Implementation

**File:** `src/commands/prompts/diff.ts`

```typescript
import { Command } from 'commander';
import { getRetellClient } from '../../services/retell-client';
import { resolvePromptSource } from '../../services/prompt-resolver';
import { generateDiff } from '../../services/prompt-diff';
import { outputJson, handleSdkError } from '../../services/output-formatter';

interface DiffOptions {
  source?: string;
  fields?: string;
}

export function createDiffCommand() {
  return new Command('diff')
    .description('Show differences between local and remote prompts')
    .argument('<agent-id>', 'Agent ID to compare prompts for')
    .option('--source <path>', 'Path to local prompts directory')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .action(async (agentId: string, options: DiffOptions) => {
      try {
        const client = getRetellClient();

        // 1. Fetch remote prompts
        const remotePrompts = await resolvePromptSource(agentId);

        // 2. Load local prompts
        const localPath = options.source || `.retell-prompts/${agentId}`;
        const localPrompts = await loadLocalPrompts(localPath, remotePrompts.type);

        // 3. Generate diff
        const diff = generateDiff(localPrompts, remotePrompts);

        // 4. Apply field filtering if requested
        const output = options.fields
          ? filterFields(diff, options.fields.split(',').map(f => f.trim()))
          : diff;

        outputJson(output);
      } catch (error) {
        handleSdkError(error);
      }
    });
}

async function loadLocalPrompts(path: string, type: 'retell-llm' | 'conversation-flow') {
  // Similar logic to prompts/pull.ts but for reading
  // Returns PromptSource structure
}
```

---

### Diff Output Structure

```typescript
interface DiffResult {
  agent_id: string;
  agent_type: 'retell-llm' | 'conversation-flow';
  has_changes: boolean;
  changes: {
    [key: string]: {
      old: string | object | null;
      new: string | object | null;
      change_type: 'added' | 'removed' | 'modified';
    }
  };
}
```

### Example Output:

```json
{
  "agent_id": "agent_123",
  "agent_type": "retell-llm",
  "has_changes": true,
  "changes": {
    "general_prompt": {
      "old": "You are a helpful assistant...",
      "new": "You are a helpful assistant specializing in troubleshooting...",
      "change_type": "modified"
    },
    "states.troubleshooting": {
      "old": "Help the user resolve their issue.",
      "new": "Help the user resolve their issue. Start by asking what they've already tried.",
      "change_type": "modified"
    },
    "states.escalation": {
      "old": null,
      "new": "When user asks for a human, transfer to support.",
      "change_type": "added"
    }
  }
}
```

---

### Task Breakdown (Diff Command)

#### Day 1:
- [ ] Create `src/commands/prompts/diff.ts`
- [ ] Implement `loadLocalPrompts()` function
  - Reuse/refactor code from `prompts/pull.ts`
  - Handle retell-llm and conversation-flow types
- [ ] Integrate `generateDiff()` from Phase 1
- [ ] Add basic error handling

#### Day 2:
- [ ] Register command in `src/index.ts`
- [ ] Add field filtering support
- [ ] Handle edge cases:
  - Agent not found
  - Local directory doesn't exist
  - Type mismatch (local vs remote)
  - Empty/missing files
- [ ] Write tests
- [ ] Update help text

---

## Part 2: Dry Run (Days 3-4)

### Enhancement to Existing Command

**File:** `src/commands/prompts/update.ts`

Add `--dry-run` flag to show what would change without applying.

```typescript
.option('--dry-run', 'Show changes without applying them')

// In action handler:
if (options.dryRun) {
  // Reuse diff logic
  const remotePrompts = await resolvePromptSource(agentId);
  const localPrompts = await loadLocalPrompts(localPath, remotePrompts.type);
  const diff = generateDiff(localPrompts, remotePrompts);

  outputJson({
    message: 'Dry run - no changes applied',
    ...diff
  });
  return;
}

// Otherwise, continue with actual update...
```

---

### Task Breakdown (Dry Run)

#### Day 3:
- [ ] Add `--dry-run` option to `update.ts`
- [ ] Refactor to share diff logic with diff command
  - Consider creating shared helper function
  - Move `loadLocalPrompts()` to shared utility?
- [ ] Test dry run with retell-llm agents
- [ ] Test dry run with conversation-flow agents

#### Day 4:
- [ ] Test interaction with `--source` flag
- [ ] Add confirmation message
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Final polish and edge case handling

---

## Deliverables

- [ ] `src/commands/prompts/diff.ts` - New diff command
- [ ] Enhanced `src/commands/prompts/update.ts` - With --dry-run
- [ ] `src/services/prompt-diff.ts` - Enhanced if needed
- [ ] Shared utilities for loading prompts
- [ ] Updated `src/index.ts` - Command registration
- [ ] Documentation and examples

---

## Testing Requirements

### Diff Command Tests

- [ ] **Show changes for retell-llm agent**
  ```bash
  retell prompts diff agent_123
  # Expected: Structured diff showing changes
  ```

- [ ] **Show changes for conversation-flow agent**
  ```bash
  retell prompts diff agent_456
  # Expected: Diff for flow prompts and nodes
  ```

- [ ] **No changes scenario**
  ```bash
  retell prompts diff agent_789
  # Expected: {"has_changes": false, "changes": {}}
  ```

- [ ] **Custom source path**
  ```bash
  retell prompts diff agent_123 --source ./custom-prompts/agent_123
  # Expected: Load from custom path
  ```

- [ ] **Field filtering**
  ```bash
  retell prompts diff agent_123 --fields has_changes,changes.general_prompt
  # Expected: Only specified fields
  ```

---

### Edge Case Tests (Diff)

- [ ] **Local directory doesn't exist**
  ```bash
  retell prompts diff nonexistent_agent
  # Expected: Error with helpful message
  ```

- [ ] **Agent not found in API**
  ```bash
  retell prompts diff invalid_agent_id
  # Expected: API error handled gracefully
  ```

- [ ] **Type mismatch**
  - Local is retell-llm, remote is conversation-flow
  - Expected: Error or warning

- [ ] **New files locally** (not in remote)
  - Add new state file locally
  - Expected: Shown as "added" in diff

- [ ] **Deleted files locally** (exist in remote)
  - Remove state file locally
  - Expected: Shown as "removed" in diff

- [ ] **Large diffs** (many changes)
  - Test performance
  - Ensure output is readable

---

### Dry Run Tests

- [ ] **Dry run shows diff without applying**
  ```bash
  retell prompts update agent_123 --dry-run
  # Expected: Shows diff, confirms no changes applied
  ```

- [ ] **Verify no actual update happens**
  - Run with --dry-run
  - Check API to confirm prompts unchanged

- [ ] **Dry run with --source flag**
  ```bash
  retell prompts update agent_123 --source ./custom --dry-run
  # Expected: Uses custom path, shows diff
  ```

- [ ] **Dry run returns same structure as diff command**
  - Output should be consistent
  - AI agents can parse either command

---

### Integration Tests

- [ ] **Full workflow:**
  1. Pull prompts: `retell prompts pull agent_123`
  2. Modify local files
  3. Check diff: `retell prompts diff agent_123`
  4. Dry run: `retell prompts update agent_123 --dry-run`
  5. Apply: `retell prompts update agent_123`
  6. Verify: `retell prompts diff agent_123` (should show no changes)

---

## Example Workflows

### Workflow 1: AI-Assisted Prompt Refinement

```bash
# 1. AI identifies problematic calls
retell transcripts search --status error --agent-id agent_123 --fields call_id

# 2. AI analyzes hotspots
retell transcripts analyze call_abc --hotspots-only

# 3. AI modifies local prompts based on issues
# (AI edits .retell-prompts/agent_123/general_prompt.md)

# 4. AI shows what changed
retell prompts diff agent_123

# 5. Human reviews diff output

# 6. AI applies changes
retell prompts update agent_123
```

### Workflow 2: Safe Manual Updates

```bash
# 1. Pull current prompts
retell prompts pull agent_123

# 2. Edit prompts locally
vim .retell-prompts/agent_123/general_prompt.md

# 3. Preview changes
retell prompts diff agent_123

# 4. Double-check with dry run
retell prompts update agent_123 --dry-run

# 5. Apply if satisfied
retell prompts update agent_123
```

---

## Use Cases

1. **Prevent Accidental Updates:** See exactly what will change before pushing
2. **AI Justification:** AI can explain its changes by showing diff
3. **Code Review for Prompts:** Review prompt changes like code PRs
4. **Debugging:** Compare local vs remote when troubleshooting
5. **Audit Trail:** Document what changed and when

---

## Documentation Updates

Add to README.md:

```markdown
### Prompt Diffing & Dry Run

Preview changes before applying prompt updates:

#### View differences:
\`\`\`bash
# Compare local and remote prompts
retell prompts diff agent_123

# Use custom source directory
retell prompts diff agent_123 --source ./my-prompts/agent_123
\`\`\`

#### Dry run before updating:
\`\`\`bash
# Show what would change without applying
retell prompts update agent_123 --dry-run

# Review, then apply
retell prompts update agent_123
\`\`\`

**Output includes:**
- Which prompts changed (general_prompt, states, nodes, etc.)
- Old vs new values
- Change types (added, removed, modified)
```

---

## Shared Code Refactoring

Consider creating shared utilities to avoid duplication:

**File:** `src/services/prompt-loader.ts` (new)

```typescript
export async function loadLocalPrompts(
  agentId: string,
  sourcePath?: string
): Promise<PromptSource> {
  // Shared logic for loading local prompts
  // Used by: diff.ts, update.ts
}

export async function loadRemotePrompts(
  agentId: string
): Promise<PromptSource> {
  // Wrapper around resolvePromptSource
  // Used by: diff.ts, update.ts (for dry-run)
}
```

This keeps code DRY and maintainable.

---

## Success Criteria

- [ ] Diff command shows accurate changes for both agent types
- [ ] Dry-run prevents accidental updates
- [ ] Output structure is consistent and parseable
- [ ] Works with custom source paths
- [ ] Handles all edge cases gracefully
- [ ] No code duplication (shared utilities)
- [ ] All tests passing
- [ ] Documentation updated with examples

---

## Future Enhancements

Consider for v1.1.0:
- **Unified diff format:** Show line-by-line diffs (like git diff)
- **Colored output:** Highlight additions/deletions in terminal
- **Interactive mode:** Let user approve each change
- **Rollback:** Undo last prompt update
- **History:** Track prompt change history

---

## Final Phase Complete!

After this phase, all v1.0.1 features are implemented. Proceed to:
- Cross-phase integration testing
- Documentation review
- Release preparation
