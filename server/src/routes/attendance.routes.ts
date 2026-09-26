import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Attendance } from '../models/Attendance';
import { ClassRoom } from '../models/ClassRoom';
import { User } from '../models/User';
import { ok, created, paginate } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import { protect, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';

export const attendanceRouter = Router();
attendanceRouter.use(protect, requireCapability('attendance.view'), requireFeature('attendance'));

const rosterSchema = z.object({
  body: z.object({
    classId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
    subjectId: z.string().optional().nullable(),
    entries: z
      .array(
        z.object({
          studentId: z.string().min(1),
          status: z.enum(['present', 'absent', 'late']),
          note: z.string().optional(),
        }),
      )
      .min(1),
  }).superRefine((body, ctx) => {
    const studentIds = body.entries.map((entry) => entry.studentId);
    if (new Set(studentIds).size !== studentIds.length) {
      ctx.addIssue({ code: 'custom', path: ['entries'], message: 'Each student may appear only once' });
    }
  }),
});

async function applyAttendanceScope(req: Request, filter: Record<string, unknown>): Promise<void> {
  const auth = req.auth!;
  if (auth.role !== 'super_admin') filter.institutionId = auth.inst;
  else if (req.query.institutionId) filter.institutionId = String(req.query.institutionId);

  if (auth.role === 'student') {
    filter.studentId = auth.sub;
    return;
  }

  if (auth.role === 'parent') {
    const parent = await User.findById(auth.sub).select('childIds').lean();
    const childIds = (parent?.childIds ?? []).map(String);
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
    if (requestedStudentId && !childIds.includes(requestedStudentId)) {
      throw ApiError.forbidden('Not your child');
    }
    filter.studentId = requestedStudentId || { $in: childIds };
    return;
  }

  if (auth.role === 'teacher' || auth.role === 'teacher_incharge') {
    const teacher = await User.findById(auth.sub).select('classIds').lean();
    const classIds = (teacher?.classIds ?? []).map(String);
    const requestedClassId = typeof req.query.classId === 'string' ? req.query.classId : '';
    if (requestedClassId && !classIds.includes(requestedClassId)) {
      throw ApiError.forbidden('Not assigned to this class');
    }
    filter.classId = requestedClassId || { $in: classIds };
  }
}

/**
 * GET /api/v1/attendance — filters: classId (required), date?, month? (YYYY-MM),
 * subjectId?, studentId?. Returns a paginated list.
 */
attendanceRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50)));
    const filter: Record<string, unknown> = {};
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.month) filter.date = { $regex: `^${String(req.query.month)}` }; // YYYY-MM prefix
    await applyAttendanceScope(req, filter);

    const [items, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      Attendance.countDocuments(filter),
    ]);
    ok(res, paginate(items, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/attendance/summary?studentId=&month= — present/absent/late counts. */
attendanceRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedStudentId = String(req.query.studentId ?? '');
    if (!requestedStudentId && req.auth?.role !== 'student') throw ApiError.badRequest('studentId is required');
    const month = req.query.month ? String(req.query.month) : undefined; // YYYY-MM
    const filter: Record<string, unknown> = requestedStudentId ? { studentId: requestedStudentId } : {};
    if (month) filter.date = { $regex: `^${month}` };
    await applyAttendanceScope(req, filter);

    const rows = await Attendance.find(filter).lean();
    const summary = {
      total: rows.length,
      present: rows.filter((r) => r.status === 'present').length,
      absent: rows.filter((r) => r.status === 'absent').length,
      late: rows.filter((r) => r.status === 'late').length,
      percentage: rows.length
        ? Math.round((rows.filter((r) => r.status !== 'absent').length / rows.length) * 1000) / 10
        : 0,
    };
    ok(res, summary);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/attendance/roster — save a whole class's day in one call
 * (upsert per student). Requires attendance.take.
 */
attendanceRouter.post(
  '/roster',
  requireCapability('attendance.take'),
  validate(rosterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { classId, date, subjectId, entries } = req.body as z.infer<typeof rosterSchema>['body'];
      const markedBy = req.auth!.sub;
      const classRoom = req.auth!.role === 'super_admin'
        ? await ClassRoom.findById(classId).lean()
        : await ClassRoom.findOne({ _id: classId, institutionId: req.auth!.inst }).lean();
      if (!classRoom) throw ApiError.notFound('Class not found in this institution');
      if (
        (req.auth!.role === 'teacher' || req.auth!.role === 'teacher_incharge') &&
        !(classRoom.teacherIds ?? []).map(String).includes(req.auth!.sub)
      ) {
        throw ApiError.forbidden('Not assigned to this class');
      }
      if (subjectId && !(classRoom.subjectIds ?? []).map(String).includes(subjectId)) {
        throw ApiError.badRequest('Subject is not assigned to this class');
      }
      const studentCount = await User.countDocuments({
        _id: { $in: entries.map((entry) => entry.studentId) },
        institutionId: classRoom.institutionId,
        role: 'student',
        classId,
      });
      if (studentCount !== entries.length) throw ApiError.badRequest('Every student must belong to this class');
      const institutionId = classRoom.institutionId;

      const ops = entries.map((entry) => ({
        updateOne: {
          filter: {
            classId,
            date,
            studentId: entry.studentId,
            subjectId: subjectId ?? null,
          },
          update: {
            $set: {
              status: entry.status,
              note: entry.note ?? '',
              markedBy,
              institutionId,
            },
          },
          upsert: true,
        },
      }));
      const result = await Attendance.bulkWrite(ops as Parameters<typeof Attendance.bulkWrite>[0]);
      created(res, { upserted: result.upsertedCount, modified: result.modifiedCount }, 'Attendance saved');
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/v1/attendance/:id — remove one record (take capability). */
attendanceRouter.delete(
  '/:id',
  requireCapability('attendance.take'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.auth!.role !== 'super_admin') filter.institutionId = req.auth!.inst;
      else if (req.query.institutionId) filter.institutionId = String(req.query.institutionId);
      const record = await Attendance.findOneAndDelete(filter);
      if (!record) throw ApiError.notFound('Attendance record not found');
      ok(res, { id: req.params.id }, 'Attendance record deleted');
    } catch (error) {
      next(error);
    }
  },
);
