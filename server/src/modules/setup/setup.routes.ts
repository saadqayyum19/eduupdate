import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { getSetupStatus, postSetupInitialize } from './setup.controller';
import { setupSchema } from './setup.schema';

/**
 * Setup routes are intentionally public: they only exist until the first account is
 * created, after which `/initialize` answers 403 and the client routes to /login.
 */
export const setupRouter = Router();

setupRouter.get('/status', getSetupStatus);
setupRouter.post('/initialize', validate({ body: setupSchema }), postSetupInitialize);
