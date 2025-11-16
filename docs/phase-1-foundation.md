# Phase 1: Foundation & Setup

**Total Tasks:** 6
**Estimated Time:** 2.5-3.5 hours
**Status:** Not Started

## Overview

This phase establishes the foundational infrastructure for the CLI tool. It includes project setup, SDK investigation, configuration management, and core services. **Task 1.2 is CRITICAL** and must be completed before proceeding with other phases, as it determines the exact SDK method names and structure.

## Progress Checklist

- [ ] Task 1.1: Project Initialization (15-20 min)
- [ ] Task 1.2: Investigate retell-sdk API Methods (30-45 min) ⚠️ **CRITICAL**
- [ ] Task 1.3: Config File Management System (30-40 min)
- [ ] Task 1.4: Retell Client Service (25-35 min)
- [ ] Task 1.5: CLI Framework & Base Commands (30 min)
- [ ] Task 1.6: Output Formatting Service (20-30 min)

---

## Task 1.1: Project Initialization

**Estimated Time:** 15-20 minutes
**Dependencies:** None
**Status:** [ ] Not Started

### Deliverables

- [ ] Initialize git repository
- [ ] Create `package.json` with proper metadata
- [ ] Set up TypeScript configuration (`tsconfig.json`)
- [ ] Configure esbuild for compilation
- [ ] Add `.gitignore` and `.npmignore`
- [ ] Create basic folder structure
- [ ] Install `retell-sdk` and core dependencies

### Implementation

**Package.json bin configuration:**
```json
{
  "name": "retell-cli",
  "version": "0.1.0",
  "bin": {
    "retell": "./dist/index.js"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js",
    "dev": "npm run build -- --watch",
    "test": "vitest"
  },
  "dependencies": {
    "retell-sdk": "^latest",
    "commander": "^11.0.0",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "esbuild": "^0.19.0",
    "vitest": "^1.0.0"
  }
}
```

### Acceptance Criteria

- [x] `npm install` runs without errors
- [x] `npm run build` compiles TypeScript successfully
- [x] Package has proper name, version, description, author
- [x] TypeScript strict mode enabled

---

## Task 1.2: Investigate retell-sdk API Methods ⚠️ **CRITICAL**

**Estimated Time:** 30-45 minutes
**Dependencies:** Task 1.1
**Status:** [ ] Not Started

### Why This Is Critical

This task determines the exact SDK method names and structure that all other phases depend on. **DO NOT proceed with implementation tasks until this is complete.**

### Deliverables

- [ ] Document available SDK methods (agent, call, llm, flow namespaces)
- [ ] Test SDK client initialization
- [ ] Map SDK methods to CLI commands
- [ ] Document TypeScript types available
- [ ] Create test script to explore API responses

### Investigation Script

```typescript
// scripts/explore-sdk.ts
import Retell from 'retell-sdk';

const client = new Retell({ apiKey: process.env.RETELL_API_KEY });

// Test what methods are available
console.log('Agent methods:', Object.keys(client.agent));
console.log('Call methods:', Object.keys(client.call));
console.log('LLM methods:', Object.keys(client.llm || client.retellLlm || {}));
console.log('Flow methods:', Object.keys(client.conversationFlow || client.flow || {}));

// Test type exports
console.log('Available types:', Object.keys(Retell));
```

### Key Questions to Answer

1. What are the exact method names?
   - `client.call.list()` or `client.calls.list()`?
   - `client.agent.retrieve()` or `client.agent.get()`?
   - `client.llm.retrieve()` or `client.retellLlm.get()`?
   - `client.conversationFlow.retrieve()` or different name?
2. Do pagination helpers exist in SDK responses?
3. What TypeScript types are exported? (e.g., `Retell.Call`, `Retell.Agent`)
4. Are there utility methods for common operations?

### Acceptance Criteria

- [x] Complete mapping document of SDK methods → CLI commands created
- [x] Tested authentication works with real API key
- [x] All TypeScript types documented
- [x] Example responses captured for each endpoint type
- [x] **Document shared with team before proceeding**

---

## Task 1.3: Config File Management System

**Estimated Time:** 30-40 minutes
**Dependencies:** Task 1.1
**Status:** [ ] Not Started

### Deliverables

- [ ] Implement `.retellrc.json` read/write in `src/services/config.ts`
- [ ] Support environment variable `RETELL_API_KEY` override
- [ ] Handle missing config gracefully (prompt user)
- [ ] Implement config validation with zod
- [ ] Add security: proper file permissions (0600)

### Config Schema (Zod)

```typescript
import { z } from 'zod';

export const ConfigSchema = z.object({
  apiKey: z.string().min(1),
  defaultFormat: z.enum(['json', 'text']).default('json'),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### File Format

```json
{
  "apiKey": "key_...",
  "defaultFormat": "json"
}
```

### Priority Order

1. Environment variable `RETELL_API_KEY`
2. `.retellrc.json` in current directory
3. Prompt user to run `retell login`

### Acceptance Criteria

- [x] Config loads from current directory `.retellrc.json`
- [x] Env var `RETELL_API_KEY` takes precedence
- [x] Config file created with restricted permissions (chmod 600)
- [x] Clear error messages when config missing
- [x] Validates API key format before saving
- [x] Unit tests for all config scenarios

---

## Task 1.4: Retell Client Service (SDK Wrapper)

**Estimated Time:** 25-35 minutes
**Dependencies:** Tasks 1.2, 1.3
**Status:** [ ] Not Started

### Deliverables

- [ ] Create `src/services/retell-client.ts`
- [ ] Implement singleton pattern for Retell client
- [ ] Load API key from config service
- [ ] Wrap SDK errors in user-friendly messages
- [ ] Export typed client instance

### Service Structure

```typescript
import Retell from 'retell-sdk';
import { getConfig } from './config';

let clientInstance: Retell | null = null;

export function getRetellClient(): Retell {
  if (!clientInstance) {
    const config = getConfig();
    clientInstance = new Retell({
      apiKey: config.apiKey,
      maxRetries: 2,
      timeout: 60000, // 1 minute
    });
  }
  return clientInstance;
}

export function resetClient() {
  clientInstance = null;
}
```

### Acceptance Criteria

- [x] Singleton pattern prevents multiple client instances
- [x] Uses config service for API key
- [x] Handles SDK errors gracefully
- [x] Type-safe exports
- [x] Testable (can reset for tests)

---

## Task 1.5: CLI Framework & Base Commands

**Estimated Time:** 30 minutes
**Dependencies:** Task 1.1
**Status:** [ ] Not Started

### Deliverables

- [ ] Set up `commander` in `src/index.ts`
- [ ] Implement global `--json` flag
- [ ] Create command structure (subcommands)
- [ ] Add version (`-v`, `--version`)
- [ ] Add help text (`-h`, `--help`)
- [ ] Configure executable permissions in package.json
- [ ] Add shebang to compiled output

### Command Structure

```bash
retell [command] [subcommand] [options]
```

### Example Implementation

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const program = new Command();

program
  .name('retell')
  .description('Retell AI CLI - Manage transcripts and prompts')
  .version(pkg.version)
  .option('--json', 'Output as JSON (default)', true);

// Add subcommands
program
  .command('login')
  .description('Authenticate with Retell AI');

program
  .command('transcripts')
  .description('Manage call transcripts')
  .addCommand(/* ... */);

program.parse();
```

### Acceptance Criteria

- [x] `retell --help` shows all commands
- [x] `retell --version` shows package version
- [x] Subcommands are properly namespaced
- [x] Global flags work across all commands
- [x] Executable works after `npm link`
- [x] Shebang included in build output

---

## Task 1.6: Output Formatting Service

**Estimated Time:** 20-30 minutes
**Dependencies:** Task 1.1
**Status:** [ ] Not Started

### Deliverables

- [ ] Create `src/services/output-formatter.ts`
- [ ] Implement JSON output formatter
- [ ] Implement error formatter
- [ ] Support `--json` flag override
- [ ] Ensure no mixed output (console.log isolation)

### Service Interface

```typescript
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error: Error | string, code?: string): void {
  const errorObj = {
    error: typeof error === 'string' ? error : error.message,
    code: code || 'UNKNOWN_ERROR',
  };
  console.error(JSON.stringify(errorObj, null, 2));
  process.exit(1);
}

export function handleSdkError(error: unknown): never {
  if (error instanceof Retell.APIError) {
    outputError(error.message, error.name);
  }
  outputError('An unexpected error occurred', 'UNKNOWN_ERROR');
}
```

### Acceptance Criteria

- [x] JSON output is valid, pretty-printed
- [x] Consistent error format: `{"error": "...", "code": "..."}`
- [x] No mixed output (no console.log leaks)
- [x] Works in piped contexts (`retell ... | jq`)
- [x] Proper exit codes (0 success, 1 error)

---

## Phase Completion

Once all tasks are complete:
- [ ] All 6 tasks checked off
- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Ready to proceed to Phase 2

## Next Phase

→ [Phase 2: Authentication](./phase-2-authentication.md)
