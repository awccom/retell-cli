# Phase 7: Documentation & Polish

**Total Tasks:** 4
**Estimated Time:** 2-2.5 hours
**Status:** Not Started

## Overview

This phase focuses on creating comprehensive documentation, polishing the CLI experience, and preparing the package for NPM publication. Good documentation is critical for both human users and AI agents.

## Prerequisites

- ✅ All implementation phases completed (Phases 1-5)
- ✅ Testing phase completed (Phase 6)

## Progress Checklist

- [ ] Task 7.1: README Documentation (45-60 min)
- [ ] Task 7.2: CLI Help Text Polish (20-30 min)
- [ ] Task 7.3: NPM Package Preparation (30-45 min)
- [ ] Task 7.4: NPM Publishing (15-20 min)

---

## Task 7.1: README Documentation

**Estimated Time:** 45-60 minutes
**Dependencies:** All implementation tasks
**Status:** [ ] Not Started

### Deliverables

- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Command reference
- [ ] Example workflows
- [ ] Troubleshooting section
- [ ] AI agent usage guide

### README Structure

```markdown
# Retell AI CLI

[![npm version](https://badge.fury.io/js/retell-cli.svg)](https://www.npmjs.com/package/retell-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official command-line tool for Retell AI - analyze call transcripts and manage agent prompts.

## Features

- 📞 **Transcript Management** - List, retrieve, and analyze call transcripts
- 🤖 **Agent Management** - View and configure Retell AI agents
- ✏️ **Prompt Engineering** - Pull, edit, and update agent prompts
- 🔄 **Multi-format Support** - Works with Retell LLM and Conversation Flows
- 🤝 **AI-Friendly** - JSON output by default for AI coding assistants
- 🐚 **Cross-Shell** - Works in bash, fish, zsh, and more

## Installation

```bash
npm install -g retell-cli
```

## Quick Start

1. **Authenticate**
```bash
retell login
# Enter your Retell API key when prompted
```

2. **List your agents**
```bash
retell agents list
```

3. **Analyze a call transcript**
```bash
retell transcripts list
retell transcripts analyze <call_id>
```

4. **Manage prompts**
```bash
retell prompts pull <agent_id> --output prompts.json
# Edit prompts.json
retell prompts update <agent_id> --file prompts.json --publish
```

## Authentication

The CLI supports three authentication methods (in order of precedence):

1. **Environment variable** (best for CI/CD)
```bash
export RETELL_API_KEY=your_api_key_here
retell agents list
```

2. **Local config file** (best for development)
```bash
retell login
# Creates .retellrc.json in current directory
```

3. **Per-command override**
```bash
RETELL_API_KEY=key_abc123 retell agents list
```

## Command Reference

### Authentication
- `retell login` - Save API key to local config

### Transcripts
- `retell transcripts list [options]` - List call transcripts
- `retell transcripts get <call_id>` - Get detailed call information
- `retell transcripts analyze <call_id>` - Analyze transcript for issues

### Agents
- `retell agents list` - List all agents
- `retell agents info <agent_id>` - Get agent details

### Prompts
- `retell prompts pull <agent_id>` - Download agent prompts
- `retell prompts update <agent_id> --file <path>` - Update agent prompts
- `retell agent publish <agent_id>` - Publish draft agent

## For AI Agents

All commands output JSON by default, making this CLI perfect for AI coding assistants like Claude Code, Cursor, and GitHub Copilot.

### Example AI Workflow

```bash
# List all calls and find issues
retell transcripts list --json | jq '.[] | select(.call_status == "error")'

# Analyze a problematic call
retell transcripts analyze call_123 --json

# Pull current prompts
retell prompts pull agent_456 --output current-prompts.json

# AI agent can now read and suggest improvements to prompts
# Then update with improved version
retell prompts update agent_456 --file improved-prompts.json --dry-run
retell prompts update agent_456 --file improved-prompts.json --publish
```

### Error Format

All errors are returned as JSON:
```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `AUTHENTICATION_ERROR` - Invalid API key
- `NOT_FOUND` - Resource not found
- `CUSTOM_LLM_ERROR` - Cannot manage custom LLM agents
- `TYPE_MISMATCH` - Prompt file type doesn't match agent type

## Examples

### Analyze All Failed Calls

```bash
# Get all failed calls
retell transcripts list --status error --json > failed-calls.json

# Analyze each one
for call_id in $(jq -r '.[].call_id' failed-calls.json); do
  retell transcripts analyze $call_id --json > "analysis-${call_id}.json"
done
```

### Bulk Update Prompts

```bash
# Pull all agent prompts
for agent_id in $(retell agents list --json | jq -r '.[].agent_id'); do
  retell prompts pull $agent_id --output "prompts-${agent_id}.json"
done

# ... edit prompts ...

# Update all agents
for file in prompts-*.json; do
  agent_id=$(echo $file | sed 's/prompts-//;s/.json//')
  retell prompts update $agent_id --file $file --publish
done
```

## Troubleshooting

### "API key is missing or invalid"
- Run `retell login` to set up authentication
- Or set `RETELL_API_KEY` environment variable
- Verify your API key in the Retell dashboard

### "Cannot manage custom LLM agents"
Custom LLM agents use external WebSocket connections and cannot be managed via the API. Use the Retell dashboard instead.

### "Type mismatch" error
The prompt file type must match the agent's response engine type. Check with:
```bash
retell agents info <agent_id> --json | jq '.response_engine.type'
```

### Permission denied on config file
The CLI creates `.retellrc.json` with restricted permissions (0600). If you see permission errors, check file ownership and permissions.

## Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/retell-cli.git
cd retell-cli

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link for local development
npm link
retell --version
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Your Name]

## Support

- [Documentation](https://docs.retellai.com)
- [GitHub Issues](https://github.com/YOUR_USERNAME/retell-cli/issues)
- [Retell AI Dashboard](https://app.retellai.com)
```

### Acceptance Criteria

- [x] Clear, concise, accurate
- [x] Code examples are tested and working
- [x] Covers all commands with examples
- [x] AI-friendly formatting and examples
- [x] Includes TypeScript usage examples (if applicable)
- [x] Troubleshooting section addresses common issues
- [x] Installation instructions are clear
- [x] Quick start gets users running in <5 minutes
- [x] Links to external resources work

### Testing Checklist

- [ ] All code examples work as written
- [ ] README renders correctly on GitHub
- [ ] README renders correctly on npmjs.com
- [ ] All links are valid
- [ ] Screenshots/GIFs added (optional but helpful)

---

## Task 7.2: CLI Help Text Polish

**Estimated Time:** 20-30 minutes
**Dependencies:** All command implementations
**Status:** [ ] Not Started

### Deliverables

- [ ] Review all command help text
- [ ] Ensure consistency in style
- [ ] Add examples to help output
- [ ] Fix typos and grammar

### Commander Help Examples

```typescript
program
  .command('transcripts list')
  .description('List all call transcripts')
  .option('--agent-id <id>', 'Filter by agent ID')
  .option('--status <status>', 'Filter by status (ended, ongoing, error)')
  .option('--limit <n>', 'Max results (default: 50, max: 1000)', '50')
  .option('--after <call-id>', 'Pagination: calls after this ID')
  .addHelpText('after', `
Examples:
  $ retell transcripts list
  $ retell transcripts list --agent-id agent_123
  $ retell transcripts list --status error --limit 100
  $ retell transcripts list --after call_abc --json
  `);
```

### Help Text Style Guide

- **Description:** Clear, concise, action-oriented
- **Options:** Include default values and valid choices
- **Examples:** Real-world use cases, not trivial examples
- **Consistency:** Same terminology across all commands

### Acceptance Criteria

- [x] `retell <cmd> --help` is helpful and clear
- [x] Examples are accurate and tested
- [x] Consistent formatting across all commands
- [x] No jargon without explanation
- [x] Default values shown for all options
- [x] Valid choices shown for enum options

### Review Checklist

- [ ] `retell --help` (global)
- [ ] `retell login --help`
- [ ] `retell transcripts list --help`
- [ ] `retell transcripts get --help`
- [ ] `retell transcripts analyze --help`
- [ ] `retell agents list --help`
- [ ] `retell agents info --help`
- [ ] `retell prompts pull --help`
- [ ] `retell prompts update --help`
- [ ] `retell agent publish --help`

---

## Task 7.3: NPM Package Preparation

**Estimated Time:** 30-45 minutes
**Dependencies:** Tasks 7.1, 7.2
**Status:** [ ] Not Started

### Deliverables

- [ ] Configure package.json for publishing
- [ ] Add `.npmignore` (exclude tests, src, tsconfig)
- [ ] Include only dist/ in package
- [ ] Add repository, bugs, homepage links
- [ ] Choose license (MIT recommended)
- [ ] Add keywords for discoverability
- [ ] Test local install with `npm pack`
- [ ] Ensure shebang in dist/index.js

### package.json Configuration

```json
{
  "name": "retell-cli",
  "version": "1.0.0",
  "description": "Official CLI tool for Retell AI - analyze transcripts and manage agent prompts",
  "main": "dist/index.js",
  "bin": {
    "retell": "./dist/index.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "keywords": [
    "retell",
    "retell-ai",
    "ai",
    "voice",
    "cli",
    "transcript",
    "agent",
    "llm",
    "prompt-engineering",
    "conversation-flow"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/retell-cli.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/retell-cli/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/retell-cli#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --banner:js='#!/usr/bin/env node'",
    "dev": "npm run build -- --watch",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm test"
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

### .npmignore

```
# Source files
src/
tests/
scripts/
docs/

# Config files
tsconfig.json
vitest.config.ts
.eslintrc.js

# Development files
*.test.ts
*.spec.ts
.retellrc.json

# Git files
.git
.github
.gitignore

# IDE files
.vscode
.idea

# OS files
.DS_Store
Thumbs.db

# Misc
coverage/
node_modules/
*.log
```

### LICENSE (MIT)

```
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Test Package Locally

```bash
# Build and pack
npm run build
npm pack

# Install locally
npm install -g ./retell-cli-1.0.0.tgz

# Test
retell --version
retell --help

# Uninstall
npm uninstall -g retell-cli
```

### Inspect Package Contents

```bash
tar -tzf retell-cli-1.0.0.tgz
# Verify only necessary files are included
```

### Acceptance Criteria

- [x] `npm pack` creates valid tarball
- [x] `npm install -g ./retell-cli-1.0.0.tgz` works
- [x] Executable is in PATH after install
- [x] No unnecessary files included (check with `tar -tzf`)
- [x] Shebang present in dist/index.js
- [x] `prepublishOnly` script runs build and tests
- [x] Package size is reasonable (<1MB)
- [x] All metadata fields filled (author, license, etc.)

### Testing Checklist

- [ ] Test `npm pack` output
- [ ] Install tarball locally and test
- [ ] Verify dist/index.js has shebang
- [ ] Check file permissions on dist/index.js (executable)
- [ ] Verify package.json has all required fields
- [ ] Test `prepublishOnly` script
- [ ] Check package size (<1MB)

---

## Task 7.4: NPM Publishing

**Estimated Time:** 15-20 minutes
**Dependencies:** Task 7.3
**Status:** [ ] Not Started

### Deliverables

- [ ] Create NPM account (if needed)
- [ ] Run `npm publish --access public`
- [ ] Verify installation: `npm install -g retell-cli`
- [ ] Test published version on clean system
- [ ] Add npm badge to README

### Publishing Steps

```bash
# Login to NPM (if not already logged in)
npm login

# Verify you're logged in
npm whoami

# Dry run to check what will be published
npm publish --access public --dry-run

# Actually publish
npm publish --access public

# Verify it's published
npm view retell-cli

# Test installation
npm install -g retell-cli
retell --version
```

### Post-Publication

1. **Update README with badge**
```markdown
[![npm version](https://badge.fury.io/js/retell-cli.svg)](https://www.npmjs.com/package/retell-cli)
```

2. **Create GitHub release**
```bash
git tag v1.0.0
git push origin v1.0.0
# Create release on GitHub with changelog
```

3. **Announce**
- Retell AI community/Discord
- Twitter/social media
- Dev.to/Medium article (optional)

### Acceptance Criteria

- [x] Package available on npmjs.com
- [x] Global install works: `npm i -g retell-cli`
- [x] Command runs: `retell --version`
- [x] README renders correctly on npm
- [x] All links work on npm page
- [x] Package can be installed on clean system
- [x] GitHub release created
- [x] Version tagged in git

### Testing Checklist

- [ ] Published to npmjs.com successfully
- [ ] Package page looks correct
- [ ] Install on Ubuntu (clean VM/container)
- [ ] Install on macOS (if available)
- [ ] Install on CachyOS with fish (primary target)
- [ ] Test all commands work after global install
- [ ] Verify version number matches

---

## Phase Completion

Once all tasks are complete:
- [ ] All 4 tasks checked off
- [ ] README is comprehensive and tested
- [ ] Help text is polished
- [ ] Package published to NPM
- [ ] GitHub release created
- [ ] **PROJECT COMPLETE!** 🎉

## Optional: Phase 8

→ [Phase 8: Future Enhancements](./phase-8-future.md) (Optional improvements)
