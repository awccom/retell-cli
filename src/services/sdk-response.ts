export type RecordLike = Record<string, unknown>;

export function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeListResponse(
  response: unknown,
  errorMessage: string,
  candidateKeys: string[] = ["items"],
): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isRecord(response)) {
    throw new Error(errorMessage);
  }

  for (const key of candidateKeys) {
    const value = response[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const key of candidateKeys) {
    const value = response[key];
    if (!isRecord(value)) continue;

    for (const nestedKey of candidateKeys) {
      const nestedValue = value[nestedKey];
      if (Array.isArray(nestedValue)) {
        return nestedValue;
      }
    }
  }

  throw new Error(errorMessage);
}
