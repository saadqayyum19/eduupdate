import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { combineFilters, paginate, skipOf } from '../../lib/pagination';
import { serialiseList } from '../../lib/serialise';
import { assertClassAccess, resolveScope, scopedFilter } from '../../lib/scope';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Attendance } from '../../models/Attendance';
import { attendanceQuerySchema, rosterSchema } from './attendance.schema';

interface AttendanceQuery {
  page: number;
  pageSize: number;
  classId?: string;
  studentId?: string;
  status?: string;
  from?: string;
  to?: string;
  date?: string;
}

const listAttendance = asyncHandler(async (req, res) => {
  const query = req.query as never as AttendanceQuery;
  const scope = await resolveScope(req.user!);

  const filters = combineFilters(
    scopedFilter(scope, 'studentId', query.studentId),
    scopedFilter(scope, 'classId', query.classId),
    query.status ? { status: query.status } : undefined,
    query.date ? { date: query.date } : undefined,
    query.from || query.to
      ? { date: { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) } }
      : undefined,
  );

  const [items, total] = await Promise.all([
    Attendance.find(filters)
      .sort({ date: -1 })
      .skip(skipOf(query as never))
      .limit(query.pageSize)
      .lean(),
    Attendance.countDocuments(filters),
  ]);

  res.json(paginate(serialiseList(items), total, query as never));
});

/**
 * PUT /attendance/roster — saves a whole day in one call.
 * Teachers may only write rosters for the classes they are assigned to.
 */
const saveRoster = asyncHandler(async (req, res) => {
  const input = req.body as {
    classId: string;
    date: string;
    entries: Array<{ studentId: string; status: string; note?: string }>;
  };

  await assertClassAccess(req.user!, input.classId);

  const operations = input.entries.map((entry) => ({
    updateOne: {
      filter: { studentId: entry.studentId, date: input.date },
      update: {
        $set: {
          classId: input.classId,
          studentId: entry.studentId,
          date: input.date,
          status: entry.status,
          note: entry.note ?? '',
          markedBy: req.user!.id,
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(operations, { ordered: false });

  const saved = await Attendance.find({
    classId: input.classId,
    date: input.date,
    studentId: { $in: input.entries.map((entry) => entry.studentId) },
  }).lean();

  res.json({ items: serialiseList(saved), total: saved.length });
});

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);
attendanceRouter.get('/', requireCapability('attendance.view'), validate({ query: attendanceQuerySchema }), listAttendance);
attendanceRouter.put(
  '/roster',
  requireCapability('attendance.take'),
  validate({ body: rosterSchema }),
  saveRoster,
);
