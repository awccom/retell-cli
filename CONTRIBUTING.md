# Contributing to Retell AI CLI

Thank you for your interest in contributing to the Retell AI CLI! This document provides guidelines and information for contributors.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**
- A Retell AI account with API key

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/awccom/retell-cli.git
cd retell-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link

# Verify installation
retell --version
```

### Development Commands

```bash
# Build (one-time)
npm run build

# Build and watch for changes
npm run dev

# Run tests
npm test                 # Watch mode
npm run test:run        # Run once
npm run test:shell      # Shell compatibility tests

# Lint and format (if configured)
npm run lint            # Run linter
npm run format          # Format code
```

### Environment Setup

Create a `.env` file for development (optional):

```bash
RETELL_API_KEY=your_test_api_key
```

Or use `.retellrc.json`:

```bash
echo '{"apiKey":"your_test_api_key"}' > .retellrc.json
chmod 600 .retellrc.json
```

## Project Structure

```
retell-cli/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── commands/                # Command implementations
│   │   ├── login.ts            # Login command
│   │   ├── transcripts/        # Transcript commands
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   └── analyze.ts
│   │   ├── agents/             # Agent commands
│   │   │   ├── list.ts
│   │   │   └── info.ts
│   │   ├── prompts/            # Prompt commands
│   │   │   ├── pull.ts
│   │   │   └── update.ts
│   │   └── agent/              # Agent management
│   │       └── publish.ts
│   └── services/               # Core services
│       ├── config.ts           # Configuration management
│       ├── retell-client.ts    # Retell API client
│       ├── output-formatter.ts # Output formatting
│       └── prompt-resolver.ts  # Prompt type resolution
├── tests/
│   ├── unit/                   # Unit tests
│   │   ├── commands/
│   │   └── services/
│   ├── integration/            # Integration tests
│   └── shell-compat.sh         # Shell compatibility tests
├── docs/                       # Documentation
│   ├── user-guide.md
│   ├── architecture.md
│   ├── api-reference.md
│   └── examples/
├── dist/                       # Build output (generated)
│   └── index.js               # Bundled CLI
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Key Directories

- **`src/commands/`**: All CLI commands, organized by category
- **`src/services/`**: Reusable services (API client, config, formatting)
- **`tests/`**: All tests (unit, integration, shell compatibility)
- **`docs/`**: User and developer documentation

## Development Workflow

### 1. Create a Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

Follow the project structure and patterns:

#### Adding a New Command

1. Create command file in appropriate directory:
   ```typescript
   // src/commands/your-category/your-command.ts
   import { getRetellClient } from '../../services/retell-client';
   import { outputJson, handleSdkError } from '../../services/output-formatter';

   export async function yourCommand(arg: string): Promise<void> {
     try {
       const client = getRetellClient();
       const result = await client.yourMethod(arg);
       outputJson(result);
     } catch (error) {
       handleSdkError(error);
     }
   }
   ```

2. Register command in `src/index.ts`:
   ```typescript
   import { yourCommand } from './commands/your-category/your-command';

   program
     .command('your-command <arg>')
     .description('Description of your command')
     .action(async (arg) => {
       await yourCommand(arg);
     });
   ```

3. Write tests in `tests/unit/your-category/your-command.test.ts`

#### Adding a New Service

1. Create service file in `src/services/`:
   ```typescript
   // src/services/your-service.ts
   export function yourServiceFunction(): void {
     // Implementation
   }
   ```

2. Export from service file
3. Import where needed
4. Write unit tests

### 3. Write Tests

All new features must include tests:

```bash
# Create test file
touch tests/unit/your-category/your-command.test.ts
```

**Test Template:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { yourCommand } from '../../../src/commands/your-category/your-command';

describe('yourCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    const input = 'test';

    // Act
    await yourCommand(input);

    // Assert
    expect(someMock).toHaveBeenCalledWith(input);
  });

  it('should handle errors', async () => {
    // Test error handling
  });
});
```

### 4. Run Tests

```bash
# Run all tests
npm run test:run

# Run specific test file
npx vitest tests/unit/your-category/your-command.test.ts

# Run with coverage
npx vitest run --coverage
```

### 5. Build and Test Locally

```bash
# Build
npm run build

# Test the built CLI
./dist/index.js --help
./dist/index.js your-command test-arg

# Or use npm link
npm link
retell your-command test-arg
```

## Testing

### Test Requirements

- **Coverage**: Maintain >90% code coverage
- **Unit Tests**: All functions and commands must have unit tests
- **Integration Tests**: Test complete workflows
- **Shell Compatibility**: Ensure works in bash, zsh, and fish

### Running Tests

```bash
# Unit tests (watch mode)
npm test

# All tests (run once)
npm run test:run

# Shell compatibility
npm run test:shell

# Coverage report
npx vitest run --coverage
```

### Writing Good Tests

1. **Use descriptive test names:**
   ```typescript
   it('should return error when agent is custom-llm type', async () => {
     // Test
   });
   ```

2. **Test success and error cases:**
   ```typescript
   describe('yourCommand', () => {
     it('should work with valid input', async () => { /* ... */ });
     it('should fail with invalid input', async () => { /* ... */ });
     it('should handle API errors', async () => { /* ... */ });
   });
   ```

3. **Mock external dependencies:**
   ```typescript
   import { vi } from 'vitest';

   const mockClient = {
     call: { retrieve: vi.fn() }
   };
   vi.mock('../services/retell-client', () => ({
     getRetellClient: () => mockClient
   }));
   ```

4. **Test edge cases:**
   - Empty inputs
   - Null/undefined values
   - Large datasets
   - Network failures

## Code Style

### TypeScript Guidelines

1. **Use strict typing:**
   ```typescript
   // ✓ Good
   function processCall(callId: string): Promise<CallData> {
     // Implementation
   }

   // ✗ Bad
   function processCall(callId: any): any {
     // Implementation
   }
   ```

2. **Use async/await (not callbacks):**
   ```typescript
   // ✓ Good
   async function fetchData(): Promise<Data> {
     const result = await client.getData();
     return result;
   }

   // ✗ Bad
   function fetchData(callback: (data: Data) => void): void {
     client.getData().then(callback);
   }
   ```

3. **Error handling:**
   ```typescript
   // ✓ Good
   try {
     const result = await client.getData();
     outputJson(result);
   } catch (error) {
     handleSdkError(error);
   }

   // ✗ Bad
   const result = await client.getData();  // No error handling
   ```

4. **Use const/let (not var):**
   ```typescript
   // ✓ Good
   const API_KEY = process.env.RETELL_API_KEY;
   let counter = 0;

   // ✗ Bad
   var API_KEY = process.env.RETELL_API_KEY;
   ```

### File Organization

1. **Order of sections:**
   ```typescript
   // 1. Imports
   import { something } from 'somewhere';

   // 2. Type definitions
   interface MyType {
     field: string;
   }

   // 3. Constants
   const CONSTANT_VALUE = 'value';

   // 4. Helper functions
   function helperFunction(): void {
     // Implementation
   }

   // 5. Main exported function
   export function mainFunction(): void {
     // Implementation
   }
   ```

2. **Naming conventions:**
   - Files: `kebab-case.ts` (e.g., `prompt-resolver.ts`)
   - Functions: `camelCase` (e.g., `getRetellClient`)
   - Types/Interfaces: `PascalCase` (e.g., `RetellLlmPrompts`)
   - Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_LIMIT`)

3. **Comments:**
   ```typescript
   /**
    * JSDoc for exported functions
    * @param callId The call ID to retrieve
    * @returns Call data
    */
   export async function getCall(callId: string): Promise<CallData> {
     // Implementation
   }
   ```

## Pull Request Process

### Before Submitting

1. **Update your branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run all tests:**
   ```bash
   npm run test:run
   npm run test:shell
   ```

3. **Build successfully:**
   ```bash
   npm run build
   ```

4. **Update documentation:**
   - Update README if adding new features
   - Update user-guide.md with usage examples
   - Add JSDoc comments to new functions

### Commit Messages

Follow the conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding or updating tests
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `chore`: Changes to build process or auxiliary tools

**Examples:**

```bash
# Feature
git commit -m "feat(prompts): add batch update command

Allows updating multiple agents at once from a directory of prompt files.

Closes #123"

# Bug fix
git commit -m "fix(auth): handle missing API key gracefully

Previously would crash, now shows helpful error message."

# Documentation
git commit -m "docs: add troubleshooting guide for common errors"
```

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test improvements

## Changes Made

- Added new command: `retell batch-update`
- Updated prompt-resolver service to handle batch operations
- Added integration tests for batch workflows

## Testing

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Shell compatibility tests pass
- [ ] Manually tested on: [bash/zsh/fish]

## Documentation

- [ ] Updated README
- [ ] Updated user-guide.md
- [ ] Added JSDoc comments
- [ ] Updated CHANGELOG

## Screenshots (if applicable)

[Add screenshots of CLI output]

## Breaking Changes

None / [Describe breaking changes]

## Related Issues

Closes #123
Related to #456
```

### Code Review

- Be responsive to feedback
- Make requested changes in new commits (don't force push)
- Update tests based on feedback
- Ask questions if anything is unclear

## Reporting Issues

### Before Reporting

1. Search [existing issues](https://github.com/awccom/retell-cli/issues)
2. Check [troubleshooting guide](docs/examples/troubleshooting.md)
3. Verify you're using the latest version: `retell --version`

### Bug Reports

Include:

```markdown
## Bug Description

Clear description of the bug.

## Environment

- CLI Version: `retell --version`
- Node Version: `node --version`
- OS: `uname -a` (Linux/Mac) or `ver` (Windows)
- Shell: `echo $SHELL`

## Steps to Reproduce

1. Run `retell command ...`
2. Observe error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Error Output

```
[Paste full error output here]
```

## Additional Context

Any other relevant information.
```

### Feature Requests

Include:

```markdown
## Feature Description

Clear description of the proposed feature.

## Use Case

Why is this feature needed? What problem does it solve?

## Proposed Solution

How should this feature work?

## Example Usage

```bash
retell new-command --option value
```

## Alternatives Considered

Other approaches you've considered.
```

## Development Tips

### Debugging

```bash
# Enable Node.js debugging
NODE_DEBUG=* retell command

# Use TypeScript directly (no build)
npx tsx src/index.ts command

# Debug specific command
npx tsx --inspect-brk src/index.ts command
```

### Testing Against Real API

```bash
# Use test API key
export RETELL_API_KEY=test_key_here

# Run specific command
retell agents list
```

### Hot Reload During Development

```bash
# Terminal 1: Watch for changes
npm run dev

# Terminal 2: Test CLI
retell command
```

## Getting Help

- **Documentation:** [docs/](docs/)
- **Examples:** [docs/examples/](docs/examples/)
- **Discussions:** [GitHub Discussions](https://github.com/awccom/retell-cli/discussions)
- **Discord:** [Retell AI Community](https://discord.gg/retell-ai)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Retell AI CLI!
