# Phase 2: Authentication

**Total Tasks:** 1
**Estimated Time:** 25-35 minutes
**Status:** ✅ Complete

## Overview

This phase implements the authentication system, allowing users to securely store their Retell AI API key. The login command validates the key and saves it to a local configuration file.

## Prerequisites

- ✅ Phase 1 completed (Tasks 1.3, 1.4, 1.5 required)

## Progress Checklist

- [x] Task 2.1: Login Command (25-35 min)

---

## Task 2.1: Login Command

**Estimated Time:** 25-35 minutes
**Dependencies:** Tasks 1.3, 1.4, 1.5
**Status:** [x] Complete

### Deliverables

- [x] Implement `retell login` command in `src/commands/login.ts`
- [x] Interactive API key prompt (use `readline`)
- [x] Validate API key by testing API call (list agents)
- [x] Save to `.retellrc.json`
- [x] Success confirmation message

### Command

```bash
retell login
# Prompts: Enter your Retell API key:
# Validates by calling client.agent.list({ limit: 1 })
# Saves to .retellrc.json
```

### Implementation

```typescript
import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';
import Retell from 'retell-sdk';
import { saveConfig } from '../services/config';
import { outputJson, handleSdkError } from '../services/output-formatter';

export async function loginCommand() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const apiKey = await rl.question('Enter your Retell API key: ');
    rl.close();

    // Validate by testing API call
    const testClient = new Retell({ apiKey });
    await testClient.agent.list({ limit: 1 }); // Throws if invalid

    // Save to config
    saveConfig({ apiKey, defaultFormat: 'json' });

    outputJson({
      message: 'Successfully authenticated!',
      configPath: './.retellrc.json',
      nextSteps: [
        'Try: retell agents list',
        'Try: retell transcripts list',
      ],
    });
  } catch (error) {
    rl.close();
    handleSdkError(error);
  }
}
```

### Handle Existing Config

```typescript
import { existsSync } from 'fs';

export async function loginCommand() {
  // Check if config already exists
  if (existsSync('./.retellrc.json')) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const overwrite = await rl.question('Config already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      rl.close();
      outputJson({ message: 'Login cancelled' });
      return;
    }
  }

  // ... continue with login
}
```

### Acceptance Criteria

- [x] Prompts are clear and user-friendly
- [x] Invalid keys show helpful error from SDK (AuthenticationError)
- [x] Valid keys are saved successfully to `.retellrc.json`
- [x] Confirmation includes next steps for user
- [x] Handles overwriting existing config (asks for confirmation)
- [x] File permissions set to 0600 (via config service)
- [x] Works in both interactive and CI environments

### Testing Checklist

- [x] Test with valid API key
- [x] Test with invalid API key
- [x] Test with malformed API key
- [x] Test overwriting existing config
- [x] Test canceling overwrite
- [x] Test file permissions (should be 0600)

---

## Phase Completion

Once all tasks are complete:
- [x] Task 2.1 checked off
- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [x] Integration test: login → list agents
- [x] Ready to proceed to Phase 3

## Next Phase

→ [Phase 3: Transcript Commands](./phase-3-transcripts.md)
