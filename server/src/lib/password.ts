import bcrypt from 'bcryptjs';
import { z } from 'zod';

/** Bcrypt cost used everywhere a password is hashed. */
export const BCRYPT_COST = 12;

/**
 * Password policy: at least 10 characters with one upper case, one lower case and one digit.
 * The same policy runs on the client for instant feedback and here as the enforcement point.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an upper case letter')
  .regex(/[a-z]/, 'Password must include a lower case letter')
  .regex(/[0-9]/, 'Password must include a number');

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Cryptographically strong temporary password that satisfies the policy. */
export function generatePassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(4, length - required.length) }, () => pick(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}
