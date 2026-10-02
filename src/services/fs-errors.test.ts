import { describe, it, expect, vi, beforeEach } from "vitest";
import { outputFsError } from "./fs-errors";
import * as outputFormatter from "./output-formatter";

vi.mock("./output-formatter", async () => {
  const actual = await vi.importActual("./output-formatter");
  return { ...actual, outputError: vi.fn() };
});

const messages = {
  permissionDenied: "Permission denied writing to: out.json",
  noSpace: "No space left on device",
  fallback: "Error writing file",
  fallbackCode: "WRITE_ERROR",
};

function fsError(code: string, message = `${code} error`) {
  return Object.assign(new Error(message), { code });
}

describe("outputFsError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps EACCES to PERMISSION_DENIED", () => {
    outputFsError(fsError("EACCES"), messages);
    expect(outputFormatter.outputError).toHaveBeenCalledTimes(1);
    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      messages.permissionDenied,
      "PERMISSION_DENIED",
    );
  });

  it("maps ENOSPC to NO_SPACE", () => {
    outputFsError(fsError("ENOSPC"), messages);
    expect(outputFormatter.outputError).toHaveBeenCalledTimes(1);
    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      messages.noSpace,
      "NO_SPACE",
    );
  });

  it("uses the fallback message and code for other errors", () => {
    outputFsError(
      fsError("EISDIR", "illegal operation on a directory"),
      messages,
    );
    expect(outputFormatter.outputError).toHaveBeenCalledTimes(1);
    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      "Error writing file: illegal operation on a directory",
      "WRITE_ERROR",
    );
  });

  it("handles non-Error values", () => {
    outputFsError("boom", messages);
    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      "Error writing file: boom",
      "WRITE_ERROR",
    );
  });
});
