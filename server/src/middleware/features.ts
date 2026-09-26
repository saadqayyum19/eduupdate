import type { NextFunction, Request, Response } from 'express';
import { fail } from '../utils/response';
import { Institution, type FeatureKey } from '../models/Institution';
import { can } from '../rbac';

/**
 * Per-institution feature gate. When a Super Admin toggles a feature off for
 * an institution, every route guarded by that feature returns 403 for that
 * institution's users (super_admins bypass the gate).
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = req.auth;
      if (!auth) {
        fail(res, 401, 'Authentication required', 'UNAUTHORIZED');
        return;
      }
      if (auth.role === 'super_admin' || !auth.inst) {
        next();
        return;
      }
      const institution = await Institution.findById(auth.inst).lean();
      if (!institution) {
        fail(res, 404, 'Institution not found', 'NOT_FOUND');
        return;
      }
      if (!institution.active) {
        fail(res, 403, 'Institution is inactive', 'INSTITUTION_INACTIVE');
        return;
      }
      const features = (institution.features ?? {}) as Record<string, boolean | undefined>;
      if (features[feature] === false) {
        fail(res, 403, `The "${feature}" module is disabled for this institution`, 'FEATURE_DISABLED');
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Load the caller's institution and expose it on the request for handlers. */
export async function attachInstitution(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.auth?.inst) {
      const institution = await Institution.findById(req.auth.inst).lean();
      if (institution) {
        (req as Request & { institution?: unknown }).institution = institution;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Convenience: does the caller's role pass a capability check? */
export function authCan(req: Request, capability: Parameters<typeof can>[1]): boolean {
  return can(req.auth?.role, capability);
}
