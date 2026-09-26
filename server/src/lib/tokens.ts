import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../models/User';
import { ApiError } from './ApiError';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'],
    issuer: 'educore-lite',
    audience: 'educore-lite-web',
  };
  return jwt.sign(payload, env.jwt.accessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.jwt.accessSecret, {
      issuer: 'educore-lite',
      audience: 'educore-lite-web',
    }) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
}

/** Opaque random refresh token — the raw value only ever travels in the httpOnly cookie. */
export function createRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: sha256(token), expiresAt: refreshTokenExpiry() };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: 'strict' as const,
    domain: env.cookie.domain,
    path: '/',
    expires,
  };
}
