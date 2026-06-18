import { describe, expect, it } from "vitest";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "./paginated-response";

describe("getPaginatedItems", () => {
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
