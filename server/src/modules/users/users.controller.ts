import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser } from '../../middleware/auth';
import * as service from './users.service';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listUsers(req.query as never));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: await service.getUser(req.params.id) });
});

export const postUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createUser(req.body, currentUser(req).id);
  res.status(201).json(result);
});

export const patchUser = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: await service.updateUser(req.params.id, req.body) });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteUser(req.params.id, currentUser(req).id);
  res.status(204).send();
});

export const patchMyProfile = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: await service.updateOwnProfile(currentUser(req).id, req.body) });
});

export const postMyPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.changeOwnPassword(currentUser(req).id, req.body.currentPassword, req.body.newPassword);
  res.json({ ok: true });
});
