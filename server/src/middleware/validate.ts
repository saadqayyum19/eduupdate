import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { fail } from '../utils/response';

/**
 * Zod validation middleware — validates the merged body/params/query against
 * the schema and replaces the request payloads with the parsed (typed) values.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path.join('.') || 'request';
      fail(res, 400, `${path}: ${issue?.message ?? 'Invalid input'}`, 'VALIDATION');
      return;
    }
    const parsed = result.data as { body?: unknown; params?: unknown; query?: unknown };
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) Object.assign(req.params, parsed.params);
    if (parsed.query !== undefined) Object.assign(req.query, parsed.query);
    next();
  };
}
