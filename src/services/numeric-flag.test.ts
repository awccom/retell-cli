import { describe, it, expect } from "vitest";
import { parseNumericFlag } from "./numeric-flag";

describe("parseNumericFlag", () => {
  it("parses integer strings", () => {
    expect(parseNumericFlag("42", "--version")).toBe(42);
  });

  it("parses floats", () => {
    expect(parseNumericFlag("1.5", "--weight")).toBe(1.5);
  });

  it("parses negative numbers", () => {
    expect(parseNumericFlag("-3", "--offset")).toBe(-3);
  });

  it("throws ValidationError on empty string", () => {
    try {
      parseNumericFlag("", "--version");
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toBe("--version must be a number");
    }
  });

  it("throws ValidationError on whitespace-only string", () => {
    expect(() => parseNumericFlag("   ", "--limit")).toThrow(
      "--limit must be a number",
    );
  });

  it("throws ValidationError on non-numeric string", () => {
    expect(() => parseNumericFlag("latest", "--version")).toThrow(
      "--version must be a number",
    );
  });

  it("throws ValidationError on NaN-producing string", () => {
    expect(() => parseNumericFlag("NaN", "--version")).toThrow(
      "--version must be a number",
    );
  });

  it("throws ValidationError on Infinity", () => {
    expect(() => parseNumericFlag("Infinity", "--version")).toThrow(
      "--version must be a number",
    );
  });
});
