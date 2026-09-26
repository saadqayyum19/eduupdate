import type { Types } from 'mongoose';

/**
 * Converts Mongo documents into the exact JSON shapes the web app expects:
 * `_id` becomes `id`, ObjectIds and Dates become strings, Maps become objects and
 * credentials never leave the server.
 */
const HIDDEN_KEYS = new Set([
  '__v',
  '_id',
  'passwordHash',
  'resetTokenHash',
  'resetTokenExpiresAt',
  'failedLoginAttempts',
  'lockedUntil',
]);

export function serialise(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(serialise);

  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), serialise(item)]));
  }

  if (typeof value === 'object' && 'toHexString' in (value as object)) {
    return String(value as Types.ObjectId);
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(source)) {
      if (HIDDEN_KEYS.has(key)) continue;
      output[key] = serialise(item);
    }

    if (source._id !== undefined) {
      return { id: String(source._id as Types.ObjectId), ...output };
    }
    return output;
  }

  return value;
}

/** One document → API shape. */
export function serialiseOne<T>(doc: unknown): T {
  return serialise(doc) as T;
}

/** One document that must exist, otherwise a 404 is raised by the caller. */
export function serialiseList<T>(docs: unknown[]): T[] {
  return serialise(docs) as T[];
}
