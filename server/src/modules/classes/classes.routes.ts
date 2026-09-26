import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError';
import { asyncHandler } from '../../lib/asyncHandler';
import { combineFilters, paginate, searchOr, skipOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { purgeClassReferences, reconcileClass } from '../../lib/graph';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ClassRoom } from '../../models/ClassRoom';
import { classQuerySchema, classSchema, classUpdateSchema } from './classes.schema';

const idParam = z.object({ id: z.string().min(8) });

/** Paginated, searchable class list. */
const listClasses = asyncHandler(async (req, res) => {
  const query = req.query as never as { page: number; pageSize: number; search?: string };
  const search = searchOr(['name', 'section', 'room'], query.search);
  const filters = combineFilters(search ? { $or: search } : undefined);

  const [items, total] = await Promise.all([
    ClassRoom.find(filters).sort({ name: 1, section: 1 }).skip(skipOf(query as never)).limit(query.pageSize).lean(),
    ClassRoom.countDocuments(filters),
  ]);

  res.json(paginate(serialiseList(items), total, query as never));
});

const getClass = asyncHandler(async (req, res) => {
  const classRoom = await ClassRoom.findById(req.params.id).lean();
  if (!classRoom) throw ApiError.notFound('That class could not be found.');
  res.json({ class: serialiseOne(classRoom) });
});

const createClass = asyncHandler(async (req, res) => {
  const classRoom = await ClassRoom.create(req.body);
  await reconcileClass(String(classRoom._id));
  const created = await ClassRoom.findById(classRoom._id).lean();
  res.status(201).json({ class: serialiseOne(created) });
});

const updateClass = asyncHandler(async (req, res) => {
  const classRoom = await ClassRoom.findById(req.params.id);
  if (!classRoom) throw ApiError.notFound('That class could not be found.');

  Object.assign(classRoom, req.body);
  await classRoom.save();

  // Membership edits ripple onto students, teachers, subjects and incharges.
  await reconcileClass(String(classRoom._id));

  res.json({ class: serialiseOne(await ClassRoom.findById(classRoom._id).lean()) });
});

const deleteClass = asyncHandler(async (req, res) => {
  const classRoom = await ClassRoom.findById(req.params.id).lean();
  if (!classRoom) throw ApiError.notFound('That class could not be found.');

  await ClassRoom.deleteOne({ _id: req.params.id });
  await purgeClassReferences(req.params.id);

  res.status(204).send();
});

export const classesRouter = Router();

classesRouter.use(authenticate);
classesRouter.get('/', requireCapability('classes.view'), validate({ query: classQuerySchema }), listClasses);
classesRouter.post('/', requireCapability('classes.manage'), validate({ body: classSchema }), createClass);
classesRouter.get('/:id', requireCapability('classes.view'), validate({ params: idParam }), getClass);
classesRouter.patch(
  '/:id',
  requireCapability('classes.manage'),
  validate({ params: idParam, body: classUpdateSchema }),
  updateClass,
);
classesRouter.delete('/:id', requireCapability('classes.manage'), validate({ params: idParam }), deleteClass);
