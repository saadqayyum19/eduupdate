import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Quiz, QuizSubmission } from '../models/Quiz';
import { User } from '../models/User';
import { ok, created, paginate } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import { protect, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';

export const quizzesRouter = Router();
quizzesRouter.use(protect, requireCapability('quizzes.view'), requireFeature('quizzes'));

const quizSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    durationMin: z.number().min(1).max(300),
    instructions: z.string().optional(),
    status: z.enum(['draft', 'published', 'closed']).optional(),
    questions: z
      .array(
        z.object({
          type: z.enum(['mcq', 'short']),
          text: z.string().min(1),
          options: z.array(z.string()).optional(),
          answer: z.string().min(1),
          marks: z.number().min(1),
        }),
      )
      .min(1),
  }),
});

const attemptSchema = z.object({
  body: z.object({
    answers: z.record(z.string()),
  }),
});

/** Resolve the stored answer to canonical option text (handles legacy index format). */
function canonicalAnswer(question: { type: string; options?: string[]; answer: string }): string {
  const raw = (question.answer ?? '').trim();
  if (question.type !== 'mcq' || !question.options?.length) return raw;
  if (question.options.includes(raw)) return raw;
  const index = Number(raw);
  if (Number.isInteger(index) && index >= 0 && index < question.options.length) {
    return question.options[index];
  }
  return raw;
}

/**
 * GET /api/v1/quizzes — role-scoped list:
 * students → own class, parents → children's classes, teachers → own/assigned classes.
 */
quizzesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const filter: Record<string, unknown> = {};
    if (req.query.classId && req.query.classId !== 'all') filter.classId = req.query.classId;

    const auth = req.auth!;
    if (auth.role === 'student') {
      const student = await User.findById(auth.sub).lean();
      if (student?.classId) filter.classId = student.classId;
      else filter.classId = null;
    } else if (auth.role === 'parent') {
      const parent = await User.findById(auth.sub).lean();
      const children = await User.find({ _id: { $in: (parent?.childIds ?? []) } }).lean();
      filter.classId = { $in: children.map((c) => c.classId).filter(Boolean) };
    } else if (auth.role === 'teacher' || auth.role === 'teacher_incharge') {
      const teacher = await User.findById(auth.sub).lean();
      const classIds = (teacher?.classIds ?? []).map(String);
      filter.$or = [{ teacherId: auth.sub }, { classId: { $in: classIds } }];
    }

    const [items, total] = await Promise.all([
      Quiz.find(filter).sort({ date: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      Quiz.countDocuments(filter),
    ]);
    ok(res, paginate(items, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/quizzes/:id */
quizzesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) throw ApiError.notFound('Quiz not found');
    ok(res, quiz);
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/quizzes — create (quizzes.manage). */
quizzesRouter.post(
  '/',
  requireCapability('quizzes.manage'),
  validate(quizSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof quizSchema>['body'];
      const quiz = await Quiz.create({
        ...body,
        teacherId: req.auth!.sub,
        institutionId: req.auth!.inst,
        totalMarks: body.questions.reduce((sum, q) => sum + q.marks, 0),
      });
      created(res, quiz, 'Quiz created');
    } catch (error) {
      next(error);
    }
  },
);

/** PATCH /api/v1/quizzes/:id — edit content or transition status (draft/published/closed). */
quizzesRouter.patch(
  '/:id',
  requireCapability('quizzes.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allowed = ['title', 'date', 'durationMin', 'instructions', 'status', 'questions'];
      const patch: Record<string, unknown> = {};
      allowed.forEach((key) => {
        if (key in req.body) patch[key] = req.body[key];
      });
      if (Array.isArray(req.body.questions)) {
        patch.totalMarks = (req.body.questions as Array<{ marks: number }>).reduce(
          (sum, q) => sum + q.marks,
          0,
        );
      }
      const quiz = await Quiz.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
      if (!quiz) throw ApiError.notFound('Quiz not found');
      ok(res, quiz, 'Quiz updated');
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/v1/quizzes/:id */
quizzesRouter.delete(
  '/:id',
  requireCapability('quizzes.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await Quiz.findByIdAndDelete(req.params.id);
      if (!quiz) throw ApiError.notFound('Quiz not found');
      await QuizSubmission.deleteMany({ quizId: req.params.id });
      ok(res, { id: req.params.id }, 'Quiz deleted');
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/v1/quizzes/:id/attempt — student submits an attempt (quizzes.attempt). */
quizzesRouter.post(
  '/:id/attempt',
  requireCapability('quizzes.attempt'),
  validate(attemptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) throw ApiError.notFound('Quiz not found');
      if (quiz.status !== 'published') throw ApiError.badRequest('This quiz is not open for attempts');

      const answers = req.body.answers as Record<string, string>;
      let autoScore = 0;
      let pendingShort = false;
      quiz.questions.forEach((question) => {
        const given = (answers[String(question._id)] ?? '').trim();
        if (question.type === 'mcq') {
          if (given && given.toLowerCase() === canonicalAnswer(question).toLowerCase()) {
            autoScore += question.marks;
          }
        } else if (given) {
          pendingShort = true;
        }
      });

      const submission = await QuizSubmission.findOneAndUpdate(
        { quizId: quiz._id, studentId: req.auth!.sub },
        {
          $set: {
            answers,
            score: pendingShort ? null : autoScore,
            institutionId: req.auth!.inst,
          },
        },
        { new: true, upsert: true },
      );
      ok(res, submission, 'Attempt submitted');
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/v1/quizzes/:id/submissions — review list (quizzes.mark). */
quizzesRouter.get(
  '/:id/submissions',
  requireCapability('quizzes.mark'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await QuizSubmission.find({ quizId: req.params.id }).lean();
      ok(res, items);
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/v1/quizzes/submissions/:id/mark — teacher scores an attempt. */
quizzesRouter.post(
  '/submissions/:id/mark',
  requireCapability('quizzes.mark'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { score, feedback } = req.body as { score?: number; feedback?: string };
      if (typeof score !== 'number' || score < 0) throw ApiError.badRequest('score is required');
      const submission = await QuizSubmission.findByIdAndUpdate(
        req.params.id,
        { $set: { score, feedback: feedback ?? '' } },
        { new: true },
      );
      if (!submission) throw ApiError.notFound('Submission not found');
      ok(res, submission, 'Submission marked');
    } catch (error) {
      next(error);
    }
  },
);

