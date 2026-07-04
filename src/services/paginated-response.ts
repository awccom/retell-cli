export interface PaginatedResponse<T> {
  has_more?: boolean;
  items?: T[] | null;
  pagination_key?: string;
  total?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  has_more?: boolean;
  pagination_key?: string;
  total?: number;
}

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

export function getPaginatedItems<T>(
  response: T[] | PaginatedResponse<T> | null | undefined,
): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

export function withPaginationMetadata<T>(
  response: unknown,
  items: T[],
): T[] | PaginatedResult<T> {
  if (!response || Array.isArray(response) || typeof response !== "object") {
    return items;
  }

  const page = response as PaginatedResponse<unknown>;
  const output: PaginatedResult<T> = { items };
  let hasMetadata = false;

  if (page.has_more !== undefined) {
    output.has_more = page.has_more;
    hasMetadata = true;
  }
  if (page.pagination_key !== undefined) {
    output.pagination_key = page.pagination_key;
    hasMetadata = true;
  }
  if (page.total !== undefined) {
    output.total = page.total;
    hasMetadata = true;
  }

  return hasMetadata ? output : items;
}

export function getPaginatedResult<T>(
  response: T[] | PaginatedResponse<T> | null | undefined,
): PaginatedResult<T> {
  const items = getPaginatedItems(response);
  const output = withPaginationMetadata(response, items);
  return Array.isArray(output) ? { items: output } : output;
}
