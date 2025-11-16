📋 PHASE 6 HANDOFF: Testing & Quality Implementation

═══════════════════════════════════════════════════════════════════════════════

🎯 Project Context

Repository: https://github.com/awccom/retell-cli.git
Project: Retell AI CLI - Command-line tool for transcript analysis and prompt management
Current Status: Phase 5 Complete ✅ - Prompt management working
Progress: 16/24 tasks complete (67%)
Branch: main (start from here)

---

📌 Your Mission

Implement Phase 6: Testing & Quality for the Retell CLI project.

This phase focuses on improving test coverage, adding integration tests, ensuring
shell compatibility, and polishing the overall quality of the CLI.

---

🔍 Phase 6 Overview

Total Tasks: 3
Estimated Time: 2.5-3.5 hours
Prerequisites: Phases 1-5 complete ✅

What You're Building:

1. Enhanced Unit Test Coverage - Fill gaps, improve edge case testing
2. Integration Tests - End-to-end workflow testing
3. Shell Compatibility Testing - Ensure works across bash, zsh, fish

---

🚀 Setup Instructions

1. Start Fresh Session

```bash
cd /home/devon/claude/retell-cli

# Verify you're on main branch
git checkout main
git pull origin main

# Verify Phase 5 is complete
npm run test:run
# Should show: 183 tests passing

npm run build
# Should build successfully

# Create new branch for Phase 6
git checkout -b phase-6-testing

# Verify you're on the right branch
git branch --show-current
# Should output: phase-6-testing
```

2. Read Required Documentation

CRITICAL - Read these files in order:

1. **@docs/phase-6-testing.md** ⭐ PRIMARY GUIDE
   - Contains all 3 task specifications
   - Testing strategies and patterns
   - Acceptance criteria for each task
   - Quality checklists

2. **Existing Test Files** (Learn the patterns):
   - @tests/unit/config.test.ts - Configuration testing
   - @tests/unit/agents/list.test.ts - Command testing pattern
   - @tests/unit/prompt-resolver.test.ts - Service testing pattern
   - @tests/unit/prompts/pull.test.ts - File I/O testing

3. **@docs/sdk-investigation-results.md** - SDK reference for integration tests

4. **@vitest.config.ts** - Test configuration

---

📋 Phase 6 Tasks Breakdown

═══════════════════════════════════════════════════════════════════════════════

Task 6.1: Enhanced Unit Test Coverage (60-90 min)

Goal: Improve test coverage and add missing edge cases

Deliverables:
- Review all existing test files for gaps
- Add missing edge case tests
- Improve error handling test coverage
- Add boundary condition tests
- Ensure all public functions are tested
- Target: 90%+ code coverage

Areas to Focus:
- Edge cases in prompt-resolver.ts
- File I/O error scenarios in pull.ts and update.ts
- Config validation edge cases
- Output formatter edge cases
- Error handling paths

Example Missing Tests:
```typescript
// Edge case: Empty state prompts
it('should handle empty state_prompt gracefully', async () => {
  const mockPromptSource = {
    type: 'retell-llm',
    prompts: {
      states: [{ name: 'test', state_prompt: '' }]
    }
  };
  // Test behavior
});

// Boundary: Very long prompts
it('should handle prompts exceeding 10000 characters', async () => {
  const longPrompt = 'a'.repeat(15000);
  // Test behavior
});
```

---

Task 6.2: Integration Tests (90-120 min) ⚠️ MOST IMPORTANT

Goal: Test complete workflows end-to-end

Deliverables:
- Create integration test suite
- Test full prompt management workflow
- Test authentication → list → get workflows
- Test error propagation through layers
- Mock SDK responses realistically
- File: tests/integration/workflows.test.ts

Key Workflows to Test:

1. **Prompt Management Workflow**
```typescript
describe('Prompt Management Workflow', () => {
  it('should complete full prompt pull → edit → update → publish workflow', async () => {
    // 1. Pull prompts for retell-llm agent
    // 2. Verify files created
    // 3. Modify prompt files
    // 4. Update prompts
    // 5. Publish agent
    // 6. Verify version incremented
  });
});
```

2. **Authentication → Data Access Workflow**
```typescript
it('should authenticate and then list transcripts', async () => {
  // 1. Login with API key
  // 2. List transcripts
  // 3. Get specific transcript
  // 4. Analyze transcript
});
```

3. **Error Handling Workflow**
```typescript
it('should handle auth error gracefully across commands', async () => {
  // Test that all commands handle 401 errors properly
});
```

Integration Test Structure:
```typescript
// tests/integration/workflows.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';

describe('Integration Tests', () => {
  const TEST_AGENT_ID = 'test-agent-123';
  const TEST_DIR = '.test-prompts';

  beforeAll(() => {
    // Setup test environment
  });

  afterAll(() => {
    // Cleanup test files
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // Tests here
});
```

---

Task 6.3: Shell Compatibility Testing (30-45 min)

Goal: Ensure CLI works across different shells

Deliverables:
- Test CLI in bash, zsh, and fish (if available)
- Verify shebang works correctly
- Test command completion/parsing
- Document any shell-specific issues
- File: docs/shell-compatibility.md

Testing Checklist:
- [ ] Commands work in bash
- [ ] Commands work in zsh
- [ ] Commands work in fish (if available)
- [ ] Help text displays correctly
- [ ] Options parsing works
- [ ] Error messages display properly
- [ ] Colors/formatting work (or degrade gracefully)

Manual Testing Script:
```bash
# Test in each shell
bash
retell --help
retell login test-key
retell transcripts list --limit 5
retell agents list
exit

zsh
retell --help
# ... same tests
exit

fish
retell --help
# ... same tests
exit
```

---

📚 Testing Patterns & Best Practices

Unit Testing Pattern (from existing tests):
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as retellClient from '../../src/services/retell-client';
import * as outputFormatter from '../../src/services/output-formatter';

vi.mock('../../src/services/retell-client');
vi.mock('../../src/services/output-formatter');

describe('Component Name', () => {
  let mockClient: any;
  let exitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { /* setup */ };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  // Tests here
});
```

Integration Testing Pattern:
```typescript
describe('Workflow Integration Tests', () => {
  it('should complete end-to-end workflow', async () => {
    // Setup mocks for entire workflow
    // Execute multiple commands in sequence
    // Verify state changes
    // Verify file changes
    // Verify SDK calls
  });
});
```

---

✅ Success Criteria

Before marking Phase 6 complete, verify:

Build & Tests:
- [ ] npm run build compiles successfully
- [ ] npm run test:run passes all tests (190+ tests total)
- [ ] Test coverage is 90%+ (run npm run test:coverage if available)

Unit Tests:
- [ ] All edge cases covered
- [ ] All error paths tested
- [ ] Boundary conditions tested
- [ ] No gaps in coverage

Integration Tests:
- [ ] Full prompt workflow tested
- [ ] Authentication workflows tested
- [ ] Error propagation tested
- [ ] File I/O integration tested

Shell Compatibility:
- [ ] Tested in bash
- [ ] Tested in zsh
- [ ] Tested in fish (if available)
- [ ] Documentation created

Documentation:
- [ ] Phase 6 marked complete in @docs/phase-6-testing.md
- [ ] Phase 6 marked complete in @docs/PHASES-INDEX.md
- [ ] Shell compatibility documented
- [ ] All task checkboxes checked off

---

🔀 Committing & Creating Pull Request

As You Work (Incremental Commits):

```bash
# After completing Task 6.1 (enhanced unit tests)
git add tests/unit/**/*.test.ts
git commit -m "test: enhance unit test coverage

- Add missing edge case tests
- Improve error handling coverage
- Add boundary condition tests
- Test empty/null input scenarios
- Achieve 90%+ code coverage

Part of Phase 6 - Task 6.1 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# After completing Task 6.2 (integration tests)
git add tests/integration/workflows.test.ts
git commit -m "test: add integration tests for workflows

- Add full prompt management workflow test
- Add authentication → data access workflow
- Add error handling integration tests
- Mock SDK responses realistically
- Test file I/O integration

Part of Phase 6 - Task 6.2 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# After completing Task 6.3 (shell compatibility)
git add docs/shell-compatibility.md
git commit -m "test: verify shell compatibility

- Test CLI in bash, zsh, and fish
- Document shell-specific behavior
- Verify shebang works correctly
- Confirm command parsing across shells

Part of Phase 6 - Task 6.3 complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Final Phase 6 Completion:

```bash
# Update documentation
git add docs/phase-6-testing.md docs/PHASES-INDEX.md

git commit -m "docs: Phase 6 complete - testing & quality

All testing and quality tasks implemented:
- Enhanced unit test coverage (90%+)
- Integration tests for workflows
- Shell compatibility testing

Testing:
- 190+ tests passing
- All workflows tested
- Shell compatibility verified

Updated documentation:
- phase-6-testing.md marked complete
- PHASES-INDEX.md updated to 79% progress (19/24 tasks)

Ready for Phase 7: Documentation & Polish

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch to remote
git push -u origin phase-6-testing

# Create Pull Request
gh pr create \
  --title "Phase 6: Testing & Quality Implementation" \
  --body "$(cat <<'PRBODY'
## Phase 6: Testing & Quality

This PR enhances the test suite and ensures quality across the Retell CLI.

### Components Implemented

1. **Enhanced Unit Test Coverage**
   - Added missing edge case tests
   - Improved error handling coverage
   - Added boundary condition tests
   - Achieved 90%+ code coverage

2. **Integration Tests**
   - Full prompt management workflow
   - Authentication → data access workflows
   - Error propagation testing
   - File I/O integration testing

3. **Shell Compatibility Testing**
   - Verified in bash, zsh, and fish
   - Documented shell-specific behavior
   - Confirmed cross-shell compatibility

### Testing

- **Unit Tests:** 190+ passing (added 7+ new tests)
- **Integration Tests:** Complete workflow coverage
- **Shell Testing:** Verified across 3 shells
- **Coverage:** 90%+ code coverage

### Files Added

```
tests/integration/
└── workflows.test.ts

docs/
└── shell-compatibility.md
```

### Files Modified

- Enhanced all existing unit test files
- docs/phase-6-testing.md - marked complete
- docs/PHASES-INDEX.md - updated to 79% progress

### Success Criteria

- [x] All 3 tasks implemented
- [x] 190+ tests passing
- [x] 90%+ code coverage
- [x] Integration tests complete
- [x] Shell compatibility verified
- [x] Documentation updated

### Next Steps

Ready to proceed to **Phase 7: Documentation & Polish**

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)" \
  --base main \
  --head phase-6-testing
```

If gh CLI is not available:
```bash
# Push branch
git push -u origin phase-6-testing

# Then manually create PR at:
# https://github.com/awccom/retell-cli/compare/main...phase-6-testing
```

---

⚠️ Important Notes & Tips

Testing Best Practices:

1. **Write tests that would catch real bugs**
   - Don't just test happy paths
   - Test error conditions
   - Test edge cases
   - Test boundary conditions

2. **Integration tests should be realistic**
   - Mock SDK responses accurately
   - Test actual file I/O
   - Test command chaining
   - Test state propagation

3. **Keep tests maintainable**
   - Use descriptive test names
   - Keep tests independent
   - Use beforeEach/afterEach properly
   - Clean up test artifacts

Common Testing Patterns:

```typescript
// Test error handling
it('should handle network timeout gracefully', async () => {
  const timeoutError = new Error('Network timeout');
  mockClient.agent.retrieve.mockRejectedValue(timeoutError);

  await command('agent-123');

  expect(handleSdkError).toHaveBeenCalledWith(timeoutError);
});

// Test file I/O
it('should create files with correct permissions', async () => {
  await pullPromptsCommand('agent-123', {});

  const filePath = '.retell-prompts/agent-123/metadata.json';
  expect(existsSync(filePath)).toBe(true);
  const content = JSON.parse(readFileSync(filePath, 'utf-8'));
  expect(content).toHaveProperty('type');
});

// Test workflow
it('should maintain state across operations', async () => {
  // Pull prompts
  await pullPromptsCommand('agent-123', {});

  // Verify files exist
  expect(existsSync('.retell-prompts/agent-123')).toBe(true);

  // Update prompts
  await updatePromptsCommand('agent-123', {});

  // Verify SDK was called
  expect(mockClient.llm.update).toHaveBeenCalled();
});
```

Coverage Analysis:

Run coverage analysis to find gaps:
```bash
# If coverage script exists
npm run test:coverage

# Or manually with vitest
npx vitest run --coverage
```

Common Pitfalls to Avoid:

- ❌ Don't skip integration tests (most important!)
- ❌ Don't test implementation details, test behavior
- ❌ Don't write brittle tests that break on refactoring
- ❌ Don't leave test artifacts (files, directories) behind
- ❌ Don't mock everything (integration tests need real I/O)
- ❌ Don't forget to test error messages are helpful

---

📖 Reference: Key Files to Review

**Existing Test Patterns:**
- tests/unit/prompt-resolver.test.ts - Service testing
- tests/unit/prompts/pull.test.ts - File I/O testing
- tests/unit/agent/publish.test.ts - Simple command testing
- tests/unit/transcripts/analyze.test.ts - Complex command testing

**Configuration:**
- vitest.config.ts - Test configuration
- package.json - Test scripts

**Documentation:**
- docs/phase-6-testing.md - Detailed task specs
- docs/PHASES-INDEX.md - Progress tracking

---

🚀 Getting Started Checklist

Before you begin coding:

1. [ ] Checked out `main` branch and pulled latest
2. [ ] Verified 183 tests passing
3. [ ] Created `phase-6-testing` branch
4. [ ] Read docs/phase-6-testing.md completely
5. [ ] Reviewed existing test files for patterns
6. [ ] Understand the three task areas
7. [ ] Ready to start with Task 6.1 (enhanced unit tests)

Start with Task 6.1 - review existing tests for gaps!

---

📊 Expected Deliverables

By the end of Phase 6, you should have:

- ✅ Enhanced unit test coverage (90%+)
- ✅ Integration test suite (tests/integration/workflows.test.ts)
- ✅ Shell compatibility documentation
- ✅ 190+ tests passing
- ✅ All edge cases covered
- ✅ Documentation updated (phase-6-testing.md, PHASES-INDEX.md)
- ✅ All code committed to phase-6-testing branch
- ✅ Pull request opened to merge into main
- ✅ Ready to proceed to Phase 7 (Documentation & Polish)

---

🎯 Start Task 6.1: Enhanced Unit Test Coverage

Review existing tests for gaps and add missing edge cases!

Good luck! 🚀

═══════════════════════════════════════════════════════════════════════════════
