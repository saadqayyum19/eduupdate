import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { buildDashboard } from './dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

/** One aggregate payload per role — every dashboard screen renders this. */
dashboardRouter.get(
  '/',
  requireCapability('dashboard.view'),
  asyncHandler(async (req, res) => {
    res.json(await buildDashboard(req.user!));
  }),
);
