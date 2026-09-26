import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser } from '../../middleware/auth';
import * as service from './auth.service';

/** The refresh cookie is httpOnly, SameSite=strict and Secure in production. */
function context(req: Request) {
  return { ip: req.socket.remoteAddress ?? '', userAgent: req.headers['user-agent'] ?? '' };
}

export const postLogin = asyncHandler(async (req: Request, res: Response) => {
  const session = await service.login(req.body, context(req));
  res.cookie(env.cookie.name, session.refreshToken, session.cookie);
  res.json({ user: session.user, accessToken: session.accessToken });
});

export const postRefresh = asyncHandler(async (req: Request, res: Response) => {
  const session = await service.refresh(req.cookies?.[env.cookie.name], context(req));
  res.cookie(env.cookie.name, session.refreshToken, session.cookie);
  res.json({ user: session.user, accessToken: session.accessToken });
});

export const postLogout = asyncHandler(async (req: Request, res: Response) => {
  await service.logout(req.cookies?.[env.cookie.name]);
  res.clearCookie(env.cookie.name, { ...env.cookie, path: '/' });
  res.status(204).send();
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: await service.me(currentUser(req).id) });
});

export const postForgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.requestPasswordReset(req.body.email);
  res.json({ ok: true });
});

export const postResetPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.resetPassword(req.body.token, req.body.password);
  res.json({ ok: true });
});
