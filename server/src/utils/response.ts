import type { Response } from 'express';

/**
 * Canonical API response envelope: { success, data, message, error }.
 * Every route replies through one of these helpers so clients can rely on
 * a single shape across the whole API.
 */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
  error: string | null;
}

export function ok<T>(res: Response, data: T, message = 'OK', status = 200): Response {
  const body: ApiEnvelope<T> = { success: true, data, message, error: null };
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}

export function fail(
  res: Response,
  status: number,
  message: string,
  error?: string | null,
): Response {
  const body: ApiEnvelope<null> = { success: false, data: null, message, error: error ?? null };
  return res.status(status).json(body);
}

/** Standard paginated payload. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
