#!/bin/bash
# Shell Compatibility Test Script
# Tests the CLI across bash, zsh, and fish shells

set -e

CLI_PATH="./dist/index.js"
EXPECTED_VERSION="0.1.0"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test a command in a shell
test_command() {
  local shell=$1
  local description=$2
  local command=$3
  local expected_pattern=$4

  echo -n "Testing $shell: $description... "

  if [ "$shell" = "fish" ]; then
    # Fish has different syntax
    if output=$($shell -c "$command" 2>&1); then
      if echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
      else
        echo -e "${RED}✗ FAIL${NC} - Output did not match pattern: $expected_pattern"
        echo "Output: $output"
        ((TESTS_FAILED++))
      fi
    else
      echo -e "${RED}✗ FAIL${NC} - Command failed"
      ((TESTS_FAILED++))
    fi
  else
    # Bash and zsh
    if output=$($shell -c "$command" 2>&1); then
      if echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
      else
        echo -e "${RED}✗ FAIL${NC} - Output did not match pattern: $expected_pattern"
        echo "Output: $output"
        ((TESTS_FAILED++))
      fi
    else
      echo -e "${RED}✗ FAIL${NC} - Command failed"
      ((TESTS_FAILED++))
    fi
  fi
}

# Check if required shells are available
check_shell() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${YELLOW}Warning: $1 not found, skipping tests for this shell${NC}"
    return 1
  fi
  return 0
}

echo "========================================"
echo "Shell Compatibility Test Suite"
echo "========================================"
echo ""

# Check if CLI is built
if [ ! -f "$CLI_PATH" ]; then
  echo -e "${RED}Error: CLI not found at $CLI_PATH${NC}"
  echo "Please run 'npm run build' first"
  exit 1
fi

# Make CLI executable
chmod +x "$CLI_PATH"

echo "Testing CLI: $CLI_PATH"
echo ""

# Test bash
if check_shell bash; then
  echo "--- Testing bash ---"
  test_command "bash" "version check" "$CLI_PATH --version" "$EXPECTED_VERSION"
  test_command "bash" "help text" "$CLI_PATH --help" "Usage: retell"
  test_command "bash" "agents help" "$CLI_PATH agents --help" "Manage agents"
  test_command "bash" "prompts help" "$CLI_PATH prompts --help" "Manage agent prompts"
  test_command "bash" "transcripts help" "$CLI_PATH transcripts --help" "Manage call transcripts"
  echo ""
fi

# Test zsh
if check_shell zsh; then
  echo "--- Testing zsh ---"
  test_command "zsh" "version check" "$CLI_PATH --version" "$EXPECTED_VERSION"
  test_command "zsh" "help text" "$CLI_PATH --help" "Usage: retell"
  test_command "zsh" "agents help" "$CLI_PATH agents --help" "Manage agents"
  test_command "zsh" "prompts help" "$CLI_PATH prompts --help" "Manage agent prompts"
  test_command "zsh" "transcripts help" "$CLI_PATH transcripts --help" "Manage call transcripts"
  echo ""
fi

# Test fish
if check_shell fish; then
  echo "--- Testing fish ---"
  test_command "fish" "version check" "$CLI_PATH --version" "$EXPECTED_VERSION"
  test_command "fish" "help text" "$CLI_PATH --help" "Usage: retell"
  test_command "fish" "agents help" "$CLI_PATH agents --help" "Manage agents"
  test_command "fish" "prompts help" "$CLI_PATH prompts --help" "Manage agent prompts"
  test_command "fish" "transcripts help" "$CLI_PATH transcripts --help" "Manage call transcripts"
  echo ""
fi

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
