# Phase 6 Task Handoff: Diff Command & Dry Run

**Project:** Retell CLI v1.0.1
**Phase:** 6 of 6 (Final Phase!)
**Estimated Duration:** 3-4 days
**Status:** Ready to start

---

## 🎯 Mission

Implement diff inspection and dry-run capabilities for prompt updates, preventing accidental changes and enabling AI-assisted prompt refinement workflows.

---

## ✅ What's Been Completed (Phases 1-5)

### Phase 1: Foundation & Utilities ✅
- `filterFields()` utility for field selection
- `generateDiff()` utility for prompt diffing (NOTE: This was planned but NOT implemented yet - you'll build it in Phase 6!)
- TypeScript types and interfaces

### Phase 2: Field Selection ✅
- Added `--fields` option to all transcript and agent commands
- 50-90% token reduction for AI workflows

### Phase 3: Raw Output ✅
- Added `--raw` flag to return unmodified API responses
- Useful for debugging and API alignment

### Phase 4: Hotspots Detection ✅
- Added `--hotspots-only` view to identify conversation issues
- Detects latency spikes, interruptions, long silences

### Phase 5: Search Command ✅ (Just merged!)
- New `retell transcripts search` command
- Hybrid filtering (API + client-side)
- Eliminates need for jq/grep

---

## 📋 Your Phase 6 Mission

Build TWO components:

### 1. **New Command:** `retell prompts diff <agent-id>`
Show differences between local and remote prompts

### 2. **Enhancement:** Add `--dry-run` flag to `retell prompts update`
Preview changes without applying them

---

## 🚀 Getting Started

### Step 1: Checkout New Branch from Main

```bash
# Make sure you're on main and up-to-date
git checkout main
git pull origin main

# Create your Phase 6 feature branch
git checkout -b feature/phase-6-diff-dry-run

# Push to set up remote tracking
git push -u origin feature/phase-6-diff-dry-run
```

### Step 2: Read Supporting Documentation

**CRITICAL:** Read these files in order before coding:

1. **Primary Phase Document**
   - `localdocs/phase-6-diff-dry-run.md` - Complete implementation spec

2. **Supporting Documents**
   - `localdocs/v1.0.1-development-plan.md` - Overall v1.0.1 context
   - `localdocs/git-workflow.md` - Git workflow and PR guidelines
   - `localdocs/README.md` - Documentation overview

3. **Reference Implementation**
   - `src/commands/prompts/pull.ts` - Understand prompt loading structure
   - `src/commands/prompts/update.ts` - You'll enhance this with --dry-run
   - `src/services/prompt-resolver.ts` - Resolves remote prompts

---

## 📝 Implementation Checklist

### Part 1: Diff Command (Days 1-2)

#### Day 1: Core Implementation
- [ ] Create `src/services/prompt-diff.ts`
  - [ ] Implement `generateDiff(local, remote)` function
  - [ ] Support both retell-llm and conversation-flow types
  - [ ] Return structured diff with old/new values and change_type

- [ ] Create `src/commands/prompts/diff.ts`
  - [ ] Accept `<agent-id>` as required argument
  - [ ] Add `--source <path>` option (default: `.retell-prompts/<agent-id>/`)
  - [ ] Add `--fields <fields>` option for field filtering
  - [ ] Fetch remote prompts via `resolvePromptSource(agentId)`
  - [ ] Load local prompts from directory
  - [ ] Generate diff using `generateDiff()`
  - [ ] Output structured JSON

- [ ] Create `loadLocalPrompts()` helper function
  - [ ] Reuse/refactor code from `src/commands/prompts/pull.ts`
  - [ ] Handle both retell-llm and conversation-flow types
  - [ ] Return same structure as remote prompts for comparison

#### Day 2: Integration & Testing
- [ ] Register command in `src/index.ts`
  - [ ] Add as subcommand under `prompts`
  - [ ] Wire up options and action handler

- [ ] Handle edge cases:
  - [ ] Agent not found (API error)
  - [ ] Local directory doesn't exist
  - [ ] Type mismatch (local vs remote)
  - [ ] Empty/missing files
  - [ ] No changes scenario (`has_changes: false`)

- [ ] Write unit tests: `src/commands/prompts/diff.test.ts`
  - [ ] Test diff generation for retell-llm agents
  - [ ] Test diff generation for conversation-flow agents
  - [ ] Test "no changes" scenario
  - [ ] Test with custom source path
  - [ ] Test field filtering integration
  - [ ] Test all edge cases

- [ ] Update CLI help text with examples

---

### Part 2: Dry Run Enhancement (Days 3-4)

#### Day 3: Implementation
- [ ] Enhance `src/commands/prompts/update.ts`
  - [ ] Add `--dry-run` boolean option
  - [ ] When `--dry-run` is set:
    - [ ] Load remote prompts via `resolvePromptSource()`
    - [ ] Load local prompts (reuse helper from diff command)
    - [ ] Generate diff using `generateDiff()`
    - [ ] Output diff with message: "Dry run - no changes applied"
    - [ ] Return early (don't apply update)
  - [ ] Share logic with diff command (consider extracting shared helpers)

- [ ] Refactor for code reuse
  - [ ] Consider creating `src/services/prompt-loader.ts`
  - [ ] Move `loadLocalPrompts()` to shared utility
  - [ ] Both diff.ts and update.ts import from shared location

- [ ] Test dry run with both agent types
  - [ ] Test with retell-llm agents
  - [ ] Test with conversation-flow agents

#### Day 4: Testing & Documentation
- [ ] Test interaction with `--source` flag
  - [ ] `retell prompts update <agent-id> --source ./custom --dry-run`

- [ ] Write integration tests: `src/commands/prompts/update.test.ts` (enhance existing)
  - [ ] Test `--dry-run` shows diff without applying
  - [ ] Verify no API update happens when `--dry-run` is set
  - [ ] Test `--dry-run` works with `--source` flag
  - [ ] Verify output structure matches diff command

- [ ] Update documentation
  - [ ] Add section to README.md with examples
  - [ ] Update CHANGELOG.md with Phase 6 features
  - [ ] Add help text examples

- [ ] Final polish and edge case handling
  - [ ] Error messages are clear and actionable
  - [ ] All edge cases covered
  - [ ] Code is well-commented

---

## 🧪 Testing Requirements

### Diff Command Tests

**Basic Functionality:**
```bash
# Show changes for retell-llm agent
retell prompts diff agent_123

# Show changes for conversation-flow agent
retell prompts diff agent_456

# No changes scenario
retell prompts diff agent_789
# Expected: {"has_changes": false, "changes": {}}

# Custom source path
retell prompts diff agent_123 --source ./custom-prompts/agent_123

# Field filtering
retell prompts diff agent_123 --fields has_changes,changes.general_prompt
```

**Edge Cases:**
- [ ] Local directory doesn't exist → Clear error
- [ ] Agent not found in API → API error handled gracefully
- [ ] Type mismatch (local retell-llm, remote conversation-flow) → Error or warning
- [ ] New files locally (not in remote) → Shown as "added"
- [ ] Deleted files locally (exist in remote) → Shown as "removed"
- [ ] Large diffs (many changes) → Performance is acceptable

---

### Dry Run Tests

**Basic Functionality:**
```bash
# Dry run shows diff without applying
retell prompts update agent_123 --dry-run

# Verify no actual update happens
# (Manually check API to confirm prompts unchanged)

# Dry run with --source flag
retell prompts update agent_123 --source ./custom --dry-run
```

**Integration:**
- [ ] Dry run returns same structure as diff command
- [ ] Output includes "Dry run - no changes applied" message
- [ ] No API calls to update LLM or conversation flow when dry-run set

---

### Full Workflow Test

**End-to-End Scenario:**
```bash
# 1. Pull prompts
retell prompts pull agent_123

# 2. Modify local files
vim .retell-prompts/agent_123/general_prompt.md

# 3. Check diff
retell prompts diff agent_123
# Expected: Shows modified general_prompt

# 4. Dry run
retell prompts update agent_123 --dry-run
# Expected: Same diff output

# 5. Apply changes
retell prompts update agent_123
# Expected: Prompts updated

# 6. Verify no changes remain
retell prompts diff agent_123
# Expected: {"has_changes": false}
```

---

## 📊 Expected Output Structures

### Diff Command Output

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

### Dry Run Output

```json
{
  "message": "Dry run - no changes applied",
  "agent_id": "agent_123",
  "agent_type": "retell-llm",
  "has_changes": true,
  "changes": {
    "general_prompt": {
      "old": "...",
      "new": "...",
      "change_type": "modified"
    }
  }
}
```

---

## 🎨 Code Quality Guidelines

### Type Safety
- [ ] Use proper TypeScript interfaces (no `any` types unless necessary)
- [ ] Define clear interfaces for DiffResult, ChangeDetail, etc.
- [ ] Add JSDoc comments for all public functions

### Error Handling
- [ ] Use try/catch blocks appropriately
- [ ] Use `handleSdkError()` for API errors
- [ ] Use `outputError()` for validation errors
- [ ] Provide clear, actionable error messages

### Code Organization
- [ ] Keep functions small and focused (single responsibility)
- [ ] Extract shared logic to utilities
- [ ] Use descriptive variable and function names
- [ ] Add comments for complex logic

### Security
- [ ] Validate agent IDs (prevent path traversal)
- [ ] Handle file system errors gracefully
- [ ] Don't leak sensitive information in error messages

---

## 📚 Key Files to Work With

### Files You'll Create
- `src/services/prompt-diff.ts` (new) - Diff generation logic
- `src/commands/prompts/diff.ts` (new) - Diff command implementation
- `src/commands/prompts/diff.test.ts` (new) - Unit tests
- `src/services/prompt-loader.ts` (optional) - Shared prompt loading utilities

### Files You'll Modify
- `src/commands/prompts/update.ts` - Add --dry-run flag
- `src/index.ts` - Register diff command
- `README.md` - Add documentation
- `CHANGELOG.md` - Document Phase 6 features

### Files to Reference
- `src/commands/prompts/pull.ts` - Understand prompt structure
- `src/services/prompt-resolver.ts` - How to fetch remote prompts
- `src/services/output-formatter.ts` - Output helpers

---

## 🏁 When You're Done

### Step 1: Run All Tests
```bash
# Run test suite
npm test

# Verify all tests passing
# Expected: 110+ tests passing (78 existing + your new tests)

# Build to check for TypeScript errors
npm run build
```

### Step 2: Update Documentation
- [ ] Update `README.md` with new features
- [ ] Update `CHANGELOG.md` with Phase 6 changes
- [ ] Ensure examples are accurate and tested

### Step 3: Commit and Push
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "$(cat <<'EOF'
feat(phase-6): add prompts diff command and dry-run flag

Add diff inspection and dry-run capabilities for prompt updates:
- New `retell prompts diff <agent-id>` command
- Add `--dry-run` flag to `retell prompts update`
- Support for both retell-llm and conversation-flow types
- Comprehensive diff output with old/new values
- Field filtering integration
- Extensive test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push to remote
git push origin feature/phase-6-diff-dry-run
```

### Step 4: Create Pull Request
```bash
gh pr create \
  --base main \
  --head feature/phase-6-diff-dry-run \
  --title "Phase 6: Diff Command & Dry Run" \
  --body "$(cat <<'EOF'
## Phase 6: Diff Command & Dry Run

Final phase of v1.0.1! Adds diff inspection and dry-run capabilities for safe prompt updates.

### Changes
- ✅ Added `retell prompts diff <agent-id>` command
- ✅ Added `--dry-run` flag to `retell prompts update`
- ✅ Implemented `generateDiff()` utility for prompt comparison
- ✅ Support for both retell-llm and conversation-flow types
- ✅ Field filtering integration (--fields)
- ✅ Comprehensive diff output structure
- ✅ Edge case handling (missing files, type mismatches, etc.)
- ✅ Unit and integration tests
- ✅ Documentation updated

### Features

**Diff Command:**
```bash
# Compare local and remote prompts
retell prompts diff agent_123

# Use custom source directory
retell prompts diff agent_123 --source ./my-prompts/agent_123

# Filter fields
retell prompts diff agent_123 --fields has_changes,changes.general_prompt
```

**Dry Run:**
```bash
# Preview changes before applying
retell prompts update agent_123 --dry-run

# Review, then apply
retell prompts update agent_123
```

### Use Cases
1. **Prevent Accidental Updates:** See exactly what will change before pushing
2. **AI Justification:** AI can explain its changes by showing diff
3. **Code Review for Prompts:** Review prompt changes like code PRs
4. **Debugging:** Compare local vs remote when troubleshooting
5. **Audit Trail:** Document what changed and when

### Testing
- [x] Unit tests for diff generation (retell-llm and conversation-flow)
- [x] Unit tests for diff command (all options and edge cases)
- [x] Integration tests for dry-run flag
- [x] Full workflow test (pull → modify → diff → dry-run → update → verify)
- [x] All existing tests still passing (110+ total)
- [x] Edge cases handled (missing files, type mismatches, no changes)
- [x] Build successful ✅

### Examples

**Diff Output:**
```json
{
  "agent_id": "agent_123",
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

### Checklist
- [x] Code complete
- [x] All tests passing (110+ tests)
- [x] Documentation updated (README.md, CHANGELOG.md)
- [x] No breaking changes
- [x] Edge cases handled
- [x] Type safety ensured
- [x] Error handling robust
- [x] ✅ Ready to merge

### This Completes v1.0.1!
All 6 phases now complete. After merging, v1.0.1 is ready for release! 🎉

Relates to: v1.0.1 development plan, Phase 6
Phase document: localdocs/phase-6-diff-dry-run.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## 💡 Tips for Success

1. **Read Phase 6 docs FIRST** - Don't skip `localdocs/phase-6-diff-dry-run.md`
2. **Study existing code** - `pull.ts` and `update.ts` show the patterns to follow
3. **Start with diff generation** - `generateDiff()` is the foundation for both features
4. **Reuse code** - Don't duplicate prompt loading logic
5. **Test incrementally** - Don't wait until the end to run tests
6. **Handle edge cases** - Missing files, type mismatches, empty diffs, etc.
7. **Keep types strict** - Use proper interfaces, avoid `any`
8. **Write clear errors** - Users should know exactly what went wrong

---

## 🎉 Success Criteria

- [ ] Diff command shows accurate changes for both agent types
- [ ] Dry-run prevents accidental updates
- [ ] Output structure is consistent and parseable
- [ ] Works with custom source paths via --source
- [ ] Handles all edge cases gracefully
- [ ] No code duplication (shared utilities used)
- [ ] All tests passing (110+ total)
- [ ] Documentation updated with examples
- [ ] TypeScript build succeeds with no errors
- [ ] PR created and ready for review

---

## 📞 Need Help?

If you get stuck:
1. Re-read `localdocs/phase-6-diff-dry-run.md` - it has detailed implementation guidance
2. Check the existing prompts commands for patterns
3. Review Phase 5 implementation for similar patterns (search command)
4. Look at test files for examples of proper testing structure

---

## 🚀 Let's Ship Phase 6!

This is the **final phase of v1.0.1**! After this, all features are complete and ready for release.

**Good luck, and happy coding!** 🎊

---

**Phase 6 Handoff**
**Created:** 2025-11-16
**Last Updated:** 2025-11-16
**Status:** Ready to start
