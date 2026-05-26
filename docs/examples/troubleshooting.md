# Troubleshooting Guide

Solutions to common problems and error messages.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [API Errors](#api-errors)
- [Prompt Management Errors](#prompt-management-errors)
- [Installation Problems](#installation-problems)
- [Performance Issues](#performance-issues)
- [Shell-Specific Issues](#shell-specific-issues)

## Authentication Issues

### Error: "API key is missing or invalid"

**Full Error:**
```json
{
  "error": "API key is missing. Run 'retell login' or set RETELL_API_KEY environment variable."
}
```

**Cause:** No API key found or invalid API key.

**Solutions:**

1. **Use the login command:**
   ```bash
   retell login
   # Enter your API key when prompted
   ```

2. **Set environment variable:**
   ```bash
   # Bash/Zsh
   export RETELL_API_KEY=your_api_key_here

   # Fish
   set -x RETELL_API_KEY your_api_key_here
   ```

3. **Verify your API key:**
   - Visit [Retell Dashboard](https://app.retellai.com) → Settings → API Keys
   - Copy your API key
   - Run `retell login` and paste it

4. **Check config file:**
   ```bash
   cat .retellrc.json
   # Should show: {"apiKey":"your_key_here"}
   ```

### Error: "EACCES: permission denied, open '.retellrc.json'"

**Cause:** Insufficient permissions to read/write the config file.

**Solutions:**

1. **Check file permissions:**
   ```bash
   ls -la .retellrc.json
   # Should show: -rw------- (owner read/write only)
   ```

2. **Fix ownership:**
   ```bash
   sudo chown $USER .retellrc.json
   chmod 600 .retellrc.json
   ```

3. **Delete and recreate:**
   ```bash
   rm .retellrc.json
   retell login
   ```

### API Key Works in Dashboard But Not CLI

**Cause:** Possible whitespace or encoding issues.

**Solutions:**

1. **Copy API key carefully:**
   - Ensure no trailing spaces
   - No newlines
   - Use plain text, not rich text

2. **Set directly in environment:**
   ```bash
   export RETELL_API_KEY="sk_your_actual_key_here"
   retell agents list
   ```

3. **Check for invisible characters:**
   ```bash
   cat -A .retellrc.json
   # Should not show ^M or other control characters
   ```

## API Errors

### Error: "Resource not found"

**Full Error:**
```json
{
  "error": "Call not found: call_xyz789",
  "code": "NOT_FOUND"
}
```

**Cause:** The requested resource doesn't exist.

**Solutions:**

1. **Verify the ID:**
   ```bash
   # List all calls to find correct ID
   retell transcripts list

   # List all agents
   retell agents list
   ```

2. **Check for typos:**
   ```bash
   # IDs are case-sensitive
   retell transcripts get call_ABC123  # ✗ Wrong
   retell transcripts get call_abc123  # ✓ Correct
   ```

3. **Ensure resource exists:**
   ```bash
   # For calls, check if it's in your account
   retell transcripts list | jq -r '.[].call_id' | grep call_xyz789

   # For agents, verify agent_id
   retell agents list | jq -r '.[].agent_id' | grep agent_xyz
   ```

### Error: "Cannot manage custom LLM agents"

**Full Error:**
```json
{
  "error": "Cannot manage custom LLM agents via API. This agent uses a custom WebSocket connection.",
  "code": "CUSTOM_LLM_ERROR"
}
```

**Cause:** The agent uses an external custom LLM WebSocket connection.

**Solution:**

Custom LLM agents can only be managed through the [Retell Dashboard](https://app.retellai.com):

1. Go to the dashboard
2. Select your agent
3. Manage prompts and settings there

**Workaround for listing:**
```bash
# You can still list and view custom LLM agents
retell agents list

# But you cannot pull/update prompts
retell prompts pull agent_custom_llm  # Will fail
```

### Error: "Rate limit exceeded"

**Cause:** Too many API requests in a short time.

**Solution:**

Add delays between requests:

```bash
# Add sleep between calls
for call_id in $(retell transcripts list | jq -r '.[].call_id'); do
  retell transcripts analyze $call_id
  sleep 1  # Wait 1 second between requests
done
```

## Prompt Management Errors

### Error: "Type mismatch"

**Full Error:**
```json
{
  "error": "Type mismatch: agent is retell-llm but prompt file is conversation-flow",
  "code": "TYPE_MISMATCH"
}
```

**Cause:** The prompt file type doesn't match the agent's response engine type.

**Solutions:**

1. **Check agent type:**
   ```bash
   retell agents info agent_123abc | jq '.response_engine.type'
   # Output: "retell-llm" or "conversation-flow"
   ```

2. **Check prompt file type:**
   ```bash
   jq '.type' prompts.json
   # Should match agent type
   ```

3. **Pull fresh prompts:**
   ```bash
   # This ensures the correct format
   retell prompts pull agent_123abc --output correct-prompts.json
   ```

4. **Fix manually:**
   ```bash
   # For Retell LLM:
   jq '.type = "retell-llm"' prompts.json > fixed-prompts.json

   # For Conversation Flow:
   jq '.type = "conversation-flow"' prompts.json > fixed-prompts.json
   ```

### Error: "Invalid JSON in prompt file"

**Cause:** Malformed JSON syntax.

**Solutions:**

1. **Validate JSON:**
   ```bash
   jq . prompts.json
   # Will show error location if invalid
   ```

2. **Common JSON errors:**
   ```json
   // ✗ Trailing comma
   {
     "type": "retell-llm",
     "begin_message": "Hello",
   }

   // ✓ No trailing comma
   {
     "type": "retell-llm",
     "begin_message": "Hello"
   }
   ```

3. **Use a JSON linter:**
   ```bash
   npx jsonlint prompts.json
   ```

4. **Reformat with jq:**
   ```bash
   jq . prompts.json > formatted-prompts.json
   ```

### Error: "Agent update failed"

**Cause:** Invalid field values or missing required fields.

**Solution:**

1. **Check required fields:**
   ```bash
   # For Retell LLM, required fields:
   # - type
   # - begin_message
   # - general_prompt

   jq 'keys' prompts.json
   ```

2. **Pull fresh template:**
   ```bash
   retell prompts pull agent_123abc --output template.json
   # Use this as a reference for required fields
   ```

3. **Validate fields:**
   ```bash
   # Check for empty strings
   jq 'to_entries | .[] | select(.value == "")' prompts.json

   # Check for null values
   jq 'to_entries | .[] | select(.value == null)' prompts.json
   ```

### Changes Not Reflecting After Update

**Cause:** Forgot to publish the agent.

**Solution:**

After updating prompts, always publish:

```bash
retell prompts update agent_123abc --source prompts.json
retell agents publish agent_123abc  # ← Don't forget this!
```

Verify changes were applied:
```bash
retell agents info agent_123abc | jq '.response_engine.general_prompt'
```

## Installation Problems

### Error: "retell: command not found"

**Cause:** npm global bin directory not in PATH.

**Solutions:**

1. **Check npm global path:**
   ```bash
   npm config get prefix
   # Output: /usr/local (or similar)
   ```

2. **Add to PATH:**
   ```bash
   # Bash/Zsh (add to ~/.bashrc or ~/.zshrc)
   export PATH="$(npm config get prefix)/bin:$PATH"

   # Fish (add to ~/.config/fish/config.fish)
   set -gx PATH (npm config get prefix)/bin $PATH
   ```

3. **Use npx instead:**
   ```bash
   npx retell-cli@latest --help
   ```

4. **Reinstall globally:**
   ```bash
   npm uninstall -g retell-cli
   npm install -g retell-cli
   ```

### Error: "EACCES: permission denied" During Install

**Cause:** Need sudo for global npm install.

**Solutions:**

1. **Use sudo (not recommended):**
   ```bash
   sudo npm install -g retell-cli
   ```

2. **Configure npm for non-root global installs (recommended):**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc

   npm install -g retell-cli
   ```

3. **Use npx (no installation needed):**
   ```bash
   npx retell-cli@latest agents list
   ```

### Error: "Cannot find module 'commander'"

**Cause:** Incomplete or corrupted installation.

**Solution:**

Reinstall the CLI:

```bash
npm uninstall -g retell-cli
npm cache clean --force
npm install -g retell-cli
```

## Performance Issues

### Slow Command Execution

**Cause:** Network latency or large result sets.

**Solutions:**

1. **Limit results:**
   ```bash
   # Instead of:
   retell transcripts list  # Returns 50 by default

   # Use:
   retell transcripts list --limit 10  # Faster
   ```

2. **Check network:**
   ```bash
   # Test API connectivity
   curl -s https://api.retellai.com/health
   ```

3. **Use caching:**
   ```bash
   # Cache agent list
   retell agents list > agents-cache.json

   # Use cached data
   cat agents-cache.json | jq '.[] | select(.agent_name | contains("Support"))'
   ```

### Large JSON Output Overwhelming Terminal

**Solution:**

1. **Pipe to jq:**
   ```bash
   retell transcripts list | jq .
   ```

2. **Pipe to less:**
   ```bash
   retell transcripts list | less
   ```

3. **Save to file:**
   ```bash
   retell transcripts list > calls.json
   ```

4. **Limit output:**
   ```bash
   retell transcripts list | jq '.[:5]'  # First 5 only
   ```

## Shell-Specific Issues

### Fish Shell: Environment Variables Not Working

**Problem:**
```fish
RETELL_API_KEY=key_123 retell agents list  # Doesn't work in fish
```

**Solution:**

Use `env` command:
```fish
env RETELL_API_KEY=key_123 retell agents list
```

Or set the variable:
```fish
set -x RETELL_API_KEY key_123
retell agents list
```

### Zsh: Command Not Found After Install

**Cause:** PATH not updated in zsh.

**Solution:**

```zsh
# Add to ~/.zshrc
export PATH="$(npm config get prefix)/bin:$PATH"

# Reload
source ~/.zshrc
```

### Bash: "bad interpreter" Error

**Cause:** Incorrect shebang or line endings.

**Solution:**

1. **Check shebang:**
   ```bash
   head -1 $(which retell)
   # Should show: #!/usr/bin/env node
   ```

2. **Fix line endings (if using Windows):**
   ```bash
   dos2unix $(which retell)
   ```

## Output and Formatting Issues

### JSON Output Not Formatted

**Solution:**

Pipe through jq:
```bash
retell agents list | jq .
```

### Cannot Parse JSON Output

**Cause:** Error messages mixed with JSON output.

**Solution:**

1. **Check for errors:**
   ```bash
   retell agents list 2>&1 | jq .
   ```

2. **Redirect stderr:**
   ```bash
   retell agents list 2>/dev/null | jq .
   ```

3. **Validate JSON:**
   ```bash
   retell agents list | jq type
   # Should output: "array" or "object"
   ```

## Debugging Tips

### Enable Verbose Logging

```bash
# Set NODE_DEBUG environment variable
NODE_DEBUG=* retell agents list
```

### Check CLI Version

```bash
retell --version
```

### Verify Node.js Version

```bash
node --version
# Should be >= 18.0.0
```

### Test with Simple Command

```bash
# Test authentication and basic functionality
retell agents list --limit 1
```

### Generate Diagnostic Report

```bash
#!/bin/bash
# diagnostic-report.sh

echo "=== Retell CLI Diagnostic Report ===" > diagnostic.txt
echo "Date: $(date)" >> diagnostic.txt
echo "" >> diagnostic.txt

echo "CLI Version:" >> diagnostic.txt
retell --version >> diagnostic.txt 2>&1
echo "" >> diagnostic.txt

echo "Node Version:" >> diagnostic.txt
node --version >> diagnostic.txt
echo "" >> diagnostic.txt

echo "NPM Version:" >> diagnostic.txt
npm --version >> diagnostic.txt
echo "" >> diagnostic.txt

echo "OS Info:" >> diagnostic.txt
uname -a >> diagnostic.txt
echo "" >> diagnostic.txt

echo "Shell:" >> diagnostic.txt
echo $SHELL >> diagnostic.txt
echo "" >> diagnostic.txt

echo "NPM Global Prefix:" >> diagnostic.txt
npm config get prefix >> diagnostic.txt
echo "" >> diagnostic.txt

echo "PATH:" >> diagnostic.txt
echo $PATH >> diagnostic.txt
echo "" >> diagnostic.txt

echo "Config File:" >> diagnostic.txt
ls -la .retellrc.json >> diagnostic.txt 2>&1
cat .retellrc.json >> diagnostic.txt 2>&1
echo "" >> diagnostic.txt

echo "Test Command:" >> diagnostic.txt
retell agents list --limit 1 >> diagnostic.txt 2>&1

cat diagnostic.txt
```

## Getting Help

### Check Documentation

1. **CLI Help:**
   ```bash
   retell --help
   retell transcripts --help
   retell prompts update --help
   ```

2. **User Guide:**
   - [User Guide](../user-guide.md)
   - [Basic Usage Examples](basic-usage.md)
   - [Prompt Management](prompt-management.md)

### Search Existing Issues

Visit [GitHub Issues](https://github.com/awccom/retell-cli/issues) and search for your error message.

### Report a Bug

When reporting a bug, include:

1. **CLI version:** `retell --version`
2. **Node version:** `node --version`
3. **OS:** `uname -a`
4. **Shell:** `echo $SHELL`
5. **Full command:** The exact command you ran
6. **Error output:** Complete error message
7. **Expected behavior:** What you expected to happen
8. **Actual behavior:** What actually happened

**Template:**

```markdown
## Bug Report

**CLI Version:** 1.0.0
**Node Version:** v18.0.0
**OS:** Linux 6.17.7-4-cachyos
**Shell:** /usr/bin/fish

**Command:**
```bash
retell prompts update agent_123abc --source prompts.json
```

**Error:**
```json
{
  "error": "Type mismatch: agent is retell-llm but prompt file is conversation-flow",
  "code": "TYPE_MISMATCH"
}
```

**Expected:** Prompts should update successfully

**Actual:** Type mismatch error

**Additional Context:**
I pulled the prompts using `retell prompts pull agent_123abc` and made small edits.
```

## Common Pitfalls

### 1. Forgetting to Publish

```bash
# ✗ Wrong - changes won't be live
retell prompts update agent_123abc --source prompts.json

# ✓ Correct - don't forget to publish
retell prompts update agent_123abc --source prompts.json
retell agents publish agent_123abc
```

### 2. Not Using Dry Run

```bash
# ✗ Wrong - no preview of changes
retell prompts update agent_123abc --source prompts.json

# ✓ Correct - preview first
retell prompts update agent_123abc --source prompts.json --dry-run
retell prompts update agent_123abc --source prompts.json
```

### 3. Editing Wrong Agent

```bash
# ✗ Wrong - easy to mix up agent IDs
retell prompts pull agent_123abc
# ... edit prompts.json ...
retell prompts update agent_456def --source prompts.json  # Wrong agent!

# ✓ Correct - use consistent agent ID
AGENT_ID="agent_123abc"
retell prompts pull $AGENT_ID
# ... edit prompts.json ...
retell prompts update $AGENT_ID --source prompts.json
```

### 4. Overwriting Backups

```bash
# ✗ Wrong - overwrites previous backup
retell prompts pull agent_123abc --output backup.json

# ✓ Correct - use timestamps
retell prompts pull agent_123abc --output "backup-$(date +%Y%m%d-%H%M%S).json"
```

### 5. Not Validating JSON

```bash
# ✗ Wrong - apply without validation
vim prompts.json
retell prompts update agent_123abc --source prompts.json

# ✓ Correct - validate first
vim prompts.json
jq . prompts.json  # Validate JSON
retell prompts update agent_123abc --source prompts.json --dry-run
retell prompts update agent_123abc --source prompts.json
```

## Next Steps

- Return to [Basic Usage](basic-usage.md)
- Learn about [Prompt Management](prompt-management.md)
- Read the complete [User Guide](../user-guide.md)
