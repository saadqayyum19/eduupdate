import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/ApiError';
import { verifyAccessToken } from '../lib/tokens';
import { User, type Role } from '../models/User';

/** The authenticated principal attached to every protected request. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

/** Verifies the bearer access token and loads the account behind it. */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Sign in to continue.');
    }

    const payload = verifyAccessToken(token);
    const account = await User.findById(payload.sub).lean();

    if (!account) throw ApiError.unauthorized('This account no longer exists.');

    if (account.status !== 'active') {
      throw ApiError.forbidden('This account has been deactivated. Ask an administrator to reactivate it.');
    }

    req.user = {
      id: String(account._id),
      name: account.name,
      email: account.email,
      role: account.role,
      status: account.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/** Convenience accessor used inside services. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
