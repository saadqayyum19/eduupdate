import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../lib/ApiError';
import { can, type Capability } from '../lib/permissions';

/** Route guard: the signed-in role must hold the capability. */
export function requireCapability(capability: Capability): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized());
    if (!can(user.role, capability)) {
      return next(ApiError.forbidden(`Your role does not allow "${capability}".`));
    }
    return next();
  };
}

/** Route guard: any one of the capabilities is enough. */
export function requireAnyCapability(capabilities: Capability[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized());
    if (!capabilities.some((capability) => can(user.role, capability))) {
      return next(ApiError.forbidden(`Your role does not allow ${capabilities.join(' or ')}.`));
    }
    return next();
  };
}
