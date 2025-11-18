# Task Handoff: Phase 5 - Transcripts Search Command

## Quick Start

You are implementing Phase 5 of the Retell CLI v1.0.1 development plan. Read the comprehensive handoff document and follow the instructions exactly:

**Primary Document:** `/home/devon/claude/retell-cli/PHASE-5-HANDOFF.md`

## Context

- ✅ Phases 1-4 completed and merged to `develop`
- ✅ 78 tests currently passing
- ✅ All utilities from Phase 1 available (`filterFields()`, etc.)
- ✅ You are on the `develop` branch

## Your Tasks

### 1. Setup (5 minutes)
```bash
# Checkout new branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/phase-5-search-command

# Verify tests pass
npm test
# Expected: 78 tests passing
```

### 2. Research Phase (2-3 hours) - DO THIS FIRST!
- Read `PHASE-5-HANDOFF.md` sections on Research Phase
- Investigate Retell SDK `client.call.list()` method
- Document findings in `localdocs/retell-api-search-capabilities.md`
- Determine what filters are API-supported vs client-side

### 3. Implementation (4-5 hours)
- Create `src/commands/transcripts/search.ts`
- Implement hybrid filtering (API + client-side)
- Add input validation
- Register command in `src/index.ts`
- Create unit tests in `src/commands/transcripts/search.test.ts`

### 4. Testing (3-4 hours)
- Write comprehensive unit tests
- Manual testing with real API
- Verify all filter combinations work
- Test edge cases and error handling

### 5. Documentation (1-2 hours)
- Update README.md with "Search Transcripts" section
- Update CHANGELOG.md with Phase 5 additions
- Ensure help text has examples

### 6. Commit & PR (30 minutes)
```bash
# Run final tests
npm test && npm run build

# Commit (use the exact commit message from PHASE-5-HANDOFF.md)
git add .
git commit -m "$(cat <<'EOF'
feat(phase-5): add transcripts search command with hybrid filtering
[... see PHASE-5-HANDOFF.md for full commit message ...]
EOF
)"

# Push and create PR
git push -u origin feature/phase-5-search-command
gh pr create --title "Phase 5: Transcripts Search Command" --base develop --body "[... see PHASE-5-HANDOFF.md for full PR body ...]"
```

## Key Files to Reference

**Must Read:**
- `PHASE-5-HANDOFF.md` - **START HERE** - Complete implementation guide
- `localdocs/phase-5-search-command.md` - Detailed requirements
- `localdocs/v1.0.1-development-plan.md` - Overall project context

**Implementation References:**
- `src/commands/transcripts/list.ts` - Reference for command structure
- `src/commands/transcripts/analyze.ts` - Reference for option handling
- `src/services/output-formatter.ts` - `filterFields()` utility

**Testing References:**
- `src/commands/transcripts/analyze.test.ts` - Test patterns

## Critical Requirements

⚠️ **DO NOT SKIP THE RESEARCH PHASE** - You must understand API capabilities first!

✅ **Success Criteria:**
- All filter options working (status, agent-id, since, until, limit, fields)
- Hybrid filtering implemented (API + client-side)
- Input validation with clear error messages
- Unit tests passing
- All existing 78 tests still passing
- Documentation updated
- Manual testing completed

## Command Specification

```bash
# Target command usage
retell transcripts search [options]

# Options:
--status <status>      # error, ended, ongoing
--agent-id <id>        # Filter by agent
--since <date>         # YYYY-MM-DD or ISO format
--until <date>         # YYYY-MM-DD or ISO format
--limit <number>       # Max results (default: 50)
--fields <fields>      # Comma-separated field list
```

## Expected Timeline

- **Day 1:** Research phase + start implementation (6-8 hours)
- **Day 2:** Complete implementation + testing (6-8 hours)
- **Day 3:** Polish, documentation, PR (2-3 hours)

**Total:** 14-19 hours over 2-3 days

## Questions?

1. Check `PHASE-5-HANDOFF.md` first
2. Review `localdocs/phase-5-search-command.md`
3. Look at existing command implementations for patterns

## When Complete

After PR is merged:
- Proceed to Phase 6: Diff Command & Dry Run
- See `localdocs/phase-6-diff-dry-run.md`

---

**Ready to start? Open PHASE-5-HANDOFF.md and follow the setup instructions!** 🚀
