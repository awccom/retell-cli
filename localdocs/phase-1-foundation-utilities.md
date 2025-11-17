# Phase 1: Foundation & Utilities

**Duration:** 2-3 days
**Dependencies:** None

---

## Objective

Build shared utilities that multiple features will depend on.

---

## Tasks

### 1. Create Field Filtering Utility

**File:** `src/services/output-formatter.ts`

**Function:** `filterFields(data: any, fields: string[]): any`

**Requirements:**
- Support dot notation for nested fields (`metadata.duration`)
- Handle arrays and edge cases (missing fields, invalid paths)
- Return meaningful errors for invalid field names
- Preserve data types when filtering
- Handle both object and array inputs

**Implementation Notes:**
- Use lodash.get or similar for nested path traversal
- Validate field paths before filtering
- Gracefully handle non-existent paths (skip or return null)
- Support wildcard patterns if needed (future enhancement)

---

### 2. Create Prompt Diffing Utility

**File:** `src/services/prompt-diff.ts` (new)

**Function:** `generateDiff(local: PromptSource, remote: PromptSource): DiffResult`

**Requirements:**
- Support both retell-llm and conversation-flow types
- Generate structured diff output with old/new values
- Handle file-based vs API-based prompt structures
- Identify added, removed, and modified content
- Format diffs in a human-readable structure

**Implementation Notes:**
- Use deep comparison for nested objects
- Consider using a diff library (e.g., `deep-diff`, `just-diff`)
- Structure output as JSON for programmatic consumption
- Include metadata about what changed (path, type of change)

**Output Structure:**
```typescript
interface DiffResult {
  agent_id: string;
  agent_type: 'retell-llm' | 'conversation-flow';
  has_changes: boolean;
  changes: {
    [key: string]: {
      old: string | object | null;
      new: string | object | null;
      change_type: 'added' | 'removed' | 'modified';
    }
  };
}
```

---

### 3. Add TypeScript Types

**File:** `src/types/index.ts` (new or enhanced)

**Required Interfaces:**

```typescript
// For diff functionality
interface DiffResult {
  agent_id: string;
  agent_type: 'retell-llm' | 'conversation-flow';
  has_changes: boolean;
  changes: Record<string, ChangeDetail>;
}

interface ChangeDetail {
  old: string | object | null;
  new: string | object | null;
  change_type: 'added' | 'removed' | 'modified';
}

// For hotspot detection
interface HotspotIssue {
  turn_index: number;
  timestamp: string;
  issue_type: 'latency_spike' | 'interruption' | 'sentiment' | 'long_silence';
  user_utterance?: string;
  agent_utterance?: string;
  metrics?: Record<string, number>;
  suggested_prompt_fix?: string;
}

interface HotspotsResult {
  call_id: string;
  hotspots: HotspotIssue[];
}

// For search functionality
interface SearchOptions {
  status?: string;
  agent_id?: string;
  since?: string;
  until?: string;
  limit?: number;
}

interface SearchResult {
  results: any[];
  total_count: number;
  filters_applied: SearchOptions;
}
```

---

## Deliverables

- [ ] `src/services/output-formatter.ts` - Enhanced with `filterFields()`
- [ ] `src/services/prompt-diff.ts` - New utility for diffing
- [ ] `src/types/index.ts` - Type definitions for all new features
- [ ] Unit tests for all utilities

---

## Testing Requirements

### Unit Tests for `filterFields()`

- [ ] **Top-level field selection**
  ```typescript
  filterFields({a: 1, b: 2, c: 3}, ['a', 'c'])
  // Expected: {a: 1, c: 3}
  ```

- [ ] **Nested field selection with dot notation**
  ```typescript
  filterFields({metadata: {duration: 100, cost: 50}}, ['metadata.duration'])
  // Expected: {metadata: {duration: 100}}
  ```

- [ ] **Multiple fields selection**
  ```typescript
  filterFields({a: 1, b: {c: 2, d: 3}, e: 4}, ['a', 'b.c', 'e'])
  // Expected: {a: 1, b: {c: 2}, e: 4}
  ```

- [ ] **Invalid field names** (should gracefully skip or warn)
  ```typescript
  filterFields({a: 1, b: 2}, ['a', 'nonexistent', 'b'])
  // Expected: {a: 1, b: 2} (or warning logged)
  ```

- [ ] **Array handling**
  ```typescript
  filterFields([{a: 1, b: 2}, {a: 3, b: 4}], ['a'])
  // Expected: [{a: 1}, {a: 3}]
  ```

- [ ] **Empty/null data handling**
  ```typescript
  filterFields(null, ['a'])
  // Expected: null or {} (graceful handling)
  ```

---

### Unit Tests for `generateDiff()`

- [ ] **Retell-LLM prompt changes** (general_prompt, states)
  - Test general_prompt modification
  - Test state addition/removal
  - Test state content modification

- [ ] **Conversation-flow prompt changes**
  - Test global_prompt modification
  - Test node changes in nodes.json

- [ ] **No changes scenario**
  ```typescript
  generateDiff(samePrompts, samePrompts)
  // Expected: { has_changes: false, changes: {} }
  ```

- [ ] **New files vs deleted files**
  - Test adding new state file
  - Test removing existing state
  - Test adding new node

- [ ] **Type mismatches between local and remote**
  - Test error when local is retell-llm but remote is conversation-flow

---

## Dependencies to Install

Consider adding these npm packages:

```bash
npm install lodash.get lodash.set
npm install deep-diff  # or just-diff
npm install @types/lodash.get --save-dev
```

---

## Success Criteria

- [ ] All utility functions implemented and typed
- [ ] All unit tests passing
- [ ] No breaking changes to existing code
- [ ] Functions are performant (handle large objects efficiently)
- [ ] Error handling is robust and user-friendly
- [ ] Code is documented with JSDoc comments

---

## Next Phase

After completion, proceed to **Phase 2: Field Selection** which will use the `filterFields()` utility.
