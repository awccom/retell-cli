# Retell CLI v1.0.1 - Development Documentation

This directory contains planning and development documentation for the Retell CLI v1.0.1 release.

---

## Overview

**Version:** 1.0.1
**Timeline:** 13-17 days
**Objective:** Improve token efficiency for AI agents, add advanced filtering, streamline prompt workflows

---

## Documentation Index

### Master Plan
- **[v1.0.1-development-plan.md](./v1.0.1-development-plan.md)** - Complete development plan with all phases, testing, timeline, and release checklist

### Phase Documents

1. **[phase-1-foundation-utilities.md](./phase-1-foundation-utilities.md)** (2-3 days)
   - Build shared utilities: `filterFields()`, `generateDiff()`
   - Create TypeScript types
   - Foundation for all other features

2. **[phase-2-field-selection.md](./phase-2-field-selection.md)** (1-2 days)
   - Add `--fields` option to transcripts and agents commands
   - Reduce token usage by 50-90%
   - Requires: Phase 1

3. **[phase-3-raw-output.md](./phase-3-raw-output.md)** (1 day)
   - Add `--raw` flag to return unmodified API responses
   - Useful for debugging and API schema alignment
   - Requires: Phase 1

4. **[phase-4-hotspots-detection.md](./phase-4-hotspots-detection.md)** (2 days)
   - Add `--hotspots-only` view to identify conversation issues
   - Detect latency spikes, interruptions, long silences
   - Requires: Phase 1

5. **[phase-5-search-command.md](./phase-5-search-command.md)** (2-3 days)
   - Create `retell transcripts search` command
   - Hybrid filtering (API + client-side)
   - Eliminate need for jq/grep
   - Requires: Phase 1

6. **[phase-6-diff-dry-run.md](./phase-6-diff-dry-run.md)** (3-4 days)
   - Create `retell prompts diff` command
   - Add `--dry-run` to `retell prompts update`
   - Enable safe prompt iterations
   - Requires: Phase 1

---

## Quick Reference

### Feature Summary

| Feature | Command Example | Benefit |
|---------|----------------|---------|
| **Field Selection** | `retell transcripts list --fields call_id,status` | 50-90% token reduction |
| **Raw Output** | `retell transcripts analyze <id> --raw` | Debugging, API alignment |
| **Hotspots** | `retell transcripts analyze <id> --hotspots-only` | Focused troubleshooting |
| **Search** | `retell transcripts search --status error --agent-id <id>` | No more jq/grep |
| **Diff** | `retell prompts diff <agent-id>` | Preview changes |
| **Dry Run** | `retell prompts update <agent-id> --dry-run` | Safe updates |

---

## Development Workflow

### Getting Started

1. **Read the master plan:** [v1.0.1-development-plan.md](./v1.0.1-development-plan.md)
2. **Start with Phase 1:** Foundation utilities are required for all other phases
3. **Work in order or parallel:** After Phase 1, Phases 2-5 can be done in parallel

### Phase Checklist

For each phase:
- [ ] Read phase document thoroughly
- [ ] Complete all tasks in order
- [ ] Run all tests (unit + integration)
- [ ] Update documentation
- [ ] Mark deliverables as complete
- [ ] Move to next phase or work in parallel

---

## Testing Strategy

Each phase document includes:
- **Unit tests** - Test individual functions
- **Integration tests** - Test command end-to-end
- **Edge cases** - Test error conditions, invalid inputs
- **Performance tests** - Ensure efficiency goals met

### Cross-Phase Testing

After all phases complete:
- Test feature combinations (search + fields + hotspots)
- Verify backward compatibility
- Load testing with large datasets
- Documentation review

---

## Dependencies Between Phases

```
Phase 1 (Foundation)
    ├── Phase 2 (Field Selection)
    ├── Phase 3 (Raw Output)
    ├── Phase 4 (Hotspots)
    ├── Phase 5 (Search)
    └── Phase 6 (Diff & Dry Run)
```

**All phases depend on Phase 1 being completed first.**

---

## Success Metrics

- [ ] Token usage reduced by 50%+ using --fields
- [ ] Search reduces jq/grep usage by 80%
- [ ] Hotspots reduce analysis output by 70%
- [ ] Diff/dry-run prevent accidental updates
- [ ] Zero breaking changes
- [ ] All features documented

---

## Timeline

| Phase | Days | Can Parallelize After Phase 1? |
|-------|------|--------------------------------|
| Phase 1 | 2-3 | No (foundation) |
| Phase 2 | 1-2 | Yes |
| Phase 3 | 1 | Yes |
| Phase 4 | 2 | Yes |
| Phase 5 | 2-3 | Yes |
| Phase 6 | 3-4 | Yes |
| Testing & Docs | 2 | No (after all phases) |
| **Total** | **13-17** | |

---

## Release Preparation

After all phases complete:

1. **Integration testing** - Test all features together
2. **Documentation update** - README, examples, troubleshooting
3. **CHANGELOG** - Document all changes
4. **Version bump** - Update package.json to 1.0.1
5. **Build & test** - Verify npm package works
6. **Release** - Tag, publish, announce

See master plan for detailed release checklist.

---

## Notes

- This directory (`localdocs/`) is gitignored for local development only
- Keep research findings, notes, and drafts here
- Phase documents are living documents - update as you learn

---

## Questions or Issues?

If you encounter problems during development:
1. Review the relevant phase document
2. Check the master plan for context
3. Document issues and solutions for future reference
4. Update phase documents if strategy changes

---

**Last Updated:** 2025-11-15
**Status:** Planning complete, ready for implementation
