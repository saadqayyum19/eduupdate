import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Institution, FEATURE_KEYS, type FeatureKey } from '../models/Institution';
import { User } from '../models/User';
import { AuditLog, RefreshToken } from '../models/AuditLog';
import { ok, created, paginate } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import { protect, requireCapability, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const institutionRouter = Router();

institutionRouter.use(protect);

const institutionCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    type: z.enum(['school', 'college', 'university']),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex colour required').optional(),
    academicYear: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    website: z.string().optional(),
  }),
});

const featuresSchema = z.object({
  body: z.object(
    Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, z.boolean().optional()]),
    ) as Record<FeatureKey, z.ZodOptional<z.ZodBoolean>>,
  ),
});

/** GET /api/v1/institutions — list (super admin) or the caller's own institution. */
institutionRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const search = String(req.query.search ?? '').trim();

    if (auth.role !== 'super_admin') {
      if (!auth.inst) {
        ok(res, paginate([], 0, 1, pageSize));
        return;
      }
      const own = await Institution.findById(auth.inst).lean();
      ok(res, paginate(own ? [own] : [], own ? 1 : 0, 1, pageSize));
      return;
    }

    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      Institution.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Institution.countDocuments(filter),
    ]);
    ok(res, paginate(items, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/institutions/features — the feature key catalogue for the panel. */
institutionRouter.get('/features', (_req: Request, res: Response) => {
  ok(res, { features: FEATURE_KEYS });
});

/** POST /api/v1/institutions — Super Admin creates an institution. */
institutionRouter.post(
  '/',
  requireRole('super_admin'),
  validate(institutionCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof institutionCreateSchema>['body'];
      const institution = await Institution.create(body);
      await logAudit({
        institutionId: String(institution._id),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        action: 'institution.create',
        entity: 'Institution',
        entityId: String(institution._id),
        detail: `Created ${body.type} "${body.name}"`,
        ip: req.ip ?? '',
      });
      created(res, institution, 'Institution created');
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/v1/institutions/:id */
institutionRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (auth.role !== 'super_admin' && auth.inst !== req.params.id) {
      throw ApiError.forbidden('Not your institution');
    }
    const institution = await Institution.findById(req.params.id).lean();
    if (!institution) throw ApiError.notFound('Institution not found');
    ok(res, institution);
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/v1/institutions/:id — edit branding/details (Super Admin). */
institutionRouter.patch(
  '/:id',
  requireRole('super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allowed = ['name', 'type', 'logoUrl', 'primaryColor', 'academicYear', 'address', 'phone', 'email', 'website', 'active'];
      const patch: Record<string, unknown> = {};
      allowed.forEach((key) => {
        if (key in req.body) patch[key] = req.body[key];
      });
      const institution = await Institution.findByIdAndUpdate(req.params.id, patch, {
        new: true,
        runValidators: true,
      });
      if (!institution) throw ApiError.notFound('Institution not found');
      await logAudit({
        institutionId: String(institution._id),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        action: 'institution.update',
        entity: 'Institution',
        entityId: String(institution._id),
        detail: `Updated: ${Object.keys(patch).join(', ')}`,
        ip: req.ip ?? '',
      });
      ok(res, institution, 'Institution updated');
    } catch (error) {
      next(error);
    }
  },
);

/** PUT /api/v1/institutions/:id/features — per-institution feature toggles. */
institutionRouter.put(
  '/:id/features',
  requireRole('super_admin'),
  validate(featuresSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patch = req.body as Partial<Record<FeatureKey, boolean>>;
      const set: Record<string, boolean> = {};
      FEATURE_KEYS.forEach((key) => {
        if (typeof patch[key] === 'boolean') set[`features.${key}`] = patch[key] as boolean;
      });
      if (Object.keys(set).length === 0) throw ApiError.badRequest('No feature flags supplied');

      const institution = await Institution.findByIdAndUpdate(
        req.params.id,
        { $set: set },
        { new: true },
      );
      if (!institution) throw ApiError.notFound('Institution not found');

      const toggled = Object.entries(set)
        .map(([key, value]) => `${key.replace('features.', '')}=${value ? 'on' : 'off'}`)
        .join(', ');
      await logAudit({
        institutionId: String(institution._id),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        action: 'feature.toggle',
        entity: 'Institution',
        entityId: String(institution._id),
        detail: toggled,
        ip: req.ip ?? '',
      });
      ok(res, institution, 'Feature flags updated');
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/v1/institutions/:id — Super Admin only. */
institutionRouter.delete(
  '/:id',
  requireRole('super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institution = await Institution.findByIdAndDelete(req.params.id);
      if (!institution) throw ApiError.notFound('Institution not found');
      await logAudit({
        institutionId: String(institution._id),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        action: 'institution.delete',
        entity: 'Institution',
        entityId: String(institution._id),
        detail: `Deleted "${institution.name}"`,
        ip: req.ip ?? '',
      });
      ok(res, { id: req.params.id }, 'Institution deleted');
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/v1/institutions/meta/global-stats — Super Admin dashboard counters. */
institutionRouter.get(
  '/meta/global-stats',
  requireRole('super_admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [institutions, users, activeSessions, schoolCount, collegeCount, universityCount, roleRows] = await Promise.all([
        Institution.countDocuments(),
        User.countDocuments(),
        RefreshToken.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
        Institution.countDocuments({ type: 'school' }),
        Institution.countDocuments({ type: 'college' }),
        Institution.countDocuments({ type: 'university' }),
        User.aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
      ]);
      const byRole = Object.fromEntries(
        (['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher', 'student', 'parent'] as const)
          .map((role) => [role, 0]),
      ) as Record<string, number>;
      roleRows.forEach((row) => {
        if (row._id in byRole) byRole[row._id] = row.count;
      });
      ok(res, {
        totalInstitutions: institutions,
        totalUsers: users,
        activeSessions,
        byType: {
          school: schoolCount,
          college: collegeCount,
          university: universityCount,
        },
        byRole,
      });
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/v1/institutions/meta/audit — audit log (Super Admin / admins). */
institutionRouter.get(
  '/meta/audit',
  requireCapability('audit.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
      const auth = req.auth!;
      const filter =
        auth.role === 'super_admin'
          ? {}
          : { institutionId: auth.inst };
      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);
      ok(res, paginate(items, total, page, pageSize));
    } catch (error) {
      next(error);
    }
  },
);

