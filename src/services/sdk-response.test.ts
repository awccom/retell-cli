import { describe, expect, it } from "vitest";
import { isRecord, normalizeListResponse } from "./sdk-response";

describe("sdk-response helpers", () => {
  it("identifies non-array objects as records", () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
  });

  it("normalizes raw array responses", () => {
    const items = [{ id: "one" }];

    expect(normalizeListResponse(items, "bad shape")).toBe(items);
  });

  it("normalizes configured top-level and nested array wrappers", () => {
    const items = [{ id: "one" }];

    expect(normalizeListResponse({ items }, "bad shape", ["items"])).toBe(
      items,
    );
    expect(
      normalizeListResponse({ data: { items } }, "bad shape", [
        "data",
        "items",
      ]),
    ).toBe(items);
  });

  it("throws the provided error message for unknown shapes", () => {
    expect(() => normalizeListResponse({ nope: true }, "bad shape")).toThrow(
      "bad shape",
    );
  });
});
