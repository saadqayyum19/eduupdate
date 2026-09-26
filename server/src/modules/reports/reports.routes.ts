import { Router, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { combineFilters, paginate } from '../../lib/pagination';
import { resolveScope, scopedFilter } from '../../lib/scope';
import { findSettings, gradeFor } from '../../lib/settings';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Attendance } from '../../models/Attendance';
import { ClassRoom } from '../../models/ClassRoom';
import { FeePayment } from '../../models/FeePayment';
import { Mark } from '../../models/Mark';
import { Subject } from '../../models/Subject';
import { User } from '../../models/User';

type ReportRow = Record<string, string | number>;

const reportQuerySchema = z.object({
  classId: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

function toCsv(rows: ReportRow[]): string {
  if (!rows.length) return 'no data';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '')}"`).join(',')),
  ].join('\n');
}

/** Every report can be downloaded as CSV or returned as JSON. */
function send(res: Response, rows: ReportRow[], format: string, name: string): void {
  if (format === 'csv') {
    res.type('text/csv').setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
    res.send(toCsv(rows));
    return;
  }
  res.json(paginate(rows, rows.length, { page: 1, pageSize: rows.length || 1, order: 'asc' as const }));
}

/** Academic report: per-class, per-subject averages across every recorded assessment. */
const academicReport = asyncHandler(async (req, res) => {
  const query = req.query as never as { classId?: string; format: string };
  const scope = await resolveScope(req.user!);
  const settings = await findSettings();

  const classes = await ClassRoom.find(
    combineFilters(scopedFilter(scope, 'classId', query.classId), query.classId ? { _id: query.classId } : {}),
  ).lean();
  const classIds = classes.map((classRoom) => String(classRoom._id));

  const [marks, subjects] = await Promise.all([
    Mark.find({ classId: { $in: classIds } }).lean(),
    Subject.find().lean(),
  ]);

  const rows = classIds.flatMap((classId) => {
    const classRoom = classes.find((item) => String(item._id) === classId);
    const subjectIds = [...new Set(marks.filter((mark) => mark.classId === classId).map((mark) => mark.subjectId))];

    return subjectIds.map((subjectId) => {
      const own = marks.filter((mark) => mark.classId === classId && mark.subjectId === subjectId);
      const obtained = own.reduce((sum, mark) => sum + mark.score, 0);
      const total = own.reduce((sum, mark) => sum + mark.total, 0);
      const percent = total ? Math.round((obtained / total) * 1000) / 10 : 0;
      return {
        class: `${classRoom?.name ?? '—'} ${classRoom?.section ?? ''}`.trim(),
        subject: subjects.find((subject) => String(subject._id) === subjectId)?.name ?? '—',
        assessments: own.length,
        obtained,
        total,
        percentage: percent,
        grade: percent ? gradeFor(percent, settings.gradeBands).grade : '—',
      };
    });
  });

  send(res, rows, query.format, 'academic-report');
});

/** Attendance report: per-student attendance rate for the selected window. */
const attendanceReport = asyncHandler(async (req, res) => {
  const query = req.query as never as { classId?: string; from?: string; to?: string; format: string };
  const scope = await resolveScope(req.user!);
  const settings = await findSettings();

  const classFilter = query.classId
    ? { _id: query.classId }
    : scope.classIds
      ? { _id: { $in: scope.classIds } }
      : {};

  const classes = await ClassRoom.find(classFilter).lean();
  const classIds = classes.map((classRoom) => String(classRoom._id));

  const dateFilter = {
    ...(query.from ? { $gte: query.from } : {}),
    ...(query.to ? { $lte: query.to } : {}),
  };

  const [records, students] = await Promise.all([
    Attendance.find({
      classId: { $in: classIds },
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    }).lean(),
    User.find({ role: 'student', classId: { $in: classIds } }).select('name rollNo classId').lean(),
  ]);

  const rows = students.map((student) => {
    const own = records.filter((record) => record.studentId === String(student._id));
    const present = own.filter((record) => record.status === 'present').length;
    const late = own.filter((record) => record.status === 'late').length;
    const absent = own.filter((record) => record.status === 'absent').length;
    const rate = own.length ? Math.round(((present + late) / own.length) * 1000) / 10 : 0;
    const classRoom = classes.find((item) => String(item._id) === student.classId);

    return {
      student: student.name,
      rollNo: student.rollNo ?? '',
      class: classRoom ? `${classRoom.name} ${classRoom.section}` : '—',
      markedDays: own.length,
      present,
      late,
      absent,
      attendancePercent: rate,
      belowMinimum: own.length > 0 && rate < settings.attendanceRules.minAttendancePercent ? 'yes' : 'no',
    };
  });

  send(res, rows, query.format, 'attendance-report');
});

/** Finance report: billed vs collected per class. */
const financeReport = asyncHandler(async (req, res) => {
  const query = req.query as never as { classId?: string; format: string };
  const scope = await resolveScope(req.user!);

  const classFilter = query.classId
    ? { _id: query.classId }
    : scope.classIds
      ? { _id: { $in: scope.classIds } }
      : {};

  const classes = await ClassRoom.find(classFilter).lean();
  const payments = await FeePayment.find({ classId: { $in: classes.map((item) => String(item._id)) } }).lean();

  const rows = classes.map((classRoom) => {
    const own = payments.filter((payment) => payment.classId === String(classRoom._id));
    const billed = own.reduce((sum, payment) => sum + payment.amount, 0);
    const collected = own.reduce((sum, payment) => sum + payment.paidAmount, 0);
    return {
      class: `${classRoom.name} ${classRoom.section}`,
      invoices: own.length,
      billed,
      collected,
      outstanding: billed - collected,
      collectionRate: billed ? Math.round((collected / billed) * 1000) / 10 : 0,
    };
  });

  send(res, rows, query.format, 'finance-report');
});

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(requireCapability('reports.view'));

reportsRouter.get('/academic', validate({ query: reportQuerySchema }), academicReport);
reportsRouter.get('/attendance', validate({ query: reportQuerySchema }), attendanceReport);
reportsRouter.get('/finance', validate({ query: reportQuerySchema }), financeReport);
