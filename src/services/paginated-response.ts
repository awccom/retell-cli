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
