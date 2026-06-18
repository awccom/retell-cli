export interface PaginatedResponse<T> {
  has_more?: boolean;
  items?: T[] | null;
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
