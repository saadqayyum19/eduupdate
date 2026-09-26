import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from '../lib/ApiError';

type Source = 'body' | 'query' | 'params';

/**
 * Zod validation for body / query / params on every endpoint.
 * The parsed (and coerced) values replace the raw ones so controllers always work
 * with trusted data, and failures become 422 responses with per-field messages.
 */
export function validate(schemas: Partial<Record<Source, ZodTypeAny>>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const issues: Record<string, string[]> = {};

    for (const [source, schema] of Object.entries(schemas) as Array<[Source, ZodTypeAny]>) {
      const result = schema.safeParse((req as unknown as Record<Source, unknown>)[source]);

      if (!result.success) {
        const error: ZodError = result.error;
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          const key = source === 'body' ? path || 'body' : `${source}.${path}`;
          issues[key] = [...(issues[key] ?? []), issue.message];
        }
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any)[source] = result.data;
    }

    if (Object.keys(issues).length) return next(ApiError.validation(issues));
    return next();
  };
}
