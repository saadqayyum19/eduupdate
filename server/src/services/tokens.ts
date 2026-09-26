import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '../rbac';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  inst: string | null; // institution id
}

/** 15-minute access token. */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

/** Opaque refresh token — random 48 bytes; only its hash is stored server-side. */
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  const days = env.jwt.refreshExpires.endsWith('d')
    ? Number(env.jwt.refreshExpires.replace('d', ''))
    : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
