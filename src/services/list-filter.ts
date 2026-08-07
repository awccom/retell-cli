import { loadJsonArg, readJsonObjectFile } from "./json-arg";

export interface ListFilterOptions {
  filter?: string;
  filterFile?: string;
}

/**
 * Parse list endpoint filter criteria from inline JSON, @path, or --filter-file.
 */
export function loadListFilter(
  options: ListFilterOptions,
): Record<string, unknown> | undefined {
  if (options.filter !== undefined && options.filterFile !== undefined) {
    throwValidation("--filter and --filter-file cannot be used together");
  }

  if (options.filterFile !== undefined) {
    return readJsonObjectFile(options.filterFile, "--filter-file");
  }

  const parsed = loadJsonArg(options.filter, "--filter");
  if (parsed === undefined) return undefined;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throwValidation("--filter must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function throwValidation(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
