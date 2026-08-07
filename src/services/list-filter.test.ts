import { afterEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadListFilter } from "./list-filter";

const filterPath = join(tmpdir(), `retell-list-filter-${process.pid}.json`);

afterEach(() => {
  if (existsSync(filterPath)) unlinkSync(filterPath);
});

describe("loadListFilter", () => {
  it("parses inline JSON and @path filters", () => {
    expect(loadListFilter({ filter: '{"a":1}' })).toEqual({ a: 1 });
    writeFileSync(filterPath, JSON.stringify({ status: "ended" }));
    expect(loadListFilter({ filter: `@${filterPath}` })).toEqual({
      status: "ended",
    });
  });

  it("reads --filter-file", () => {
    writeFileSync(filterPath, JSON.stringify({ a: 1 }));
    expect(loadListFilter({ filterFile: filterPath })).toEqual({ a: 1 });
  });

  it("requires exactly one filter input", () => {
    expect(() =>
      loadListFilter({ filter: "{}", filterFile: filterPath }),
    ).toThrow("--filter and --filter-file cannot be used together");
  });

  it("rejects non-object JSON", () => {
    expect(() => loadListFilter({ filter: "[]" })).toThrow(
      "--filter must be a JSON object",
    );
  });
});
