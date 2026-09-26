import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../lib/asyncHandler';
import { initialiseSetup, setupStatus } from './setup.service';

export const getSetupStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await setupStatus());
});

export const postSetupInitialize = asyncHandler(async (req: Request, res: Response) => {
  const result = await initialiseSetup(req.body, {
    ip: req.socket.remoteAddress ?? '',
    userAgent: req.headers['user-agent'] ?? '',
  });

  res.cookie(env.cookie.name, result.refreshToken, result.cookie);
  res.status(201).json({ user: result.user, accessToken: result.accessToken });
});
