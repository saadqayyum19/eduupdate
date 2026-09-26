import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Model } from 'mongoose';
import { ok, created, paginate } from './response';
import { ApiError } from './ApiError';
import { requireCapability } from '../middleware/auth';
import type { Capability } from '../rbac';

interface CrudOptions {
  /** Fields a client may create. */
  createable: string[];
  /** Fields a client may update. */
  updatable: string[];
  /** Default sort, e.g. { createdAt: -1 }. */
  sort?: Record<string, 1 | -1>;
  /** Institution scoping: set institutionId from the JWT on every query/write. */
  institutionScoped?: boolean;
  /** Capability required to create, update or delete records. */
  manageCapability: Capability;
  /** Optional server-side transformation/validation for client input. */
  prepareCreate?: (body: Record<string, unknown>, req: Request) => Promise<Record<string, unknown>> | Record<string, unknown>;
  prepareUpdate?: (body: Record<string, unknown>, req: Request) => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Extra search fields (text regex). */
  searchFields?: string[];
}

function institutionIdOf(req: Request): string | null {
  return req.auth?.inst ?? null;
}

/**
 * Express router factory wired to a Mongoose model with list/detail/create/
 * update/delete, pagination, search and institution scoping. Handlers stay
 * small by sharing this single implementation.
 */
export function crudRouter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  options: CrudOptions,
): Router {
  const router = Router();
  const {
    createable,
    updatable,
    sort = { createdAt: -1 as const },
    institutionScoped = false,
    searchFields = [],
    manageCapability,
    prepareCreate,
    prepareUpdate,
  } = options;

  const scopedIdFilter = (req: Request, id: string): Record<string, unknown> => {
    const filter: Record<string, unknown> = { _id: id };
    if (institutionScoped) {
      const requestedInstitution = req.auth?.role === 'super_admin' ? req.query.institutionId : undefined;
      filter.institutionId = requestedInstitution ? String(requestedInstitution) : institutionIdOf(req);
    }
    return filter;
  };

  const buildFilter = (req: Request): Record<string, unknown> => {
    const filter: Record<string, unknown> = {};
    if (institutionScoped) {
      const inst = institutionIdOf(req);
      filter.institutionId = req.auth?.role === 'super_admin' && req.query.institutionId
        ? req.query.institutionId
        : inst;
    }
    const search = String(req.query.search ?? '').trim();
    if (search && searchFields.length) {
      filter.$or = searchFields.map((field) => ({
        [field]: { $regex: search, $options: 'i' },
      }));
    }
    // Simple equality filters for whitelisted query params (e.g. classId, role).
    ['classId', 'programId', 'subjectId', 'teacherId', 'studentId', 'role', 'status', 'date'].forEach((key) => {
      const value = req.query[key];
      if (typeof value === 'string' && value && value !== 'all') {
        filter[key] = key === 'role' || key === 'status' || key === 'date' ? value : value;
      }
    });
    return filter;
  };

  /** GET / — paginated list with optional search + filters. */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
      const filter = buildFilter(req);
      const [items, total] = await Promise.all([
        model.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
        model.countDocuments(filter),
      ]);
      ok(res, paginate(items, total, page, pageSize));
    } catch (error) {
      next(error);
    }
  });

  /** GET /:id */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await model.findOne(scopedIdFilter(req, req.params.id)).lean();
      if (!item) throw ApiError.notFound(`${model.modelName} not found`);
      ok(res, item);
    } catch (error) {
      next(error);
    }
  });

  /** POST / */
  router.post('/', requireCapability(manageCapability), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: Record<string, unknown> = {};
      createable.forEach((field) => {
        if (field in req.body) body[field] = req.body[field];
      });
      if (institutionScoped) {
        const requestedInstitution = req.auth?.role === 'super_admin' ? req.query.institutionId : undefined;
        body.institutionId = requestedInstitution ? String(requestedInstitution) : institutionIdOf(req);
      }
      const preparedBody = prepareCreate ? await prepareCreate(body, req) : body;
      const item = await model.create(preparedBody);
      created(res, item, `${model.modelName} created`);
    } catch (error) {
      next(error);
    }
  });

  /** PATCH /:id */
  router.patch('/:id', requireCapability(manageCapability), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: Record<string, unknown> = {};
      updatable.forEach((field) => {
        if (field in req.body) body[field] = req.body[field];
      });
      const preparedBody = prepareUpdate ? await prepareUpdate(body, req) : body;
      const item = await model.findOneAndUpdate(scopedIdFilter(req, req.params.id), preparedBody, {
        new: true,
        runValidators: true,
      });
      if (!item) throw ApiError.notFound(`${model.modelName} not found`);
      ok(res, item, `${model.modelName} updated`);
    } catch (error) {
      next(error);
    }
  });

  /** DELETE /:id */
  router.delete('/:id', requireCapability(manageCapability), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await model.findOneAndDelete(scopedIdFilter(req, req.params.id));
      if (!item) throw ApiError.notFound(`${model.modelName} not found`);
      ok(res, { id: req.params.id }, `${model.modelName} deleted`);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
