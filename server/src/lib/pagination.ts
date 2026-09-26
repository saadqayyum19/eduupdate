import { z } from 'zod';

/** Pagination + sorting + search contract shared by every list endpoint. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  sort: z.string().trim().max(60).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().trim().max(160).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paginate<T>(items: T[], total: number, query: ListQuery): Paginated<T> {
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export function skipOf(query: ListQuery): number {
  return (query.page - 1) * query.pageSize;
}

/** Maps a client-sortable field to a Mongo sort, falling back to the default field. */
export function sortOf(
  query: ListQuery,
  allowed: Record<string, string>,
  fallback: string,
): Record<string, 1 | -1> {
  const field = query.sort && allowed[query.sort] ? allowed[query.sort] : fallback;
  return { [field]: query.order === 'desc' ? -1 : 1 };
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" across several fields. */
export function searchOr(fields: string[], search?: string): Record<string, unknown>[] | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  const pattern = new RegExp(escapeRegex(term), 'i');
  return fields.map((field) => ({ [field]: pattern }));
}

/** Merges filter fragments, dropping empty ones, and ANDs them with the scope filter. */
export function combineFilters(
  ...filters: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const active = filters.filter((filter): filter is Record<string, unknown> => Boolean(filter && Object.keys(filter).length));
  if (!active.length) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
}
