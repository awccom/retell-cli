import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
  rmdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadUploadFiles } from "./upload-files";

const filePath = join(tmpdir(), `retell-upload-${process.pid}.txt`);
const dirPath = join(tmpdir(), `retell-upload-dir-${process.pid}`);

afterEach(() => {
  if (existsSync(filePath)) unlinkSync(filePath);
  if (existsSync(dirPath)) rmdirSync(dirPath);
});

describe("loadUploadFiles", () => {
  it("creates streams for regular files", async () => {
    writeFileSync(filePath, "hello");
    const streams = loadUploadFiles([filePath]);
    expect(streams).toHaveLength(1);
    expect(streams?.[0].path).toBe(filePath);
    for await (const _chunk of streams![0]) {
      // Consume the stream the same way the SDK upload path does.
    }
  });

  it("rejects missing files and directories", () => {
    expect(() => loadUploadFiles([`${filePath}.missing`])).toThrow(
      /file not found/,
    );
    mkdirSync(dirPath);
    expect(() => loadUploadFiles([dirPath])).toThrow(/not a regular file/);
  });

  it("enforces Retell's 25-file request limit", () => {
    expect(() => loadUploadFiles(Array(26).fill(filePath))).toThrow(
      /at most 25 files/,
    );
  });
});
