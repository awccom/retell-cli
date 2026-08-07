import { createReadStream, existsSync, statSync } from "fs";

const MAX_UPLOAD_FILES = 25;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Validate knowledge-base file inputs and create SDK-compatible streams. */
export function loadUploadFiles(
  paths: string[] | undefined,
  flagName = "--file",
): ReturnType<typeof createReadStream>[] | undefined {
  if (!paths || paths.length === 0) return undefined;
  if (paths.length > MAX_UPLOAD_FILES) {
    throwValidation(`${flagName} accepts at most ${MAX_UPLOAD_FILES} files`);
  }

  return paths.map((path) => {
    if (!existsSync(path)) {
      throwValidation(`${flagName}: file not found: ${path}`);
    }

    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(path);
    } catch (error) {
      throwValidation(
        `${flagName}: failed to inspect ${path}: ${(error as Error).message}`,
      );
    }

    if (!stat.isFile()) {
      throwValidation(`${flagName}: not a regular file: ${path}`);
    }
    if (stat.size > MAX_UPLOAD_BYTES) {
      throwValidation(`${flagName}: file exceeds 50 MB limit: ${path}`);
    }

    return createReadStream(path);
  });
}

function throwValidation(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
