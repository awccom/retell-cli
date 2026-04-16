/**
 * Unit tests for flag-guards service
 */

import { describe, it, expect } from "vitest";
import { requireNonEmpty } from "./flag-guards";

describe("requireNonEmpty", () => {
  it("returns the value for non-empty strings", () => {
    expect(requireNonEmpty("abc", "--flag")).toBe("abc");
  });

  it("preserves surrounding whitespace on otherwise non-empty values", () => {
    expect(requireNonEmpty(" abc ", "--flag")).toBe(" abc ");
  });

  it("throws ValidationError on empty string", () => {
    try {
      requireNonEmpty("", "--agent-id");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toBe("--agent-id must not be empty");
    }
  });

  it("throws ValidationError on whitespace-only string", () => {
    try {
      requireNonEmpty("   ", "--agent-id");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toBe("--agent-id must not be empty");
    }
  });
});
