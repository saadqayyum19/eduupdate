import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { crudRouter } from '../utils/crud';
import { protect, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';
import { validate } from '../middleware/validate';
import { User } from '../models/User';
import { Program } from '../models/Program';
import { ClassRoom } from '../models/ClassRoom';
import { Subject } from '../models/Subject';
import { TimetableSlot } from '../models/TimetableSlot';
import { TeacherAssignment } from '../models/TeacherAssignment';
import { Announcement } from '../models/Announcement';
import { Assignment, AssignmentSubmission } from '../models/Assignment';
import { ApiError } from '../utils/ApiError';
import { created, ok, paginate } from '../utils/response';
import { logAudit } from '../services/audit';

/**
 * Standard CRUD routers mounted under /api/v1 with capability guards.
 * Feature-gated routers return 403 when the institution toggles the module off.
 */
export const resourcesRouter = Router();

resourcesRouter.use(protect);

const studentCsvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const studentCsvRowSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    classId: z.string().regex(/^[\da-f]{24}$/i),
    rollNo: z.string().min(1),
    registrationNo: z.string().min(1),
    fatherName: z.string().min(2),
    cnic: z.string().optional().default(''),
    bform: z.string().optional().default(''),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    address: z.string().min(3),
    photoUrl: z.string().url().or(z.literal('')).optional().default(''),
  })
  .refine((row) => row.cnic || row.bform, {
    message: 'Provide either cnic or bform',
    path: ['cnic'],
  });

function requestInstitutionFilter(req: Request): Record<string, unknown> {
  if (req.auth!.role === 'super_admin') {
    return req.query.institutionId ? { institutionId: String(req.query.institutionId) } : {};
  }
  return { institutionId: req.auth!.inst };
}

/** POST /api/v1/users/import — multipart CSV; password is required per row. */
resourcesRouter.post(
  '/users/import',
  requireCapability('users.manage'),
  studentCsvUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.inst) throw ApiError.badRequest('An institution must be selected for student import');
      const file = req.file;
      if (!file) throw ApiError.badRequest('Upload a CSV file in the "file" field');
      if (!file.originalname.toLowerCase().endsWith('.csv')) throw ApiError.badRequest('Only CSV files are supported');

      let rawRows: unknown;
      try {
        rawRows = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
      } catch {
        throw ApiError.badRequest('The CSV file could not be parsed');
      }
      if (!Array.isArray(rawRows) || rawRows.length === 0) throw ApiError.badRequest('The CSV contains no student rows');
      if (rawRows.length > 200) throw ApiError.badRequest('Import at most 200 students per file');

      const parsedRows = z.array(studentCsvRowSchema).safeParse(rawRows);
      if (!parsedRows.success) {
        const issue = parsedRows.error.issues[0];
        const rowNumber = Number(issue.path[0] ?? 0) + 2;
        throw ApiError.badRequest(`CSV row ${rowNumber}: ${issue.message}`);
      }

      const rows = parsedRows.data.map((row) => ({ ...row, email: row.email.toLowerCase() }));
      const emails = rows.map((row) => row.email);
      if (new Set(emails).size !== emails.length) throw ApiError.badRequest('The CSV contains duplicate email addresses');
      const existing = await User.find({ email: { $in: emails } }).select('email').lean();
      if (existing.length) throw ApiError.badRequest(`Email already exists: ${existing[0].email}`);

      const classIds = [...new Set(rows.map((row) => row.classId))];
      const classes = await ClassRoom.find({
        _id: { $in: classIds },
        institutionId: req.auth.inst,
      }).select('_id').lean();
      if (classes.length !== classIds.length) throw ApiError.badRequest('Every classId must belong to this institution');

      const passwordHashes = await Promise.all(rows.map((row) => bcrypt.hash(row.password, 10)));
      const students = await User.insertMany(
        rows.map((row, index) => ({
          institutionId: req.auth!.inst,
          name: row.name,
          email: row.email,
          passwordHash: passwordHashes[index],
          role: 'student',
          status: 'active',
          classId: row.classId,
          rollNo: row.rollNo,
          registrationNo: row.registrationNo,
          fatherName: row.fatherName,
          cnic: row.cnic,
          bform: row.bform,
          dob: row.dob,
          address: row.address,
          photoUrl: row.photoUrl,
        })),
      );

      const byClass = new Map<string, string[]>();
      students.forEach((student) => {
        const classId = String(student.classId);
        byClass.set(classId, [...(byClass.get(classId) ?? []), String(student._id)]);
      });
      await Promise.all(
        [...byClass].map(([classId, studentIds]) =>
          ClassRoom.updateOne(
            { _id: classId, institutionId: req.auth!.inst },
            { $addToSet: { studentIds: { $each: studentIds } } },
          ),
        ),
      );

      await logAudit({
        institutionId: req.auth.inst,
        actorId: req.auth.sub,
        actorRole: req.auth.role,
        action: 'students.import',
        entity: 'User',
        detail: `Imported ${students.length} students`,
        ip: req.ip ?? '',
      });
      created(res, {
        count: students.length,
        users: students.map((student) => ({
          id: String(student._id),
          name: student.name,
          email: student.email,
          classId: String(student.classId),
          rollNo: student.rollNo,
          registrationNo: student.registrationNo,
        })),
      }, 'Students imported');
    } catch (error) {
      next(error);
    }
  },
);

resourcesRouter.get(
  '/assignment-submissions',
  requireCapability('assignments.view'),
  requireFeature('assignments'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
      const filter: Record<string, unknown> = requestInstitutionFilter(req);
      const role = req.auth!.role;
      if (role === 'student') {
        filter.studentId = req.auth!.sub;
      } else if (role === 'parent') {
        const parent = await User.findById(req.auth!.sub).select('childIds').lean();
        filter.studentId = { $in: (parent?.childIds ?? []).map(String) };
      } else if (role === 'teacher' || role === 'teacher_incharge') {
        const teacher = await User.findById(req.auth!.sub).select('classIds').lean();
        const assignments = await Assignment.find({
          ...requestInstitutionFilter(req),
          classId: { $in: (teacher?.classIds ?? []).map(String) },
        }).select('_id').lean();
        filter.assignmentId = { $in: assignments.map((assignment) => assignment._id) };
      }
      if (req.query.assignmentId && role !== 'teacher' && role !== 'teacher_incharge') {
        filter.assignmentId = String(req.query.assignmentId);
      }
      const [items, total] = await Promise.all([
        AssignmentSubmission.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        AssignmentSubmission.countDocuments(filter),
      ]);
      ok(res, paginate(items, total, page, pageSize));
    } catch (error) {
      next(error);
    }
  },
);

resourcesRouter.get(
  '/assignment-submissions/:id',
  requireCapability('assignments.view'),
  requireFeature('assignments'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = { _id: req.params.id, ...requestInstitutionFilter(req) };
      const submission = await AssignmentSubmission.findOne(filter).lean();
      if (!submission) throw ApiError.notFound('Submission not found');
      const role = req.auth!.role;
      if (role === 'student' && String(submission.studentId) !== req.auth!.sub) {
        throw ApiError.forbidden('Not your submission');
      }
      if (role === 'parent') {
        const parent = await User.findById(req.auth!.sub).select('childIds').lean();
        if (!(parent?.childIds ?? []).map(String).includes(String(submission.studentId))) {
          throw ApiError.forbidden('Not your child\'s submission');
        }
      }
      if (role === 'teacher' || role === 'teacher_incharge') {
        const [teacher, assignment] = await Promise.all([
          User.findById(req.auth!.sub).select('classIds').lean(),
          Assignment.findOne({ _id: submission.assignmentId, ...requestInstitutionFilter(req) }).select('classId').lean(),
        ]);
        if (!(teacher?.classIds ?? []).map(String).includes(String(assignment?.classId ?? ''))) {
          throw ApiError.forbidden('Not assigned to this class');
        }
      }
      ok(res, submission);
    } catch (error) {
      next(error);
    }
  },
);

const submissionSchema = z.object({
  body: z.object({
    assignmentId: z.string().regex(/^[\da-f]{24}$/i),
    content: z.string().max(20000).optional().default(''),
    fileUrl: z.string().url().or(z.literal('')).optional().default(''),
  }).refine((body) => body.content.trim() || body.fileUrl, {
    message: 'Add written work or attach a file',
  }),
});

resourcesRouter.post(
  '/assignment-submissions',
  requireCapability('assignments.submit'),
  requireFeature('assignments'),
  validate(submissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assignmentId, content, fileUrl } = req.body as z.infer<typeof submissionSchema>['body'];
      const student = await User.findOne({
        _id: req.auth!.sub,
        institutionId: req.auth!.inst,
        role: 'student',
      }).select('classId').lean();
      if (!student?.classId) throw ApiError.forbidden('A student account with an enrolled class is required');
      const assignment = await Assignment.findOne({
        _id: assignmentId,
        institutionId: req.auth!.inst,
        classId: student.classId,
        status: 'open',
      }).lean();
      if (!assignment) throw ApiError.notFound('Open assignment not found for your class');
      if (assignment.dueDate < new Date().toISOString().slice(0, 10)) {
        throw ApiError.badRequest('The assignment submission deadline has passed');
      }
      const submission = await AssignmentSubmission.create({
        institutionId: assignment.institutionId,
        assignmentId: assignment._id,
        studentId: req.auth!.sub,
        content,
        fileUrl,
      });
      created(res, submission, 'Assignment submitted');
    } catch (error) {
      next(error);
    }
  },
);

const gradeSubmissionSchema = z.object({
  body: z.object({ score: z.number().min(0), feedback: z.string().max(5000).optional().default('') }),
});

resourcesRouter.patch(
  '/assignment-submissions/:id/grade',
  requireCapability('assignments.manage'),
  requireFeature('assignments'),
  validate(gradeSubmissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = { _id: req.params.id, ...requestInstitutionFilter(req) };
      const submission = await AssignmentSubmission.findOne(filter).lean();
      if (!submission) throw ApiError.notFound('Submission not found');
      const assignment = await Assignment.findOne({
        _id: submission.assignmentId,
        ...requestInstitutionFilter(req),
      }).lean();
      if (!assignment) throw ApiError.notFound('Assignment not found');
      if (req.body.score > assignment.totalMarks) throw ApiError.badRequest('Score cannot exceed assignment total marks');
      if (req.auth!.role === 'teacher' || req.auth!.role === 'teacher_incharge') {
        const teacher = await User.findById(req.auth!.sub).select('classIds').lean();
        if (!(teacher?.classIds ?? []).map(String).includes(String(assignment.classId))) {
          throw ApiError.forbidden('Not assigned to this class');
        }
      }
      const updated = await AssignmentSubmission.findOneAndUpdate(filter, {
        score: req.body.score,
        feedback: req.body.feedback,
      }, { new: true, runValidators: true });
      ok(res, updated, 'Submission graded');
    } catch (error) {
      next(error);
    }
  },
);

// --- users -----------------------------------------------------------------
resourcesRouter.use(
  '/users',
  requireCapability('users.view'),
  crudRouter(User, {
    manageCapability: 'users.manage',
    createable: [
      'name', 'email', 'password', 'phone', 'role', 'status', 'avatarColor', 'designation',
      'registrationNo', 'fatherName', 'cnic', 'bform', 'dob', 'address', 'photoUrl',
      'classId', 'rollNo', 'classIds', 'subjectIds', 'parentIds', 'childIds',
    ],
    updatable: [
      'name', 'email', 'phone', 'role', 'status', 'avatarColor', 'designation',
      'registrationNo', 'fatherName', 'cnic', 'bform', 'dob', 'address', 'photoUrl',
      'classId', 'rollNo', 'classIds', 'subjectIds', 'parentIds', 'childIds',
    ],
    sort: { name: 1 },
    institutionScoped: true,
    searchFields: ['name', 'email', 'registrationNo', 'rollNo'],
    prepareCreate: async (body, req) => {
      if (body.role === 'super_admin' && req.auth?.role !== 'super_admin') {
        throw ApiError.forbidden('Only a Super Admin can create another Super Admin');
      }
      if (body.role !== 'super_admin' && !body.institutionId) {
        throw ApiError.badRequest('Select an institution for this account');
      }
      if (typeof body.password !== 'string' || body.password.length < 8) {
        throw ApiError.badRequest('A password of at least 8 characters is required');
      }
      const passwordHash = await bcrypt.hash(body.password, 12);
      delete body.password;
      body.passwordHash = passwordHash;
      if (body.role === 'super_admin') body.institutionId = null;
      return body;
    },
    prepareUpdate: (body, req) => {
      if (body.role === 'super_admin' && req.auth?.role !== 'super_admin') {
        throw ApiError.forbidden('Only a Super Admin can assign the Super Admin role');
      }
      return body;
    },
  }),
);

// --- programs (school / college / university adapt here) --------------------
resourcesRouter.use(
  '/programs',
  requireCapability('programs.view'),
  crudRouter(Program, {
    manageCapability: 'programs.manage',
    createable: ['name', 'code', 'type', 'level', 'department', 'durationYears', 'semestersPerYear', 'totalCreditHours', 'active'],
    updatable: ['name', 'code', 'type', 'level', 'department', 'durationYears', 'semestersPerYear', 'totalCreditHours', 'active'],
    sort: { name: 1 },
    institutionScoped: true,
    searchFields: ['name', 'code', 'department'],
  }),
);

// --- classes ----------------------------------------------------------------
resourcesRouter.use(
  '/classes',
  requireCapability('classes.view'),
  crudRouter(ClassRoom, {
    manageCapability: 'classes.manage',
    createable: [
      'programId', 'name', 'section', 'room', 'grade', 'year', 'semester',
      'teacherIds', 'inchargeId', 'subjectIncharges', 'studentIds', 'subjectIds',
    ],
    updatable: [
      'name', 'section', 'room', 'grade', 'year', 'semester',
      'teacherIds', 'inchargeId', 'subjectIncharges', 'studentIds', 'subjectIds',
    ],
    sort: { name: 1 },
    institutionScoped: true,
    searchFields: ['name', 'section', 'room'],
  }),
);

// --- subjects ----------------------------------------------------------------
resourcesRouter.use(
  '/subjects',
  requireCapability('subjects.view'),
  crudRouter(Subject, {
    manageCapability: 'subjects.manage',
    createable: ['programId', 'name', 'code', 'classIds', 'creditHours', 'color'],
    updatable: ['name', 'code', 'classIds', 'creditHours', 'color', 'programId'],
    sort: { name: 1 },
    institutionScoped: true,
    searchFields: ['name', 'code'],
  }),
);

// --- timetable (feature-gated) ------------------------------------------------
resourcesRouter.use(
  '/timetable',
  requireCapability('timetable.view'),
  requireFeature('timetable'),
  crudRouter(TimetableSlot, {
    manageCapability: 'timetable.manage',
    createable: ['classId', 'day', 'period', 'subjectId', 'teacherId', 'room'],
    updatable: ['day', 'period', 'subjectId', 'teacherId', 'room'],
    sort: { day: 1, period: 1 },
    institutionScoped: true,
  }),
);

// --- teacher assignments -------------------------------------------------------
resourcesRouter.use(
  '/teacher-assignments',
  requireCapability('classes.view'),
  crudRouter(TeacherAssignment, {
    manageCapability: 'classes.manage',
    createable: ['teacherId', 'classId', 'subjectId', 'day', 'period'],
    updatable: ['teacherId', 'classId', 'subjectId', 'day', 'period'],
    sort: { day: 1, period: 1 },
    institutionScoped: true,
  }),
);

// --- announcements (feature-gated) ----------------------------------------------
resourcesRouter.use(
  '/announcements',
  requireCapability('announcements.view'),
  requireFeature('announcements'),
  crudRouter(Announcement, {
    manageCapability: 'announcements.manage',
    createable: ['title', 'body', 'audience', 'authorId', 'priority', 'pinned'],
    updatable: ['title', 'body', 'audience', 'priority', 'pinned'],
    sort: { pinned: -1, createdAt: -1 },
    institutionScoped: true,
    searchFields: ['title', 'body'],
  }),
);

// --- assignments (feature-gated) -------------------------------------------------
resourcesRouter.use(
  '/assignments',
  requireCapability('assignments.view'),
  requireFeature('assignments'),
  crudRouter(Assignment, {
    manageCapability: 'assignments.manage',
    createable: ['classId', 'subjectId', 'teacherId', 'title', 'description', 'dueDate', 'totalMarks', 'status'],
    updatable: ['title', 'description', 'dueDate', 'totalMarks', 'status'],
    sort: { dueDate: -1 },
    institutionScoped: true,
    searchFields: ['title'],
  }),
);

