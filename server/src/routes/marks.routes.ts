import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Mark, EXAM_TYPES } from '../models/Mark';
import { Subject } from '../models/Subject';
import { ClassRoom } from '../models/ClassRoom';
import { User } from '../models/User';
import { Institution } from '../models/Institution';
import { ok, created, paginate } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import { protect, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';
import { cgpa, gradeFor, gradePoint, type SubjectResult } from '../services/grading';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const marksRouter = Router();
marksRouter.use(protect, requireCapability('marks.view'), requireFeature('marks'));

function tenantFilter(req: Request): Record<string, unknown> {
  if (req.auth!.role === 'super_admin') {
    return req.query.institutionId ? { institutionId: String(req.query.institutionId) } : {};
  }
  return { institutionId: req.auth!.inst };
}

async function applyMarkScope(req: Request, filter: Record<string, unknown>): Promise<void> {
  Object.assign(filter, tenantFilter(req));
  const role = req.auth!.role;
  if (role === 'student') {
    filter.studentId = req.auth!.sub;
    return;
  }
  if (role === 'parent') {
    const parent = await User.findById(req.auth!.sub).select('childIds').lean();
    const childIds = (parent?.childIds ?? []).map(String);
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
    if (requestedStudentId && !childIds.includes(requestedStudentId)) {
      throw ApiError.forbidden('Not your child');
    }
    filter.studentId = requestedStudentId || { $in: childIds };
    return;
  }
  if (role === 'teacher' || role === 'teacher_incharge') {
    const teacher = await User.findById(req.auth!.sub).select('classIds').lean();
    const classIds = (teacher?.classIds ?? []).map(String);
    const requestedClassId = typeof req.query.classId === 'string' ? req.query.classId : '';
    if (requestedClassId && !classIds.includes(requestedClassId)) {
      throw ApiError.forbidden('Not assigned to this class');
    }
    filter.classId = requestedClassId || { $in: classIds };
  }
}

const markSchema = z.object({
  body: z.object({
    classId: z.string().min(1),
    studentId: z.string().min(1),
    subjectId: z.string().min(1),
    examType: z.enum(EXAM_TYPES),
    title: z.string().default(''),
    score: z.number().min(0),
    total: z.number().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).refine((body) => body.score <= body.total, {
    path: ['score'],
    message: 'Score cannot exceed the maximum',
  }),
});

const bulkMarkSchema = z.object({
  body: z.object({
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    examType: z.enum(EXAM_TYPES),
    title: z.string().default(''),
    total: z.number().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(z.object({ studentId: z.string().min(1), score: z.number().min(0) })).min(1),
  }).superRefine((body, ctx) => {
    if (body.entries.some((entry) => entry.score > body.total)) {
      ctx.addIssue({ code: 'custom', path: ['entries'], message: 'A score cannot exceed the maximum' });
    }
    if (new Set(body.entries.map((entry) => entry.studentId)).size !== body.entries.length) {
      ctx.addIssue({ code: 'custom', path: ['entries'], message: 'Each student may appear only once' });
    }
  }),
});

async function requireClassAccess(req: Request, classId: string) {
  const classRoom = await ClassRoom.findOne({ _id: classId, ...tenantFilter(req) }).lean();
  if (!classRoom) throw ApiError.notFound('Class not found in this institution');
  if (
    (req.auth!.role === 'teacher' || req.auth!.role === 'teacher_incharge') &&
    !(classRoom.teacherIds ?? []).map(String).includes(req.auth!.sub)
  ) {
    throw ApiError.forbidden('Not assigned to this class');
  }
  return classRoom;
}

async function validateMarkRoster(classId: string, subjectId: string, studentIds: string[], institutionId: unknown) {
  const classRoom = await ClassRoom.findOne({ _id: classId, institutionId }).select('subjectIds').lean();
  if (!classRoom) throw ApiError.notFound('Class not found in this institution');
  if (!(classRoom.subjectIds ?? []).map(String).includes(subjectId)) {
    throw ApiError.badRequest('Subject is not assigned to this class');
  }
  const studentCount = await User.countDocuments({
    _id: { $in: studentIds },
    institutionId,
    role: 'student',
    classId,
  });
  if (studentCount !== studentIds.length) throw ApiError.badRequest('Every student must belong to this class');
}

/** GET /api/v1/marks — filters: classId, studentId, subjectId, examType. */
marksRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50)));
    const filter: Record<string, unknown> = {};
    ['classId', 'studentId', 'subjectId', 'examType'].forEach((key) => {
      const value = req.query[key];
      if (typeof value === 'string' && value && value !== 'all') filter[key] = value;
    });

    await applyMarkScope(req, filter);

    const [items, total] = await Promise.all([
      Mark.find(filter).sort({ date: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      Mark.countDocuments(filter),
    ]);
    ok(res, paginate(items, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/marks/result/pdf — download an institution-scoped result card. */
marksRouter.get('/result/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.auth!.role;
    let studentId = String(req.query.studentId ?? '');
    if (role === 'student') studentId = req.auth!.sub;
    if (role === 'parent') {
      const parent = await User.findById(req.auth!.sub).select('childIds').lean();
      const childIds = (parent?.childIds ?? []).map(String);
      if (studentId && !childIds.includes(studentId)) throw ApiError.forbidden('Not your child');
      studentId ||= childIds[0] ?? '';
    }
    if (!studentId) throw ApiError.badRequest('studentId is required');

    const tenant = tenantFilter(req);
    const [student, marks, subjects] = await Promise.all([
      User.findOne({ _id: studentId, ...tenant }).lean(),
      Mark.find({ studentId, ...tenant }).lean(),
      Subject.find(tenant).lean(),
    ]);
    if (!student) throw ApiError.notFound('Student not found in this institution');
    if (role === 'teacher' || role === 'teacher_incharge') {
      const teacher = await User.findById(req.auth!.sub).select('classIds').lean();
      if (!(teacher?.classIds ?? []).map(String).includes(String(student.classId ?? ''))) {
        throw ApiError.forbidden('Not assigned to this student\'s class');
      }
    }

    const subjectById = new Map(subjects.map((subject) => [String(subject._id), subject]));
    const totalsBySubject = new Map<string, {
      sessional: { score: number; total: number };
      midterm: { score: number; total: number };
      final: { score: number; total: number };
    }>();
    marks.forEach((mark) => {
      const subjectId = String(mark.subjectId);
      const totals = totalsBySubject.get(subjectId) ?? {
        sessional: { score: 0, total: 0 },
        midterm: { score: 0, total: 0 },
        final: { score: 0, total: 0 },
      };
      const type = mark.examType === 'midterm' ? 'midterm' : mark.examType === 'final' ? 'final' : 'sessional';
      totals[type].score += mark.score;
      totals[type].total += mark.total;
      totalsBySubject.set(subjectId, totals);
    });

    const rows = [...totalsBySubject].map(([subjectId, totals]) => {
      const obtained = totals.sessional.score + totals.midterm.score + totals.final.score;
      const total = totals.sessional.total + totals.midterm.total + totals.final.total;
      const percentage = total ? Math.round((obtained / total) * 1000) / 10 : 0;
      return {
        subjectId,
        name: subjectById.get(subjectId)?.name ?? 'Subject',
        creditHours: subjectById.get(subjectId)?.creditHours ?? 0,
        obtained,
        total,
        percentage,
        grade: gradeFor(percentage),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    const resultRows: SubjectResult[] = rows.map((row) => ({
      subjectId: row.subjectId,
      obtained: row.obtained,
      total: row.total,
      percentage: row.percentage,
      grade: row.grade,
      gradePoint: gradePoint(row.percentage),
      creditHours: row.creditHours,
    }));
    const obtained = rows.reduce((sum, row) => sum + row.obtained, 0);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const percentage = total ? Math.round((obtained / total) * 1000) / 10 : 0;
    const institution = req.auth!.inst ? await Institution.findById(req.auth!.inst).select('name').lean() : null;

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]);
    const ink = rgb(0.12, 0.18, 0.28);
    const blue = rgb(0.14, 0.39, 0.92);
    const printable = (value: string) => value.replace(/[^\x20-\x7E]/g, '?');
    const drawHeader = () => {
      page.drawText(printable(institution?.name ?? 'EduCore'), { x: 48, y: 785, size: 18, font: bold, color: blue });
      page.drawText('Student Result Card', { x: 48, y: 757, size: 14, font: bold, color: ink });
      page.drawText(printable(`Student: ${student.name}    Roll: ${student.rollNo ?? '-'}`), {
        x: 48, y: 730, size: 10, font: regular, color: ink,
      });
      page.drawText(printable(`Registration: ${student.registrationNo ?? '-'}    Academic year: 2025-2026`), {
        x: 48, y: 713, size: 10, font: regular, color: ink,
      });
      page.drawLine({ start: { x: 48, y: 696 }, end: { x: 547, y: 696 }, thickness: 1, color: blue });
    };
    const drawTableHead = (target: typeof page, y: number) => {
      target.drawText('Subject', { x: 48, y, size: 9, font: bold, color: ink });
      target.drawText('Marks', { x: 340, y, size: 9, font: bold, color: ink });
      target.drawText('%', { x: 400, y, size: 9, font: bold, color: ink });
      target.drawText('Grade', { x: 450, y, size: 9, font: bold, color: ink });
      target.drawText('Credits', { x: 500, y, size: 9, font: bold, color: ink });
    };
    drawHeader();
    let y = 670;
    drawTableHead(page, y);
    y -= 22;
    rows.forEach((row) => {
      if (y < 75) {
        page = pdf.addPage([595, 842]);
        y = 790;
        drawTableHead(page, y);
        y -= 22;
      }
      page.drawText(printable(row.name).slice(0, 48), { x: 48, y, size: 9, font: regular, color: ink });
      page.drawText(`${row.obtained}/${row.total}`, { x: 340, y, size: 9, font: regular, color: ink });
      page.drawText(`${row.percentage.toFixed(1)}%`, { x: 400, y, size: 9, font: regular, color: ink });
      page.drawText(row.grade, { x: 450, y, size: 9, font: regular, color: ink });
      page.drawText(String(row.creditHours), { x: 510, y, size: 9, font: regular, color: ink });
      y -= 17;
    });
    y -= 8;
    page.drawLine({ start: { x: 48, y: y + 10 }, end: { x: 547, y: y + 10 }, thickness: 0.6, color: blue });
    page.drawText(`Overall: ${obtained}/${total}  |  ${percentage.toFixed(1)}%  |  Grade ${gradeFor(percentage)}  |  GPA ${cgpa(resultRows).toFixed(2)}`, {
      x: 48, y, size: 10, font: bold, color: ink,
    });
    const bytes = await pdf.save();
    const fileRoll = String(student.rollNo ?? studentId).replace(/[^\w-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="result-${fileRoll}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/marks/result?studentId=&classId= — full result card payload:
 * per-subject totals (sessional + mid + final), grades, GPA/CGPA, class position.
 */
marksRouter.get('/result', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let studentId = String(req.query.studentId ?? '');
    const classId = String(req.query.classId ?? '');
    const role = req.auth!.role;

    if (role === 'student') studentId = req.auth!.sub;
    if (role === 'parent') {
      const parent = await User.findById(req.auth!.sub).lean();
      const allowed = (parent?.childIds ?? []).map(String);
      if (studentId && !allowed.includes(studentId)) throw ApiError.forbidden('Not your child');
      if (!studentId) studentId = allowed[0] ?? '';
    }
    if (!studentId) throw ApiError.badRequest('studentId is required');

    const tenant = tenantFilter(req);

    const [student, marks, subjects] = await Promise.all([
      User.findOne({ _id: studentId, ...tenant }).lean(),
      Mark.find({ studentId, ...tenant }).lean(),
      Subject.find(tenant).lean(),
    ]);
    if (!student) throw ApiError.notFound('Student not found');
    const studentClassId = String(student.classId ?? '');
    if (classId && classId !== studentClassId) throw ApiError.badRequest('Class does not match this student');
    if (role === 'teacher' || role === 'teacher_incharge') {
      const teacher = await User.findById(req.auth!.sub).select('classIds').lean();
      if (!(teacher?.classIds ?? []).map(String).includes(studentClassId)) {
        throw ApiError.forbidden('Not assigned to this student\'s class');
      }
    }
    const effectiveClassId = studentClassId || classId;
    const classRoom = effectiveClassId
      ? await ClassRoom.findOne({ _id: effectiveClassId, ...tenant }).lean()
      : null;

    // Combine exam components per subject (quiz/assignment roll into sessional).
    type Bucket = { sessional: number; midterm: number; final: number; sessionalTotal: number; midtermTotal: number; finalTotal: number };
    const bySubject = new Map<string, Bucket>();
    marks.forEach((mark) => {
      const subKey = String(mark.subjectId);
      const bucket = bySubject.get(subKey) ?? {
        sessional: 0, midterm: 0, final: 0, sessionalTotal: 0, midtermTotal: 0, finalTotal: 0,
      };
      if (mark.examType === 'midterm') {
        bucket.midterm += mark.score;
        bucket.midtermTotal += mark.total;
      } else if (mark.examType === 'final') {
        bucket.final += mark.score;
        bucket.finalTotal += mark.total;
      } else {
        bucket.sessional += mark.score;
        bucket.sessionalTotal += mark.total;
      }
      bySubject.set(subKey, bucket);
    });

    const rows: SubjectResult[] = [];
    bySubject.forEach((components, subjectId) => {
      const subject = subjects.find((s) => String(s._id) === subjectId);
      const obtained = components.sessional + components.midterm + components.final;
      const total = components.sessionalTotal + components.midtermTotal + components.finalTotal;
      const percent = total ? Math.round((obtained / total) * 1000) / 10 : 0;
      rows.push({
        subjectId,
        obtained,
        total,
        percentage: percent,
        grade: gradeFor(percent),
        gradePoint: gradePoint(percent),
        creditHours: subject?.creditHours ?? 0,
      });
    });

    const subjectNames = Object.fromEntries(
      subjects.map((s) => [String(s._id), { name: s.name, code: s.code }]),
    );
    rows.sort((a, b) =>
      (subjectNames[a.subjectId]?.name ?? '').localeCompare(subjectNames[b.subjectId]?.name ?? ''),
    );

    const totalObtained = rows.reduce((sum, r) => sum + r.obtained, 0);
    const totalMax = rows.reduce((sum, r) => sum + r.total, 0);
    const percentage = totalMax ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;

    // Class position by overall percentage.
    let position = 0;
    let classSize = 0;
    if (effectiveClassId && classRoom) {
      const classmates = await User.find({ ...tenant, classId: effectiveClassId, role: 'student' }).lean();
      classSize = classmates.length;
      const peerResults = await Promise.all(
        classmates.map(async (peer) => {
          const peerMarks = await Mark.find({ ...tenant, studentId: String(peer._id) }).lean();
          const obtained = peerMarks.reduce((sum, m) => sum + m.score, 0);
          const max = peerMarks.reduce((sum, m) => sum + m.total, 0);
          return { id: String(peer._id), percent: max ? obtained / max : 0 };
        }),
      );
      peerResults.sort((a, b) => b.percent - a.percent);
      position = peerResults.findIndex((p) => p.id === studentId) + 1;
    }

    ok(res, {
      student,
      classRoom,
      rows,
      subjectNames,
      totalObtained,
      totalMax,
      percentage,
      grade: gradeFor(percentage),
      gpa: cgpa(rows),
      position,
      classSize,
    });
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/marks — enter one mark (marks.enter capability). */
marksRouter.post(
  '/',
  requireCapability('marks.enter'),
  validate(markSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof markSchema>['body'];
      const classRoom = await requireClassAccess(req, body.classId);
      await validateMarkRoster(body.classId, body.subjectId, [body.studentId], classRoom.institutionId);
      const mark = await Mark.create({
        ...body,
        enteredBy: req.auth!.sub,
        institutionId: classRoom.institutionId,
      });
      created(res, mark, 'Mark saved');
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/v1/marks/bulk — save a whole class column for one subject/exam. */
marksRouter.post(
  '/bulk',
  requireCapability('marks.enter'),
  validate(bulkMarkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { classId, subjectId, examType, title, total, date, entries } =
        req.body as z.infer<typeof bulkMarkSchema>['body'];
      const classRoom = await requireClassAccess(req, classId);
      await validateMarkRoster(classId, subjectId, entries.map((entry) => entry.studentId), classRoom.institutionId);
      const enteredBy = req.auth!.sub;
      const institutionId = classRoom.institutionId;

      const ops = entries.map((entry) => ({
        updateOne: {
          filter: { classId, studentId: entry.studentId, subjectId, examType, title },
          update: { $set: { score: entry.score, total, date, enteredBy, institutionId } },
          upsert: true,
        },
      }));
      const result = await Mark.bulkWrite(ops as Parameters<typeof Mark.bulkWrite>[0]);
      created(res, { upserted: result.upsertedCount, modified: result.modifiedCount }, 'Marks saved');
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/v1/marks/:id */
marksRouter.delete(
  '/:id',
  requireCapability('marks.enter'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const mark = await Mark.findOne(filter).lean();
      if (!mark) throw ApiError.notFound('Mark not found');
      if (req.auth!.role === 'teacher' || req.auth!.role === 'teacher_incharge') {
        await requireClassAccess(req, String(mark.classId));
      }
      await Mark.deleteOne(filter);
      ok(res, { id: String(mark._id) }, 'Mark deleted');
    } catch (error) {
      next(error);
    }
  },
);


