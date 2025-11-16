# Changelog

All notable changes to the Retell AI CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-15

### Added

#### Authentication
- `retell login` command for interactive API key authentication
- Support for `.retellrc.json` config file (auto-created with secure 0600 permissions)
- Support for `RETELL_API_KEY` environment variable
- Clear error messages for missing or invalid API keys

#### Transcript Management
- `retell transcripts list` - List all call transcripts with pagination support
- `retell transcripts get <call_id>` - Retrieve detailed transcript for a specific call
- `retell transcripts analyze <call_id>` - Get comprehensive call analysis with:
  - Call metadata (duration, status, agent info)
  - Performance metrics (latency P50/P90/P99 for E2E, LLM, TTS)
  - Sentiment analysis
  - Call success indicators
  - Full transcript with speaker labels and timestamps

#### Agent Management
- `retell agents list` - List all agents with formatted output
- `retell agents info <agent_id>` - Get detailed agent configuration
- Support for `--limit` option to control pagination
- Clear display of response engine types (retell-llm, conversation-flow, custom-llm)

#### Prompt Engineering
- `retell prompts pull <agent_id>` - Download current agent prompts
- `retell prompts update <agent_id>` - Update agent prompts from local file
- Automatic prompt type detection (Retell LLM vs Conversation Flow)
- Support for `--output` flag to specify custom file paths
- Validation of prompt structure before updates

#### Agent Publishing
- `retell agent publish <agent_id>` - Publish draft agents to production

#### Documentation
- Comprehensive README with quick start guide
- Detailed user guide with command reference and examples
- Developer documentation (CONTRIBUTING.md, architecture.md, api-reference.md)
- Example workflows (basic usage, prompt management, troubleshooting)
- Troubleshooting guide with common issues and solutions

#### Testing & Quality
- 130+ unit tests with >90% code coverage
- Integration tests for complete workflows
- Shell compatibility testing (bash, zsh, fish)
- Comprehensive error handling and validation

### Features

- **JSON Output by Default** - All commands output JSON for easy parsing and integration with AI tools
- **Cross-Shell Compatibility** - Works seamlessly across bash, zsh, and fish shells
- **AI-Friendly Design** - Structured output perfect for AI coding assistants
- **Helpful Error Messages** - Clear, actionable error messages with suggestions
- **Command Examples** - Every command includes usage examples in help text
- **Secure Configuration** - Config files created with restricted permissions (0600)
- **Type Safety** - Built with TypeScript for reliability and maintainability
- **Fast & Lightweight** - Single bundled binary, ~28KB output size

### Developer Experience

- Clean command pattern architecture
- Service-oriented design with clear separation of concerns
- Comprehensive unit and integration test coverage
- Type-safe implementation with TypeScript
- Easy to extend with new commands
- Professional development workflow with CI/CD ready scripts

### Dependencies

- Node.js >= 18.0.0
- commander.js 11.x - CLI framework
- retell-sdk 4.5.x - Official Retell AI SDK
- TypeScript 5.x - Type safety
- Vitest 1.x - Testing framework
- esbuild 0.19.x - Fast bundling

### Package

- Published to npm as `retell-cli`
- Global installation: `npm install -g retell-cli`
- Direct usage: `npx retell-cli@latest`
- Clean package structure with only necessary files
- Comprehensive keywords for discoverability

---

## Release Notes

### What's New in v1.0.0

This is the first production-ready release of the Retell AI CLI! 🎉

The CLI provides a complete command-line interface for:
- Analyzing call transcripts with detailed performance metrics
- Managing Retell AI agents and configurations
- Engineering and updating agent prompts
- Publishing agents to production

**Key Highlights:**
- ✅ Full feature parity with core Retell AI workflows
- ✅ Comprehensive documentation for users and developers
- ✅ Production-ready with extensive testing (130+ tests)
- ✅ Cross-platform and cross-shell compatible
- ✅ AI-friendly JSON output for automation

**Installation:**
```bash
npm install -g retell-cli
retell login
retell --help
```

**Quick Start:**
```bash
# List your agents
retell agents list

# Analyze a call
retell transcripts analyze call_abc123

# Update prompts
retell prompts pull agent_123abc
# Edit the downloaded file
retell prompts update agent_123abc
```

For complete documentation, visit: https://github.com/awccom/retell-cli

---

[1.0.0]: https://github.com/awccom/retell-cli/releases/tag/v1.0.0
