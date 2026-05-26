/**
 * Unit tests for json-arg service
 */

import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadJsonArg,
  loadStringRecordArg,
  readJsonFile,
  readJsonObjectFile,
} from "./json-arg";

describe("loadJsonArg", () => {
  const tmpPath = join(
    tmpdir(),
    `retell-cli-json-arg-test-${process.pid}.json`,
  );

  afterEach(() => {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  });

  it("returns undefined when value is undefined", () => {
    expect(loadJsonArg(undefined, "--metadata")).toBeUndefined();
  });

  it("returns undefined when value is empty string", () => {
    expect(loadJsonArg("", "--metadata")).toBeUndefined();
  });

  it("parses inline JSON object", () => {
    expect(loadJsonArg('{"a":1,"b":"two"}', "--metadata")).toEqual({
      a: 1,
      b: "two",
    });
  });

  it("parses inline JSON array", () => {
    expect(loadJsonArg("[1,2,3]", "--tasks")).toEqual([1, 2, 3]);
  });

  it("reads JSON from @path", () => {
    writeFileSync(tmpPath, JSON.stringify({ hello: "world" }));
    expect(loadJsonArg("@" + tmpPath, "--metadata")).toEqual({
      hello: "world",
    });
  });

  it("throws ValidationError on invalid inline JSON", () => {
    try {
      loadJsonArg("{bad json}", "--metadata");
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/--metadata: invalid JSON/);
    }
  });

  it("throws ValidationError when @path does not exist", () => {
    try {
      loadJsonArg("@/nonexistent-path-xyz.json", "--metadata");
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/file not found/);
    }
  });

  it("throws ValidationError when @ has no path", () => {
    try {
      loadJsonArg("@", "--metadata");
      expect.fail("expected throw");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/--metadata: empty path after @/);
    }
  });
});

describe("readJsonFile", () => {
  const tmpPath = join(
    tmpdir(),
    `retell-cli-json-arg-file-test-${process.pid}.json`,
  );

  afterEach(() => {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  });

  it("reads and parses JSON file", () => {
    writeFileSync(tmpPath, JSON.stringify({ a: 1 }));
    expect(readJsonFile(tmpPath, "--file")).toEqual({ a: 1 });
  });

  it("throws ValidationError when file does not exist", () => {
    expect(() => readJsonFile("/nonexistent-xyz.json", "--file")).toThrow(
      /file not found/,
    );
  });

  it("throws ValidationError on malformed JSON", () => {
    writeFileSync(tmpPath, "{ not json");
    expect(() => readJsonFile(tmpPath, "--file")).toThrow(/invalid JSON/);
  });
});

describe("readJsonObjectFile", () => {
  const tmpPath = join(
    tmpdir(),
    `retell-cli-json-object-test-${process.pid}.json`,
  );

  afterEach(() => {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  });

  it("returns parsed object", () => {
    writeFileSync(tmpPath, JSON.stringify({ a: 1 }));
    expect(readJsonObjectFile(tmpPath, "--file")).toEqual({ a: 1 });
  });

  it("rejects a JSON array", () => {
    writeFileSync(tmpPath, JSON.stringify([1, 2, 3]));
    expect(() => readJsonObjectFile(tmpPath, "--file")).toThrow(
      /must contain a JSON object, not an array/,
    );
  });

  it("rejects a JSON null", () => {
    writeFileSync(tmpPath, "null");
    expect(() => readJsonObjectFile(tmpPath, "--file")).toThrow(
      /must contain a JSON object, not null/,
    );
  });

  it("rejects a JSON scalar (string)", () => {
    writeFileSync(tmpPath, JSON.stringify("oops"));
    expect(() => readJsonObjectFile(tmpPath, "--file")).toThrow(
      /must contain a JSON object, not a string/,
    );
  });

  it("rejects a JSON scalar (number)", () => {
    writeFileSync(tmpPath, "42");
    expect(() => readJsonObjectFile(tmpPath, "--file")).toThrow(
      /must contain a JSON object, not a number/,
    );
  });
});

describe("loadStringRecordArg", () => {
  it("returns undefined when the flag is absent", () => {
    expect(
      loadStringRecordArg(undefined, "--dynamic-variables"),
    ).toBeUndefined();
  });

  it("parses a JSON object with string values", () => {
    expect(
      loadStringRecordArg(
        '{"customer_name":"Avery","plan":"pro"}',
        "--dynamic-variables",
      ),
    ).toEqual({ customer_name: "Avery", plan: "pro" });
  });

  it("rejects non-object values", () => {
    expect(() =>
      loadStringRecordArg('["not","object"]', "--dynamic-variables"),
    ).toThrow("--dynamic-variables must be a JSON object");
  });

  it("rejects non-string object values", () => {
    expect(() =>
      loadStringRecordArg('{"attempt":2}', "--dynamic-variables"),
    ).toThrow("--dynamic-variables.attempt must be a string");
  });
});
