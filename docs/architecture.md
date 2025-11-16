# Retell AI CLI - Architecture Documentation

This document describes the architecture, design decisions, and implementation patterns of the Retell AI CLI.

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Command Pattern](#command-pattern)
- [Service Layer](#service-layer)
- [Error Handling](#error-handling)
- [Testing Strategy](#testing-strategy)
- [Build System](#build-system)

## Overview

The Retell AI CLI is a command-line tool built with TypeScript and Node.js that provides an interface to the Retell AI API. It follows a service-oriented architecture with clear separation of concerns.

### Technology Stack

- **Runtime:** Node.js >= 18.0.0
- **Language:** TypeScript 5.x
- **CLI Framework:** Commander.js 11.x
- **HTTP Client:** Retell SDK 4.5.x
- **Testing:** Vitest 1.x
- **Build Tool:** esbuild 0.19.x

### Design Goals

1. **User-Friendly:** Simple, intuitive commands with helpful error messages
2. **AI-Friendly:** JSON output by default for integration with AI tools
3. **Testable:** High test coverage (>90%) with comprehensive unit and integration tests
4. **Maintainable:** Clean architecture with separation of concerns
5. **Portable:** Cross-shell compatibility (bash, zsh, fish)

## Architecture Principles

### 1. Command Pattern

Each CLI command is implemented as a separate module with a single exported async function:

```typescript
export async function commandName(args): Promise<void> {
  try {
    // Command implementation
  } catch (error) {
    handleError(error);
  }
}
```

**Benefits:**
- Easy to test in isolation
- Clear boundaries between commands
- Simple to add new commands

### 2. Service Layer

Business logic is extracted into reusable services:

- **Config Service:** Manages API key storage and retrieval
- **Retell Client Service:** Wraps the Retell SDK
- **Output Formatter:** Handles JSON output and error formatting
- **Prompt Resolver:** Resolves prompt types based on agent configuration

**Benefits:**
- Shared logic across commands
- Easier to mock for testing
- Single responsibility principle

### 3. Dependency Injection

Services are injected into commands rather than hard-coded:

```typescript
// Service provides singleton instance
export function getRetellClient(): RetellClient {
  return client;
}

// Commands use the service
const client = getRetellClient();
```

**Benefits:**
- Easy to mock for testing
- Centralized configuration
- Loose coupling

### 4. Error Boundaries

Errors are caught at command level and formatted consistently:

```typescript
try {
  const result = await operation();
  outputJson(result);
} catch (error) {
  handleSdkError(error);
}
```

**Benefits:**
- Consistent error formatting
- User-friendly error messages
- Never expose stack traces to users

## Project Structure

```
retell-cli/
├── src/
│   ├── index.ts                 # Entry point, CLI setup
│   ├── commands/                # Command implementations
│   │   ├── login.ts
│   │   ├── transcripts/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   └── analyze.ts
│   │   ├── agents/
│   │   │   ├── list.ts
│   │   │   └── info.ts
│   │   ├── prompts/
│   │   │   ├── pull.ts
│   │   │   └── update.ts
│   │   └── agent/
│   │       └── publish.ts
│   └── services/
│       ├── config.ts            # Configuration management
│       ├── retell-client.ts     # API client wrapper
│       ├── output-formatter.ts  # Output formatting
│       └── prompt-resolver.ts   # Prompt type resolution
├── tests/
│   ├── unit/                    # Unit tests (mirror src/)
│   ├── integration/             # Integration tests
│   └── shell-compat.sh          # Shell compatibility tests
├── dist/                        # Build output
└── docs/                        # Documentation
```

### Directory Responsibilities

- **`src/index.ts`**: CLI entry point, registers all commands
- **`src/commands/`**: Command implementations (thin layer)
- **`src/services/`**: Business logic and API interactions
- **`tests/unit/`**: Unit tests for commands and services
- **`tests/integration/`**: End-to-end workflow tests
- **`dist/`**: Bundled output from esbuild

## Core Components

### 1. CLI Entry Point (`src/index.ts`)

Responsibilities:
- Initialize Commander program
- Register all commands
- Configure global options
- Parse arguments

```typescript
const program = new Command();

program
  .name('retell')
  .description('Retell AI CLI')
  .version(packageJson.version)
  .option('--json', 'Output as JSON', true);

// Register commands
program
  .command('login')
  .action(async () => await loginCommand());

program.parse(process.argv);
```

### 2. Configuration Service (`src/services/config.ts`)

Manages API key storage and retrieval.

**Features:**
- Reads from environment variable (`RETELL_API_KEY`)
- Reads from local config file (`.retellrc.json`)
- Saves API key with secure permissions (0600)
- Validates API key format

**API:**
```typescript
export function getApiKey(): string | null
export function saveApiKey(apiKey: string): string
```

**Precedence:**
1. Environment variable
2. Local config file

### 3. Retell Client Service (`src/services/retell-client.ts`)

Wrapper around the Retell SDK.

**Features:**
- Lazy initialization
- Automatic API key configuration
- Singleton pattern

**API:**
```typescript
export function getRetellClient(): RetellClient
```

### 4. Output Formatter (`src/services/output-formatter.ts`)

Handles JSON output and error formatting.

**Features:**
- Consistent JSON output
- User-friendly error messages
- Error code mapping

**API:**
```typescript
export function outputJson(data: unknown): void
export function handleSdkError(error: unknown): never
```

### 5. Prompt Resolver (`src/services/prompt-resolver.ts`)

Determines prompt source based on agent type.

**Features:**
- Handles Retell LLM agents
- Handles Conversation Flow agents
- Detects custom LLM agents (not supported)
- Type-safe prompt structures

**API:**
```typescript
export async function resolvePromptSource(agentId: string): Promise<PromptSource>
```

**Prompt Source Types:**
```typescript
type PromptSource =
  | { type: 'retell-llm'; llmId: string; prompts: RetellLlmPrompts }
  | { type: 'conversation-flow'; flowId: string; prompts: FlowPrompts }
  | { type: 'custom-llm'; error: string }
```

## Command Pattern

All commands follow a consistent pattern:

### Command Structure

```typescript
/**
 * Command description
 *
 * @param arg Command argument
 * @param options Command options
 */
export async function commandName(
  arg: string,
  options?: { option?: string }
): Promise<void> {
  try {
    // 1. Get dependencies
    const client = getRetellClient();

    // 2. Call API
    const result = await client.someMethod(arg);

    // 3. Transform data (if needed)
    const transformed = transform(result);

    // 4. Output result
    outputJson(transformed);
  } catch (error) {
    // 5. Handle errors
    handleSdkError(error);
  }
}
```

### Command Registration

Commands are registered in `src/index.ts`:

```typescript
// Single command
program
  .command('login')
  .description('Authenticate with Retell AI')
  .action(async () => await loginCommand());

// Command with arguments
program
  .command('transcripts get <call_id>')
  .description('Get a specific call transcript')
  .action(async (callId) => await getTranscriptCommand(callId));

// Command with options
program
  .command('transcripts list')
  .option('-l, --limit <number>', 'Maximum number of calls', '50')
  .action(async (options) => {
    const limit = parseInt(options.limit, 10);
    await listTranscriptsCommand({ limit });
  });

// Nested commands
const transcripts = program
  .command('transcripts')
  .description('Manage call transcripts');

transcripts
  .command('list')
  .action(async () => await listTranscriptsCommand());
```

## Service Layer

### Config Service Architecture

```
┌─────────────────┐
│ getApiKey()     │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Check   │
    │ env var │
    └────┬────┘
         │
         ├─ Found ──> Return API key
         │
    ┌────▼────────┐
    │ Check       │
    │ .retellrc   │
    └────┬────────┘
         │
         ├─ Found ──> Return API key
         │
         └─ Not found ──> Return null
```

### Retell Client Service Architecture

```
┌──────────────────────┐
│ getRetellClient()    │
└──────────┬───────────┘
           │
     ┌─────▼─────┐
     │ Singleton │ ◄─── Lazy initialization
     │ instance? │
     └─────┬─────┘
           │
      ┌────▼────────────┐
      │ Get API key     │
      │ from config     │
      └────┬────────────┘
           │
      ┌────▼────────────┐
      │ Initialize      │
      │ Retell SDK      │
      └────┬────────────┘
           │
           └──> Return client
```

### Prompt Resolver Architecture

```
┌────────────────────────────┐
│ resolvePromptSource()      │
└──────────┬─────────────────┘
           │
      ┌────▼─────────┐
      │ Get agent    │
      │ via API      │
      └────┬─────────┘
           │
      ┌────▼──────────────────┐
      │ Check engine type     │
      └────┬──────────────────┘
           │
      ┌────▼─────────┐
      │ retell-llm?  │
      └────┬────┬────┘
           │    │
     Yes ──┘    └── No
      │              │
┌─────▼─────┐   ┌───▼─────────────┐
│ Get LLM   │   │ conversation-   │
│ details   │   │ flow?           │
└─────┬─────┘   └───┬────┬────────┘
      │             │    │
      └──> Return   │    └── custom-llm
           LLM      │         │
           prompts  │         └──> Return error
                    │
              ┌─────▼──────┐
              │ Get flow   │
              │ details    │
              └─────┬──────┘
                    │
                    └──> Return flow prompts
```

## Error Handling

### Error Hierarchy

```
Error (base)
  └─ SDKError (from Retell SDK)
       ├─ AuthenticationError
       ├─ NotFoundError
       ├─ ValidationError
       └─ NetworkError
```

### Error Handling Flow

```typescript
try {
  // Command execution
} catch (error) {
  handleSdkError(error);
}
```

**`handleSdkError` function:**

```typescript
export function handleSdkError(error: unknown): never {
  // 1. Determine error type
  const errorType = getErrorType(error);

  // 2. Create user-friendly message
  const message = getUserFriendlyMessage(errorType, error);

  // 3. Format as JSON
  const output = {
    error: message,
    code: errorType
  };

  // 4. Output to stderr
  console.error(JSON.stringify(output, null, 2));

  // 5. Exit with error code
  process.exit(1);
}
```

### Error Message Patterns

**Authentication Error:**
```json
{
  "error": "API key is missing. Run 'retell login' or set RETELL_API_KEY environment variable.",
  "code": "AUTHENTICATION_ERROR"
}
```

**Not Found Error:**
```json
{
  "error": "Call not found: call_xyz789",
  "code": "NOT_FOUND"
}
```

**Custom LLM Error:**
```json
{
  "error": "Cannot manage custom LLM agents via API. Use the Retell dashboard.",
  "code": "CUSTOM_LLM_ERROR"
}
```

## Testing Strategy

### Test Pyramid

```
       ┌──────────────┐
       │ Shell Compat │  (3 tests)
       └──────┬───────┘
          ┌───▼─────────┐
          │ Integration │  (12 tests)
          └───┬─────────┘
        ┌─────▼──────┐
        │   Unit     │  (210 tests)
        └────────────┘
```

### Unit Tests

**Location:** `tests/unit/`

**Coverage:**
- All commands
- All services
- Edge cases
- Error handling

**Pattern:**
```typescript
describe('commandName', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should handle valid input', async () => {
    // Arrange
    const input = 'valid';
    const mockResult = { data: 'result' };
    mockClient.method.mockResolvedValue(mockResult);

    // Act
    await commandName(input);

    // Assert
    expect(mockClient.method).toHaveBeenCalledWith(input);
    expect(outputJson).toHaveBeenCalledWith(mockResult);
  });

  it('should handle errors', async () => {
    // Arrange
    const input = 'invalid';
    mockClient.method.mockRejectedValue(new Error('Test error'));

    // Act & Assert
    await expect(commandName(input)).rejects.toThrow();
  });
});
```

### Integration Tests

**Location:** `tests/integration/`

**Coverage:**
- Complete workflows
- Multi-step operations
- Service interactions

**Example:**
```typescript
describe('Prompt Management Workflow', () => {
  it('should pull, update, and publish prompts', async () => {
    // Pull
    await pullPromptsCommand('agent_123', { output: 'test.json' });

    // Update
    await updatePromptsCommand('agent_123', { source: 'test.json' });

    // Publish
    await publishAgentCommand('agent_123');

    // Verify
    expect(mockClient.agent.update).toHaveBeenCalled();
  });
});
```

### Shell Compatibility Tests

**Location:** `tests/shell-compat.sh`

**Coverage:**
- Bash compatibility
- Zsh compatibility
- Fish compatibility
- Shebang execution
- Environment variables

## Build System

### esbuild Configuration

```typescript
{
  entry: 'src/index.ts',
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  banner: '#!/usr/bin/env node',  // Shebang
  external: ['readline'],          // Exclude native modules
  packages: 'external'             // Exclude node_modules
}
```

### Build Process

```
src/index.ts
  └─> esbuild
      ├─> Bundle TypeScript
      ├─> Transpile to JS
      ├─> Add shebang
      └─> Output dist/index.js
```

### Output Structure

```
dist/
└── index.js   # Single bundled file with shebang
```

**Benefits:**
- Fast builds (<1 second)
- Single file distribution
- No runtime dependencies (except node_modules)
- Executable via shebang

## Data Flow

### Typical Command Flow

```
User Input
  │
  ▼
Commander.js (parse args)
  │
  ▼
Command Handler
  │
  ├──> Config Service (get API key)
  │
  ├──> Retell Client (API call)
  │
  ├──> Transform/Process
  │
  └──> Output Formatter
        │
        ▼
      stdout (JSON)
```

### Error Flow

```
API Error
  │
  ▼
Command Handler (catch)
  │
  ▼
Error Handler
  │
  ├──> Detect error type
  ├──> Format user message
  └──> Output to stderr
        │
        ▼
      process.exit(1)
```

## Design Patterns

### 1. Singleton Pattern

Used for:
- Retell Client (one instance per process)
- Configuration (one config per process)

### 2. Factory Pattern

Used for:
- Creating service instances
- Resolving prompt sources

### 3. Command Pattern

Used for:
- All CLI commands
- Consistent interface

### 4. Strategy Pattern

Used for:
- Different prompt types (Retell LLM vs Conversation Flow)
- Output formatting

## Security Considerations

### 1. API Key Storage

- Stored with permissions 0600 (owner read/write only)
- Never logged or printed
- Environment variables have precedence

### 2. Input Validation

- All inputs validated before API calls
- Type checking via TypeScript
- No arbitrary code execution

### 3. Error Messages

- No sensitive data in error messages
- Stack traces never exposed to users
- Consistent error codes

## Performance Considerations

### 1. Lazy Initialization

Services are initialized only when needed:

```typescript
let client: RetellClient | null = null;

export function getRetellClient(): RetellClient {
  if (!client) {
    client = new RetellClient({ apiKey: getApiKey() });
  }
  return client;
}
```

### 2. Minimal Dependencies

- Only essential dependencies included
- Native Node.js modules preferred
- Small bundle size (<100KB)

### 3. Streaming Output

- JSON output written directly to stdout
- No buffering for large datasets

## Future Enhancements

See [phase-8-future.md](phase-8-future.md) for planned improvements:

- Batch operations
- Advanced filtering
- Configuration profiles
- Output templating
- Shell completions

---

For more information:
- [API Reference](api-reference.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [User Guide](user-guide.md)
