# Phase 6: Testing & Quality

**Total Tasks:** 3
**Estimated Time:** 2.5-3.5 hours
**Status:** Not Started

## Overview

This phase ensures code quality and reliability through comprehensive testing. It includes unit tests, integration tests, and cross-shell compatibility testing to ensure the CLI works correctly in all target environments.

## Prerequisites

- ✅ All implementation phases completed (Phases 1-5)

## Progress Checklist

- [ ] Task 6.1: Unit Tests (60-90 min)
- [ ] Task 6.2: Integration Tests (45-60 min)
- [ ] Task 6.3: Shell Compatibility Testing (30-40 min)

---

## Task 6.1: Unit Tests

**Estimated Time:** 60-90 minutes
**Dependencies:** All implementation tasks
**Status:** [ ] Not Started

### Deliverables

- [ ] Test config service (read/write/validation)
- [ ] Test prompt-resolver (mock SDK responses)
- [ ] Test output formatter (JSON/text)
- [ ] Test error handling
- [ ] Mock SDK client for tests (use vitest mock utilities)
- [ ] Achieve >80% code coverage

### Test Structure

```typescript
// tests/unit/services/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, saveConfig } from '../../../src/services/config';
import { existsSync, unlinkSync } from 'fs';

describe('config service', () => {
  const testConfigPath = './.retellrc.test.json';

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  it('should save config with proper format', () => {
    saveConfig({ apiKey: 'test_key', defaultFormat: 'json' });
    expect(existsSync(testConfigPath)).toBe(true);
  });

  it('should load saved config', () => {
    saveConfig({ apiKey: 'test_key', defaultFormat: 'json' });
    const config = getConfig();
    expect(config.apiKey).toBe('test_key');
  });

  it('should validate API key format', () => {
    expect(() => saveConfig({ apiKey: '', defaultFormat: 'json' }))
      .toThrow();
  });

  // ... more tests
});
```

### Prompt Resolver Tests (with Mocks)

```typescript
// tests/unit/services/prompt-resolver.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePromptSource } from '../../../src/services/prompt-resolver';
import Retell from 'retell-sdk';

vi.mock('retell-sdk');
vi.mock('../../../src/services/retell-client');

describe('prompt-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve retell-llm prompts', async () => {
    // Mock agent response
    const mockAgent = {
      agent_id: 'agent_123',
      response_engine: {
        type: 'retell-llm',
        llm_id: 'llm_456',
      },
    };

    // Mock LLM response
    const mockLlm = {
      llm_id: 'llm_456',
      version: 1,
      general_prompt: 'Test prompt',
    };

    // Setup mocks
    const mockRetrieve = vi.fn()
      .mockResolvedValueOnce(mockAgent)
      .mockResolvedValueOnce(mockLlm);

    vi.mocked(getRetellClient).mockReturnValue({
      agent: { retrieve: mockRetrieve },
      llm: { retrieve: mockRetrieve },
    });

    // Test
    const result = await resolvePromptSource('agent_123');

    expect(result.type).toBe('retell-llm');
    expect(result.llmId).toBe('llm_456');
  });

  it('should resolve conversation-flow prompts', async () => {
    // ... similar to above
  });

  it('should return error for custom-llm', async () => {
    // ... test custom LLM case
  });
});
```

### Output Formatter Tests

```typescript
// tests/unit/services/output-formatter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { outputJson, outputError } from '../../../src/services/output-formatter';

describe('output-formatter', () => {
  it('should output valid JSON', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    outputJson({ test: 'data' });

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify({ test: 'data' }, null, 2)
    );
  });

  it('should format errors consistently', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    outputError('Test error', 'TEST_ERROR');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Test error', code: 'TEST_ERROR' }, null, 2)
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
```

### Test Coverage Goals

- **Config service:** 100% (critical for security)
- **Prompt resolver:** >90% (core complexity)
- **Output formatter:** 100% (simple, should be fully covered)
- **Commands:** >80% (business logic)
- **Overall:** >80%

### Acceptance Criteria

- [x] All tests pass with `npm test`
- [x] Tests run in CI/CD (GitHub Actions)
- [x] Mock API responses properly (no actual API calls)
- [x] No actual API calls in unit tests
- [x] Coverage >80% overall
- [x] All edge cases tested (null, undefined, errors)
- [x] Fast test execution (<10 seconds)

### Testing Checklist

- [ ] Config service tests (save, load, validate, env override)
- [ ] Retell client tests (singleton, error handling)
- [ ] Prompt resolver tests (all three types)
- [ ] Output formatter tests (JSON, errors)
- [ ] Command tests (at least smoke tests)
- [ ] Validator tests (zod schemas)
- [ ] Error handling tests
- [ ] Coverage report generated

---

## Task 6.2: Integration Tests

**Estimated Time:** 45-60 minutes
**Dependencies:** Task 6.1
**Status:** [ ] Not Started

### Deliverables

- [ ] Test full command flows (login → list → get)
- [ ] Test error scenarios (invalid keys, 404s)
- [ ] Test pagination edge cases
- [ ] Test file I/O (config, prompt files)
- [ ] Optional: Test with real API in separate env

### Integration Test Structure

```typescript
// tests/integration/commands.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync } from 'fs';

describe('CLI integration tests', () => {
  const testApiKey = process.env.RETELL_TEST_API_KEY;

  beforeAll(() => {
    // Setup test environment
    if (!testApiKey) {
      console.warn('RETELL_TEST_API_KEY not set, skipping integration tests');
    }
  });

  afterAll(() => {
    // Cleanup
    if (existsSync('./.retellrc.json')) {
      unlinkSync('./.retellrc.json');
    }
  });

  it('should complete login flow', () => {
    if (!testApiKey) return;

    const result = execSync(`echo "${testApiKey}" | retell login`, {
      encoding: 'utf-8',
    });

    expect(result).toContain('Successfully authenticated');
    expect(existsSync('./.retellrc.json')).toBe(true);
  });

  it('should list agents', () => {
    if (!testApiKey) return;

    const result = execSync('retell agents list --json', {
      encoding: 'utf-8',
    });

    const data = JSON.parse(result);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should pull and update prompts', () => {
    if (!testApiKey) return;

    // Get first agent
    const agentsResult = execSync('retell agents list --json', {
      encoding: 'utf-8',
    });
    const agents = JSON.parse(agentsResult);
    const agentId = agents[0]?.agent_id;

    if (!agentId) return;

    // Pull prompts
    execSync(`retell prompts pull ${agentId} --output test-prompts.json`);
    expect(existsSync('./test-prompts.json')).toBe(true);

    // Update prompts (dry run)
    const updateResult = execSync(
      `retell prompts update ${agentId} --file test-prompts.json --dry-run --json`,
      { encoding: 'utf-8' }
    );

    const updateData = JSON.parse(updateResult);
    expect(updateData.message).toContain('Dry run');

    // Cleanup
    unlinkSync('./test-prompts.json');
  });
});
```

### Error Scenario Tests

```typescript
describe('error handling', () => {
  it('should handle invalid API key', () => {
    process.env.RETELL_API_KEY = 'invalid_key';

    expect(() => {
      execSync('retell agents list --json', { encoding: 'utf-8' });
    }).toThrow();
  });

  it('should handle 404 agent not found', () => {
    expect(() => {
      execSync('retell agents info non_existent_agent --json', {
        encoding: 'utf-8',
      });
    }).toThrow();
  });
});
```

### Acceptance Criteria

- [x] E2E flows work correctly (login → commands)
- [x] File operations don't corrupt data
- [x] Errors are user-friendly (JSON format)
- [x] Tests clean up after themselves (temp files, configs)
- [x] Optional: Real API tests run in separate CI job
- [x] Pagination tested with large datasets
- [x] All error codes tested (400, 401, 404, 422, 500)

### Testing Checklist

- [ ] Login flow (valid key, invalid key)
- [ ] List commands with pagination
- [ ] Get commands (found, not found)
- [ ] Prompt pull/update flow
- [ ] File I/O (save, load, overwrite)
- [ ] Error responses (all status codes)
- [ ] Environment variable override
- [ ] Config file precedence

---

## Task 6.3: Shell Compatibility Testing

**Estimated Time:** 30-40 minutes
**Dependencies:** All implementation tasks
**Status:** [ ] Not Started

### Deliverables

- [ ] Test in bash (Ubuntu/Debian)
- [ ] Test in fish shell (CachyOS)
- [ ] Test in zsh (macOS)
- [ ] Test with `bash -lc` invocation (AI agent mode)
- [ ] Document any shell-specific quirks

### Test Commands

**Bash:**
```bash
# Direct invocation
bash -c "retell --version"
bash -c "retell --help"

# Login shell (AI agent mode)
bash -lc "retell agents list --json"

# With env var
bash -c "RETELL_API_KEY=key_test retell agents list --json"
```

**Fish:**
```fish
# Direct invocation
fish -c "retell --version"
fish -c "retell --help"

# With env var
fish -c "env RETELL_API_KEY=key_test retell agents list --json"
```

**Zsh:**
```zsh
# Direct invocation
zsh -c "retell --version"
zsh -c "retell --help"

# Login shell
zsh -lc "retell agents list --json"
```

### Test Matrix

| Shell | Version | Direct | Login Shell | Env Var | Status |
|-------|---------|--------|-------------|---------|--------|
| bash  | 4.x     | [ ]    | [ ]         | [ ]     |        |
| bash  | 5.x     | [ ]    | [ ]         | [ ]     |        |
| fish  | 3.x     | [ ]    | [ ]         | [ ]     |        |
| zsh   | 5.x     | [ ]    | [ ]         | [ ]     |        |

### Shebang Test

```bash
# Verify shebang is correct
head -1 dist/index.js
# Expected: #!/usr/bin/env node

# Test direct execution
chmod +x dist/index.js
./dist/index.js --version
```

### Acceptance Criteria

- [x] All commands work identically across shells
- [x] No shell-specific errors
- [x] Output is consistent (same JSON format)
- [x] Environment variables work in all shells
- [x] Shebang (`#!/usr/bin/env node`) works correctly
- [x] AI agent invocation works (`bash -lc`)
- [x] No color code issues in non-TTY contexts
- [x] Piping works correctly (`retell ... | jq`)

### Testing Checklist

- [ ] Test all shells on their respective platforms
- [ ] Test with different Node.js versions (18, 20, 22)
- [ ] Test in Docker containers (Ubuntu, Alpine)
- [ ] Test on CachyOS with fish (primary requirement)
- [ ] Test piping to other tools (jq, grep, etc.)
- [ ] Test output redirection (`retell ... > file.json`)
- [ ] Document any platform-specific issues

### Known Issues to Watch For

- **Fish shell:** Different env var syntax (`env KEY=value` instead of `KEY=value`)
- **Windows:** Different path separators (if supporting Windows)
- **macOS:** Different versions of bash/zsh
- **Alpine Linux:** Different Node.js runtime

---

## Phase Completion

Once all tasks are complete:
- [ ] All 3 tasks checked off
- [ ] All acceptance criteria met
- [ ] Test coverage >80%
- [ ] All tests passing in CI/CD
- [ ] Shell compatibility verified on all target platforms
- [ ] Ready to proceed to Phase 7

## Next Phase

→ [Phase 7: Documentation & Polish](./phase-7-documentation.md)
