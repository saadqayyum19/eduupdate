import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from '../config/env';
import { ApiError } from '../lib/ApiError';

/** Correlation id on every request + response, echoed in error payloads and logs. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.requestId = typeof incoming === 'string' && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

export const helmetMiddleware = helmet({
  // The API only serves JSON; the web client ships its own strict CSP.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Same-origin / server-to-server / curl requests have no Origin header.
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(ApiError.forbidden(`Origin ${origin} is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['x-request-id'],
  maxAge: 600,
});

export const compressionMiddleware = compression();

export const jsonBody: RequestHandler = express.json({ limit: env.bodyLimit });

export const cookieMiddleware: RequestHandler = cookieParser();

/** Strips Mongo operators and any HTML payload from strings before validation. */
function stripUnsafe(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/\0/g, '')
      .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<[^>]*on\w+\s*=/gi, '<');
  }
  if (Array.isArray(value)) return value.map(stripUnsafe);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      // Drop $ and dotted keys outright — those are NoSQL injection vectors.
      if (key.startsWith('$') || key.includes('.')) continue;
      output[key] = stripUnsafe(item);
    }
    return output;
  }
  return value;
}

export const sanitiseInput: RequestHandler = (req, _res, next) => {
  if (req.body) req.body = stripUnsafe(req.body);
  next();
};

export const mongoSanitizeMiddleware = mongoSanitize({ replaceWith: '_' });

/** Blocks duplicate query parameters (?role=a&role=b) that can confuse filter logic. */
export const hppMiddleware = hpp();
