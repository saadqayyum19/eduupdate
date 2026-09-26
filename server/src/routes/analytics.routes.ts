import { Router, type Request, type Response, type NextFunction } from 'express';
import { User } from '../models/User';
import { ClassRoom } from '../models/ClassRoom';
import { Attendance } from '../models/Attendance';
import { Mark } from '../models/Mark';
import { FeeInvoice } from '../models/Fee';
import { ok } from '../utils/response';
import { protect, requireAnyCapability, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';

export const analyticsRouter = Router();
analyticsRouter.use(protect, requireFeature('analytics'));

/**
 * GET /api/v1/analytics/overview — role-based dashboards:
 * - principal/admin: attendance %, marks %, fee collection, at-risk students
 * - teacher: own workload
 */
analyticsRouter.get('/overview', requireCapability('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const instFilter = auth.inst && auth.role !== 'super_admin' ? { institutionId: auth.inst } : {};

    const students = await User.find({ ...instFilter, role: 'student' }).lean();
    const studentIds = students.map((s) => s._id);

    // Attendance % (last 30 days).
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const attendanceRows = await Attendance.find({
      studentId: { $in: studentIds },
      date: { $gte: since },
    }).lean();
    const presentCount = attendanceRows.filter((r) => r.status !== 'absent').length;
    const attendancePercentage = attendanceRows.length
      ? Math.round((presentCount / attendanceRows.length) * 1000) / 10
      : 0;

    // Marks % (aggregate score/total).
    const markRows = await Mark.find({ studentId: { $in: studentIds } }).lean();
    const scoreSum = markRows.reduce((sum, m) => sum + m.score, 0);
    const totalSum = markRows.reduce((sum, m) => sum + m.total, 0);
    const marksPercentage = totalSum ? Math.round((scoreSum / totalSum) * 1000) / 10 : 0;

    // Fee collection.
    const feeFilter: Record<string, unknown> = auth.inst && auth.role !== 'super_admin'
      ? { institutionId: auth.inst }
      : {};
    const invoices = await FeeInvoice.find(feeFilter).lean();
    const billed = invoices.reduce((sum, i) => sum + i.amount, 0);
    const collected = invoices.reduce((sum, i) => sum + i.paidAmount, 0);

    // At-risk students: attendance < 75% or marks < 50%.
    const attendanceByStudent = new Map<string, { present: number; total: number }>();
    attendanceRows.forEach((row) => {
      const bucket = attendanceByStudent.get(String(row.studentId)) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (row.status !== 'absent') bucket.present += 1;
      attendanceByStudent.set(String(row.studentId), bucket);
    });
    const marksByStudent = new Map<string, { score: number; total: number }>();
    markRows.forEach((row) => {
      const bucket = marksByStudent.get(String(row.studentId)) ?? { score: 0, total: 0 };
      bucket.score += row.score;
      bucket.total += row.total;
      marksByStudent.set(String(row.studentId), bucket);
    });

    const atRisk = students
      .map((student) => {
        const id = String(student._id);
        const att = attendanceByStudent.get(id);
        const marks = marksByStudent.get(id);
        const attPct = att && att.total ? (att.present / att.total) * 100 : 100;
        const markPct = marks && marks.total ? (marks.score / marks.total) * 100 : 100;
        const reasons: string[] = [];
        if (attPct < 75) reasons.push(`Attendance ${Math.round(attPct)}%`);
        if (markPct < 50) reasons.push(`Marks ${Math.round(markPct)}%`);
        return { id, name: student.name, rollNo: student.rollNo, reasons };
      })
      .filter((row) => row.reasons.length > 0)
      .slice(0, 20);

    const classes = await ClassRoom.find(instFilter).lean();

    ok(res, {
      totals: {
        students: students.length,
        classes: classes.length,
        teachers: await User.countDocuments({
          ...instFilter,
          role: { $in: ['teacher', 'teacher_incharge'] },
        }),
      },
      attendancePercentage,
      marksPercentage,
      fee: { billed, collected, pending: billed - collected, ratio: billed ? Math.round((collected / billed) * 100) / 100 : 0 },
      atRisk,
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/analytics/workload — teacher workload dashboard. */
analyticsRouter.get(
  '/workload',
  requireAnyCapability(['analytics.view', 'classes.view']),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const instFilter = auth.inst && auth.role !== 'super_admin' ? { institutionId: auth.inst } : {};
    const classes = await ClassRoom.find(instFilter).lean();
    let scopedClasses = classes;
    let teacherIds: string[] | undefined;
    if (auth.role === 'teacher' || auth.role === 'teacher_incharge') {
      const current = await User.findById(auth.sub).select('classIds').lean();
      const classIds = (current?.classIds ?? []).map(String);
      scopedClasses = classes.filter((classRoom) => classIds.includes(String(classRoom._id)));
      teacherIds = auth.role === 'teacher'
        ? [auth.sub]
        : [...new Set([auth.sub, ...scopedClasses.flatMap((classRoom) => (classRoom.teacherIds ?? []).map(String))])];
    }
    const teachers = await User.find({
      ...instFilter,
      role: { $in: ['teacher', 'teacher_incharge'] },
      ...(teacherIds ? { _id: { $in: teacherIds } } : {}),
    }).lean();

    const rows = teachers.map((teacher) => {
      const assignedClasses = scopedClasses.filter((c) =>
        (c.teacherIds ?? []).map(String).includes(String(teacher._id)),
      );
      return {
        id: String(teacher._id),
        name: teacher.name,
        designation: teacher.designation,
        classes: assignedClasses.length,
        subjects: (teacher.subjectIds ?? []).length,
        inchargeOf: classes.filter((c) => String(c.inchargeId ?? '') === String(teacher._id)).length,
      };
    });
    rows.sort((a, b) => b.classes - a.classes);
    ok(res, { teachers: rows });
  } catch (error) {
    next(error);
  }
  },
);
