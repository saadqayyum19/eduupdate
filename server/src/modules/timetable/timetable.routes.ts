import { Router } from 'express';
import { ApiError } from '../../lib/ApiError';
import { asyncHandler } from '../../lib/asyncHandler';
import { combineFilters, paginate, skipOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { TimetableSlot } from '../../models/TimetableSlot';
import { clearSlotSchema, slotSchema, timetableQuerySchema } from './timetable.schema';

const listTimetable = asyncHandler(async (req, res) => {
  const query = req.query as never as { page: number; pageSize: number; classId?: string; teacherId?: string };
  const filters = combineFilters(
    query.classId ? { classId: query.classId } : undefined,
    query.teacherId ? { teacherId: query.teacherId } : undefined,
  );

  const [items, total] = await Promise.all([
    TimetableSlot.find(filters)
      .sort({ day: 1, period: 1 })
      .skip(skipOf(query as never))
      .limit(query.pageSize)
      .lean(),
    TimetableSlot.countDocuments(filters),
  ]);

  res.json(paginate(serialiseList(items), total, query as never));
});

/** PUT /timetable — upsert one class × day × period cell. */
const upsertSlot = asyncHandler(async (req, res) => {
  const input = req.body as { classId: string; day: string; period: number };
  const slot = await TimetableSlot.findOneAndUpdate(
    { classId: input.classId, day: input.day, period: input.period },
    { $set: req.body },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  res.json({ slot: serialiseOne(slot) });
});

/** DELETE /timetable — clear one cell. */
const clearSlot = asyncHandler(async (req, res) => {
  const { classId, day, period } = req.body as { classId: string; day: string; period: number };

  const removed = await TimetableSlot.deleteOne({ classId, day, period });
  if (!removed.deletedCount) throw ApiError.notFound('There is no lesson in that slot.');

  res.status(204).send();
});

export const timetableRouter = Router();

timetableRouter.use(authenticate);
timetableRouter.get('/', requireCapability('timetable.view'), validate({ query: timetableQuerySchema }), listTimetable);
timetableRouter.put('/', requireCapability('timetable.manage'), validate({ body: slotSchema }), upsertSlot);
timetableRouter.delete('/', requireCapability('timetable.manage'), validate({ body: clearSlotSchema }), clearSlot);
