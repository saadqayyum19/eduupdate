import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiError } from '../lib/ApiError';

/**
 * Rate limiting.
 *
 * - `/api/auth` and `/api/setup`: 100 requests / minute per client address (brute force guard).
 * - Everything else: 1000 requests / minute per signed-in user (falling back to the address).
 *
 * `validate: false` keeps behaviour identical across express-rate-limit versions; the
 * counters live in memory, which is correct for the single API container created by
 * `docker compose`. Point REDIS_URL at a shared store when running several replicas.
 */

function keyOf(req: Request): string {
  return req.user?.id ?? req.socket.remoteAddress ?? 'unknown';
}

function tooMany(message: string) {
  return (_req: Request, _res: Response, next: NextFunction) => next(ApiError.tooManyRequests(message));
}

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: false,
  handler: tooMany('Too many authentication attempts. Please wait a minute and try again.'),
});

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: false,
  keyGenerator: keyOf,
  handler: tooMany('You have made too many requests. Please slow down.'),
});
