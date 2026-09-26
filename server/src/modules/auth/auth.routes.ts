import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import * as controller from './auth.controller';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from './auth.schema';

/** Authentication endpoints. Mounted behind the strict auth rate limiter. */
export const authRouter = Router();

authRouter.post('/login', validate({ body: loginSchema }), controller.postLogin);
authRouter.post('/refresh', controller.postRefresh);
authRouter.post('/logout', controller.postLogout);
authRouter.get('/me', authenticate, controller.getMe);
authRouter.post('/forgot-password', validate({ body: forgotPasswordSchema }), controller.postForgotPassword);
authRouter.post('/reset-password', validate({ body: resetPasswordSchema }), controller.postResetPassword);
