# Git Workflow for v1.0.1 Development

## Branching Strategy

```
main (production)
  ↑
  └── develop (staging for v1.0.1)
        ↑
        ├── feature/phase-1-foundation
        ├── feature/phase-2-field-selection
        ├── feature/phase-3-raw-output
        ├── feature/phase-4-hotspots
        ├── feature/phase-5-search
        └── feature/phase-6-diff-dry-run
```

---

## Setup

### 1. Staging Branch (Already Created)

The `develop` branch serves as staging for v1.0.1 development.

```bash
# Already done:
git checkout -b develop

# Push to remote
git push -u origin develop
```

---

## Development Workflow

### For Each Phase

#### Step 1: Create Feature Branch

```bash
# Make sure you're on develop
git checkout develop
git pull origin develop

# Create feature branch for the phase
git checkout -b feature/phase-1-foundation
```

#### Step 2: Develop & Commit

```bash
# Make changes for the phase
# ... write code, tests, docs ...

# Commit as you go
git add .
git commit -m "feat(phase-1): implement filterFields utility"

# More commits...
git commit -m "feat(phase-1): add generateDiff utility"
git commit -m "test(phase-1): add unit tests for utilities"
```

#### Step 3: Push Feature Branch

```bash
# Push feature branch to remote
git push -u origin feature/phase-1-foundation
```

#### Step 4: Create PR to Develop

```bash
# Create PR using GitHub CLI
gh pr create \
  --base develop \
  --head feature/phase-1-foundation \
  --title "Phase 1: Foundation & Utilities" \
  --body "$(cat <<'EOF'
## Phase 1: Foundation & Utilities

Implements shared utilities for v1.0.1 features.

### Changes
- ✅ Added `filterFields()` utility for field selection
- ✅ Added `generateDiff()` utility for prompt diffing
- ✅ Added TypeScript types for new features
- ✅ Unit tests for all utilities
- ✅ Documentation updated

### Testing
- [x] All unit tests passing
- [x] Field filtering works with nested paths
- [x] Diff generation works for both agent types
- [x] No breaking changes

### Checklist
- [x] Code complete
- [x] Tests passing
- [x] Documentation updated
- [x] Ready for review

Relates to: v1.0.1 development plan
Phase document: localdocs/phase-1-foundation-utilities.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

#### Step 5: Review & Merge to Develop

```bash
# After review/approval, merge PR
# (Can be done via GitHub UI or CLI)

# Or merge locally:
git checkout develop
git merge --no-ff feature/phase-1-foundation
git push origin develop

# Delete feature branch (optional)
git branch -d feature/phase-1-foundation
git push origin --delete feature/phase-1-foundation
```

---

## Phase-by-Phase Commands

### Phase 1: Foundation & Utilities

```bash
git checkout develop
git checkout -b feature/phase-1-foundation

# ... develop phase 1 ...

git push -u origin feature/phase-1-foundation
gh pr create --base develop --head feature/phase-1-foundation \
  --title "Phase 1: Foundation & Utilities"
```

### Phase 2: Field Selection

```bash
git checkout develop
git pull origin develop  # Get Phase 1 changes
git checkout -b feature/phase-2-field-selection

# ... develop phase 2 ...

git push -u origin feature/phase-2-field-selection
gh pr create --base develop --head feature/phase-2-field-selection \
  --title "Phase 2: Field Selection"
```

### Phase 3: Raw Output

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-3-raw-output

# ... develop phase 3 ...

git push -u origin feature/phase-3-raw-output
gh pr create --base develop --head feature/phase-3-raw-output \
  --title "Phase 3: Raw Output Mode"
```

### Phase 4: Hotspots Detection

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-4-hotspots

# ... develop phase 4 ...

git push -u origin feature/phase-4-hotspots
gh pr create --base develop --head feature/phase-4-hotspots \
  --title "Phase 4: Hotspots Detection"
```

### Phase 5: Search Command

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-5-search

# ... develop phase 5 ...

git push -u origin feature/phase-5-search
gh pr create --base develop --head feature/phase-5-search \
  --title "Phase 5: Transcripts Search Command"
```

### Phase 6: Diff & Dry Run

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-6-diff-dry-run

# ... develop phase 6 ...

git push -u origin feature/phase-6-diff-dry-run
gh pr create --base develop --head feature/phase-6-diff-dry-run \
  --title "Phase 6: Diff Command & Dry Run"
```

---

## Final Release: Develop → Main

After all phases are merged into `develop` and tested:

### Step 1: Final Testing on Develop

```bash
git checkout develop
git pull origin develop

# Run full test suite
npm test

# Build and verify
npm run build

# Test the CLI locally
./dist/index.js --version
```

### Step 2: Update Version & Changelog

```bash
# Update package.json version to 1.0.1
vim package.json

# Create/update CHANGELOG.md
vim CHANGELOG.md

# Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.1"
git push origin develop
```

### Step 3: Create Release PR to Main

```bash
gh pr create \
  --base main \
  --head develop \
  --title "Release v1.0.1" \
  --body "$(cat <<'EOF'
## Release v1.0.1

This release adds token efficiency features, advanced filtering, and prompt workflow improvements for AI agents.

### New Features

#### 1. Field Selection (`--fields`)
- Reduce output size by 50-90%
- Works on all transcript and agent commands
- Supports nested field selection with dot notation

#### 2. Raw Output Mode (`--raw`)
- Return unmodified API responses
- Useful for debugging and API schema alignment

#### 3. Hotspots Detection (`--hotspots-only`)
- Identify conversation issues automatically
- Detect latency spikes, interruptions, long silences
- Focus troubleshooting on problem areas

#### 4. Search Command
- New `retell transcripts search` command
- Filter by status, agent, date range
- Eliminates need for jq/grep

#### 5. Diff & Dry Run
- New `retell prompts diff` command
- `--dry-run` flag on `retell prompts update`
- Preview changes before applying

### Testing

- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Backward compatibility verified
- ✅ Documentation updated
- ✅ All 6 phases complete

### Breaking Changes

None - all new features are opt-in via flags.

### Merged PRs

- #1 Phase 1: Foundation & Utilities
- #2 Phase 2: Field Selection
- #3 Phase 3: Raw Output Mode
- #4 Phase 4: Hotspots Detection
- #5 Phase 5: Search Command
- #6 Phase 6: Diff & Dry Run

### Timeline

Development: [start date] - [end date]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 4: Merge to Main

```bash
# After review/approval, merge the release PR
# (Can be done via GitHub UI or CLI)

# Or merge locally:
git checkout main
git merge --no-ff develop
git push origin main
```

### Step 5: Tag Release

```bash
git checkout main
git pull origin main

# Create release tag
git tag -a v1.0.1 -m "Release v1.0.1: Token efficiency and AI agent features"
git push origin v1.0.1
```

### Step 6: Publish to npm

```bash
# Build
npm run build

# Publish
npm publish

# Or with access token
npm publish --access public
```

### Step 7: Create GitHub Release

```bash
gh release create v1.0.1 \
  --title "v1.0.1 - Token Efficiency & AI Agent Features" \
  --notes-file CHANGELOG.md
```

---

## Parallel Development (Optional)

Since Phases 2-6 all depend on Phase 1 but not each other, you can work on them in parallel after Phase 1 is merged:

```bash
# After Phase 1 is merged to develop:
git checkout develop
git pull origin develop

# Create all feature branches at once
git checkout -b feature/phase-2-field-selection
git push -u origin feature/phase-2-field-selection

git checkout develop
git checkout -b feature/phase-3-raw-output
git push -u origin feature/phase-3-raw-output

git checkout develop
git checkout -b feature/phase-4-hotspots
git push -u origin feature/phase-4-hotspots

# ... etc for phases 5 and 6

# Then work on phases in any order
# Each PR merges to develop independently
```

---

## Best Practices

### Commit Messages

Use conventional commits:

```bash
# Features
git commit -m "feat(field-selection): add --fields option to transcripts list"

# Bug fixes
git commit -m "fix(diff): handle missing local directory gracefully"

# Tests
git commit -m "test(search): add integration tests for date filtering"

# Documentation
git commit -m "docs(readme): add examples for --fields flag"

# Refactoring
git commit -m "refactor(utils): extract filterFields to shared utility"
```

### PR Descriptions

Each PR should include:
- Summary of changes
- Testing checklist
- Link to phase document
- Breaking changes (if any)
- Screenshots (if UI-related)

### Code Review

Before merging each phase PR:
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Follows project conventions

---

## Troubleshooting

### Merge Conflicts

If you encounter merge conflicts when merging to develop:

```bash
git checkout feature/phase-X
git pull origin develop
# Resolve conflicts
git add .
git commit -m "fix: resolve merge conflicts with develop"
git push
```

### Rebasing Feature Branches

To keep feature branches up-to-date with develop:

```bash
git checkout feature/phase-X
git fetch origin
git rebase origin/develop
# Resolve conflicts if any
git push --force-with-lease
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start new phase | `git checkout develop && git checkout -b feature/phase-X` |
| Push feature branch | `git push -u origin feature/phase-X` |
| Create PR to develop | `gh pr create --base develop --head feature/phase-X` |
| Merge to develop | `git checkout develop && git merge --no-ff feature/phase-X` |
| Release to main | `gh pr create --base main --head develop` |
| Tag release | `git tag -a v1.0.1 -m "..."` |

---

## Current Branch Status

```bash
# Check current branch
git branch

# View all branches
git branch -a

# Check branch status
git status
```

Expected branches:
- `main` - Production (v1.0.0)
- `develop` - Staging for v1.0.1
- `feature/phase-X` - Individual phase development (temporary)

---

**Note:** This workflow keeps main stable while allowing iterative development and review of each phase in develop before final release.
