import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { fail } from '../utils/response';
import { env } from '../config/env';
import { can, type Capability, type Role } from '../rbac';
import { verifyAccessToken, type AccessTokenPayload } from '../services/tokens';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AccessTokenPayload;
  }
}

/** Verify the JWT access token (Authorization: Bearer … or access_token cookie). */
export function protect(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;

  if (!token) {
    fail(res, 401, 'Authentication required', 'UNAUTHORIZED');
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    fail(res, 401, 'Session expired or token invalid', 'UNAUTHORIZED');
  }
}

/** Require one capability (RBAC). Attach after `protect`. */
export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      fail(res, 401, 'Authentication required', 'UNAUTHORIZED');
      return;
    }
    if (!can(req.auth.role, capability)) {
      fail(res, 403, `Missing permission: ${capability}`, 'FORBIDDEN');
      return;
    }
    next();
  };
}

/** Require any one of several capabilities. */
export function requireAnyCapability(capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      fail(res, 401, 'Authentication required', 'UNAUTHORIZED');
      return;
    }
    if (!capabilities.some((capability) => can(req.auth?.role, capability))) {
      fail(res, 403, `Missing permission: one of [${capabilities.join(', ')}]`, 'FORBIDDEN');
      return;
    }
    next();
  };
}

/** Require specific roles (rare — prefer capabilities). */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      fail(res, 403, 'Insufficient role', 'FORBIDDEN');
      return;
    }
    next();
  };
}

/** 404 for unknown API routes. */
export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND');
}

/** Central error handler — normalises every error into the API envelope. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires 4 params to recognise this as an error handler.
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    fail(res, err.status, err.message, err.code);
    return;
  }

  // Mongoose duplicate key
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
    fail(res, 409, 'Duplicate value — that record already exists', 'DUPLICATE');
    return;
  }

  // Mongoose validation error
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'ValidationError') {
    fail(res, 400, 'Validation failed', 'VALIDATION');
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  if (!env.isProd) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  fail(res, 500, env.isProd ? 'Internal server error' : message, 'INTERNAL');
}
