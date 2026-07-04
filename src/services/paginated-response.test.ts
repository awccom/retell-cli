import { describe, expect, it } from "vitest";
import {
  getPaginatedItems,
  isRecord,
  normalizeListResponse,
  withPaginationMetadata,
} from "./paginated-response";

describe("getPaginatedItems", () => {
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

  it("returns legacy array responses unchanged", () => {
    const items = [{ id: "one" }];

    expect(getPaginatedItems(items)).toBe(items);
  });

  it("returns items from unified paginated responses", () => {
    expect(
      getPaginatedItems({
        items: [{ id: "one" }, { id: "two" }],
        has_more: true,
        pagination_key: "next",
      }),
    ).toEqual([{ id: "one" }, { id: "two" }]);
  });

  it("returns an empty array when items are absent", () => {
    expect(getPaginatedItems({ has_more: false })).toEqual([]);
    expect(getPaginatedItems(undefined)).toEqual([]);
  });

  it("returns array output unchanged when pagination metadata is absent", () => {
    expect(withPaginationMetadata([{ id: "one" }], [{ id: "one" }])).toEqual([
      { id: "one" },
    ]);
  });

  it("adds pagination metadata alongside displayed items", () => {
    expect(
      withPaginationMetadata(
        {
          items: [{ id: "raw" }],
          has_more: true,
          pagination_key: "next",
        },
        [{ id: "display" }],
      ),
    ).toEqual({
      items: [{ id: "display" }],
      has_more: true,
      pagination_key: "next",
    });
  });
});
