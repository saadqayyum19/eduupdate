import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError';
import { asyncHandler } from '../../lib/asyncHandler';
import { combineFilters, paginate, searchOr, skipOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { purgeSubjectReferences, reconcileClass } from '../../lib/graph';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ClassRoom } from '../../models/ClassRoom';
import { Subject } from '../../models/Subject';
import { subjectQuerySchema, subjectSchema, subjectUpdateSchema, toggleClassSchema } from './subjects.schema';

const idParam = z.object({ id: z.string().min(8) });

const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const listSubjects = asyncHandler(async (req, res) => {
  const query = req.query as never as { page: number; pageSize: number; search?: string; classId?: string };
  const search = searchOr(['name', 'code'], query.search);
  const filters = combineFilters(
    query.classId ? { classIds: query.classId } : undefined,
    search ? { $or: search } : undefined,
  );

  const [items, total] = await Promise.all([
    Subject.find(filters).sort({ name: 1 }).skip(skipOf(query as never)).limit(query.pageSize).lean(),
    Subject.countDocuments(filters),
  ]);

  res.json(paginate(serialiseList(items), total, query as never));
});

const getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id).lean();
  if (!subject) throw ApiError.notFound('That subject could not be found.');
  res.json({ subject: serialiseOne(subject) });
});

const createSubject = asyncHandler(async (req, res) => {
  const existing = await Subject.findOne({ code: req.body.code }).lean();
  if (existing) throw ApiError.conflict('A subject with that code already exists.');

  const count = await Subject.estimatedDocumentCount();
  const subject = await Subject.create({
    ...req.body,
    color: req.body.color ?? PALETTE[count % PALETTE.length],
  });

  for (const classId of subject.classIds) await reconcileClass(classId);

  res.status(201).json({ subject: serialiseOne(await Subject.findById(subject._id).lean()) });
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('That subject could not be found.');

  if (req.body.code && req.body.code !== subject.code) {
    const clash = await Subject.findOne({ code: req.body.code, _id: { $ne: subject._id } }).lean();
    if (clash) throw ApiError.conflict('A subject with that code already exists.');
  }

  const previousClasses = [...subject.classIds];
  Object.assign(subject, req.body);
  await subject.save();

  for (const classId of [...new Set([...previousClasses, ...subject.classIds])]) await reconcileClass(classId);

  res.json({ subject: serialiseOne(await Subject.findById(subject._id).lean()) });
});

const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id).lean();
  if (!subject) throw ApiError.notFound('That subject could not be found.');

  await Subject.deleteOne({ _id: req.params.id });
  await purgeSubjectReferences(req.params.id);

  res.status(204).send();
});

/** Add or remove a subject from a class (used by the Subjects page chips). */
const toggleSubjectClass = asyncHandler(async (req, res) => {
  const { classId } = req.body as z.infer<typeof toggleClassSchema>;

  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('That subject could not be found.');

  const classRoom = await ClassRoom.findById(classId);
  if (!classRoom) throw ApiError.notFound('That class could not be found.');

  classRoom.subjectIds = classRoom.subjectIds.includes(String(subject._id))
    ? classRoom.subjectIds.filter((id) => id !== String(subject._id))
    : [...classRoom.subjectIds, String(subject._id)];

  await classRoom.save();
  await reconcileClass(classId);

  res.json({ subject: serialiseOne(await Subject.findById(subject._id).lean()) });
});

export const subjectsRouter = Router();

subjectsRouter.use(authenticate);
subjectsRouter.get('/', requireCapability('subjects.view'), validate({ query: subjectQuerySchema }), listSubjects);
subjectsRouter.post('/', requireCapability('subjects.manage'), validate({ body: subjectSchema }), createSubject);
subjectsRouter.get('/:id', requireCapability('subjects.view'), validate({ params: idParam }), getSubject);
subjectsRouter.patch(
  '/:id',
  requireCapability('subjects.manage'),
  validate({ params: idParam, body: subjectUpdateSchema }),
  updateSubject,
);
subjectsRouter.delete('/:id', requireCapability('subjects.manage'), validate({ params: idParam }), deleteSubject);
subjectsRouter.post(
  '/:id/classes',
  requireCapability('subjects.manage'),
  validate({ params: idParam, body: toggleClassSchema }),
  toggleSubjectClass,
);
