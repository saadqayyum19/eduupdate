import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { RefreshToken } from '../models/AuditLog';
import { ok, fail } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import { protect } from '../middleware/auth';
import { env } from '../config/env';
import { signAccessToken, generateRefreshToken, hashToken } from '../services/tokens';
import { capabilitiesFor, type Role } from '../rbac';
import { logAudit } from '../services/audit';

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const authRouter = Router();

type PublicUserInput = {
  _id: unknown;
  name: string;
  email: string;
  role: Role;
  status: string;
  institutionId?: unknown;
  avatarColor: string;
  designation?: string;
  classId?: unknown;
  rollNo?: string;
  childIds?: unknown[];
  parentIds?: unknown[];
};

function publicUser(user: PublicUserInput) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    institutionId: user.institutionId ? String(user.institutionId) : null,
    avatarColor: user.avatarColor,
    designation: user.designation ?? '',
    classId: user.classId ? String(user.classId) : null,
    rollNo: user.rollNo ?? '',
    childIds: (user.childIds ?? []).map(String),
    parentIds: (user.parentIds ?? []).map(String),
    capabilities: capabilitiesFor(user.role),
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

/** POST /api/v1/auth/login */
authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>['body'];
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      fail(res, 401, 'No account exists for that email address', 'BAD_CREDENTIALS');
      return;
    }
    if (user.status !== 'active') {
      fail(res, 403, 'That account has been deactivated', 'INACTIVE');
      return;
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      fail(res, 401, 'That password is not correct', 'BAD_CREDENTIALS');
      return;
    }

    const accessToken = signAccessToken({
      sub: String(user._id),
      role: user.role,
      inst: user.institutionId ? String(user.institutionId) : null,
    });
    const refresh = generateRefreshToken();
    await RefreshToken.create({
      userId: user._id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent: req.headers['user-agent'] ?? '',
    });

    user.lastLoginAt = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refresh.token);
    await logAudit({
      institutionId: user.institutionId ? String(user.institutionId) : null,
      actorId: String(user._id),
      actorRole: user.role,
      action: 'auth.login',
      entity: 'User',
      entityId: String(user._id),
      ip: req.ip ?? '',
    });

    ok(res, { user: publicUser(user as unknown as PublicUserInput), accessToken }, 'Signed in');
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/auth/refresh — rotate the refresh token, issue a new access token. */
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    if (!token) {
      fail(res, 401, 'No refresh token', 'UNAUTHORIZED');
      return;
    }
    const stored = await RefreshToken.findOne({ tokenHash: hashToken(token), revokedAt: null });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      fail(res, 401, 'Refresh token expired or revoked', 'UNAUTHORIZED');
      return;
    }
    const user = await User.findById(stored.userId);
    if (!user || user.status !== 'active') {
      fail(res, 401, 'Account unavailable', 'UNAUTHORIZED');
      return;
    }

    // Rotation: revoke the used token and issue a fresh one.
    stored.revokedAt = new Date();
    await stored.save();
    const refresh = generateRefreshToken();
    await RefreshToken.create({
      userId: user._id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent: req.headers['user-agent'] ?? '',
    });

    const accessToken = signAccessToken({
      sub: String(user._id),
      role: user.role,
      inst: user.institutionId ? String(user.institutionId) : null,
    });
    setAuthCookies(res, accessToken, refresh.token);
    ok(res, { user: publicUser(user as unknown as PublicUserInput), accessToken }, 'Refreshed');
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/auth/logout */
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    if (token) {
      await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { revokedAt: new Date() });
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    ok(res, null, 'Signed out');
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/auth/me — the current session's user + capabilities. */
authRouter.get('/me', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.auth?.sub);
    if (!user) throw ApiError.notFound('User not found');
    ok(res, { user: publicUser(user as unknown as PublicUserInput) });
  } catch (error) {
    next(error);
  }
});

