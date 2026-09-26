import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as controller from './users.controller';
import { profileSchema, userCreateSchema, userQuerySchema, userUpdateSchema } from './users.schema';
import { changePasswordSchema } from '../auth/auth.schema';
import { z } from 'zod';

const idParam = z.object({ id: z.string().min(8, 'Enter a valid account id') });

export const usersRouter = Router();

usersRouter.use(authenticate);

// Self-service (any signed-in role).
usersRouter.patch('/me', validate({ body: profileSchema }), controller.patchMyProfile);
usersRouter.post('/me/password', validate({ body: changePasswordSchema }), controller.postMyPassword);

// Account administration.
usersRouter.get('/', requireCapability('users.view'), validate({ query: userQuerySchema }), controller.getUsers);
usersRouter.post('/', requireCapability('users.manage'), validate({ body: userCreateSchema }), controller.postUser);
usersRouter.get('/:id', requireCapability('users.view'), validate({ params: idParam }), controller.getUser);
usersRouter.patch(
  '/:id',
  requireCapability('users.manage'),
  validate({ params: idParam, body: userUpdateSchema }),
  controller.patchUser,
);
usersRouter.delete('/:id', requireCapability('users.manage'), validate({ params: idParam }), controller.deleteUser);
