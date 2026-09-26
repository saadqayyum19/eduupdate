import { randomBytes } from 'node:crypto';
import { ApiError } from '../../lib/ApiError';
import { passwordResetEmail, sendMail } from '../../lib/mailer';
import { hashPassword, verifyPassword } from '../../lib/password';
import { serialiseOne } from '../../lib/serialise';
import { cookieOptions, createRefreshToken, sha256, signAccessToken } from '../../lib/tokens';
import { RefreshToken } from '../../models/RefreshToken';
import { User, type Role } from '../../models/User';
import type { LoginInput } from './auth.schema';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MINUTES = 60;

export interface Session {
  user: unknown;
  accessToken: string;
  refreshToken: string;
  cookie: ReturnType<typeof cookieOptions>;
}

interface SessionContext {
  ip: string;
  userAgent: string;
}

async function issueSession(
  account: { _id: unknown; role: Role; email: string },
  context: SessionContext,
): Promise<Session> {
  const userId = String(account._id);

  const accessToken = signAccessToken({ sub: userId, role: account.role, email: account.email });
  const refresh = createRefreshToken();

  await RefreshToken.create({
    userId,
    tokenHash: refresh.hash,
    expiresAt: refresh.expiresAt,
    userAgent: context.userAgent,
    ip: context.ip,
  });

  const user = await User.findById(userId).lean();

  return {
    user: serialiseOne(user),
    accessToken,
    refreshToken: refresh.token,
    cookie: cookieOptions(refresh.expiresAt),
  };
}

/** Email + password sign-in with account lockout after five failed attempts. */
export async function login(input: LoginInput, context: SessionContext): Promise<Session> {
  const account = await User.findOne({ email: input.email }).select('+passwordHash');

  if (!account) throw ApiError.unauthorized('Email or password is incorrect.');

  if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60_000);
    throw ApiError.locked(`Too many failed attempts. This account is locked for ${minutes} more minute(s).`);
  }

  if (account.status !== 'active') {
    throw ApiError.forbidden('This account has been deactivated. Ask an administrator to reactivate it.');
  }

  const matches = await verifyPassword(input.password, account.passwordHash);

  if (!matches) {
    account.failedLoginAttempts += 1;

    if (account.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      account.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      account.failedLoginAttempts = 0;
      await account.save();
      throw ApiError.locked(`Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes.`);
    }

    await account.save();
    const left = MAX_FAILED_ATTEMPTS - account.failedLoginAttempts;
    throw ApiError.unauthorized(`Email or password is incorrect. ${left} attempt(s) left before the account locks.`);
  }

  account.failedLoginAttempts = 0;
  account.lockedUntil = null;
  account.lastLoginAt = new Date();
  await account.save();

  return issueSession(account, context);
}

/** Rotates the refresh token: the old one is revoked, a brand new pair is issued. */
export async function refresh(rawToken: string | undefined, context: SessionContext): Promise<Session> {
  if (!rawToken) throw ApiError.unauthorized('Your session has ended. Please sign in again.');

  const stored = await RefreshToken.findOne({ tokenHash: sha256(rawToken) });
  if (!stored) throw ApiError.unauthorized('Your session has ended. Please sign in again.');

  if (stored.revokedAt) {
    // A revoked token being replayed means it leaked — end every session for that account.
    await RefreshToken.updateMany({ userId: stored.userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw ApiError.unauthorized('This session was already ended. Please sign in again.');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    await RefreshToken.deleteOne({ _id: stored._id });
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const account = await User.findById(stored.userId);
  if (!account) throw ApiError.unauthorized('This account no longer exists.');
  if (account.status !== 'active') throw ApiError.forbidden('This account has been deactivated.');

  const session = await issueSession(account, context);

  stored.revokedAt = new Date();
  stored.replacedByHash = sha256(session.refreshToken);
  await stored.save();

  return session;
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await RefreshToken.updateOne({ tokenHash: sha256(rawToken) }, { $set: { revokedAt: new Date() } });
}

export async function me(userId: string): Promise<unknown> {
  const account = await User.findById(userId).lean();
  if (!account) throw ApiError.unauthorized('This account no longer exists.');
  return serialiseOne(account);
}

/** Always answers the same way so the endpoint cannot reveal which emails exist. */
export async function requestPasswordReset(email: string): Promise<void> {
  const account = await User.findOne({ email });

  if (!account || account.status !== 'active') return;

  const token = randomBytes(32).toString('base64url');
  account.resetTokenHash = sha256(token);
  account.resetTokenExpiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);
  await account.save();

  await sendMail({
    to: account.email,
    subject: 'Reset your EduCore Lite password',
    text: passwordResetEmail(account.name, token),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const account = await User.findOne({
    resetTokenHash: sha256(token),
    resetTokenExpiresAt: { $gt: new Date() },
  });

  if (!account) throw ApiError.badRequest('That reset link is invalid or has expired. Please request a new one.');

  account.passwordHash = await hashPassword(password);
  account.resetTokenHash = null;
  account.resetTokenExpiresAt = null;
  account.failedLoginAttempts = 0;
  account.lockedUntil = null;
  await account.save();

  // Changing the password ends every existing session.
  await RefreshToken.updateMany({ userId: String(account._id), revokedAt: null }, { $set: { revokedAt: new Date() } });
}
