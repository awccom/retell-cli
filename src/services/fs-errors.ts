/**
 * File System Error Reporting
 *
 * Maps common Node fs error codes to the CLI's JSON error codes so every
 * command reports permission and disk-space failures the same way.
 */

import { outputError } from "./output-formatter";

export interface FsErrorMessages {
  /** Message for EACCES */
  permissionDenied: string;
  /** Message for ENOSPC */
  noSpace: string;
  /** Message for any other error; the error's own message is appended */
  fallback: string;
  /** Error code for any other error (e.g. FS_ERROR, WRITE_ERROR) */
  fallbackCode: string;
}

/**
 * Report a file system error as JSON on stderr and exit.
 *
 * - EACCES        -> PERMISSION_DENIED
 * - ENOSPC        -> NO_SPACE
 * - anything else -> messages.fallbackCode
 */
export function outputFsError(
  error: unknown,
  messages: FsErrorMessages,
): never {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  if (code === "EACCES") {
    return outputError(messages.permissionDenied, "PERMISSION_DENIED");
  }
  if (code === "ENOSPC") {
    return outputError(messages.noSpace, "NO_SPACE");
  }

  const detail = error instanceof Error ? error.message : String(error);
  return outputError(`${messages.fallback}: ${detail}`, messages.fallbackCode);
}
