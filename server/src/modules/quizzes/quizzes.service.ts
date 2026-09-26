import { ApiError } from '../../lib/ApiError';
import { combineFilters, paginate, searchOr, skipOf, sortOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { purgeSubjectReferences } from '../../lib/graph';
import { assertClassAccess, resolveScope, scopedFilter } from '../../lib/scope';
import type { AuthUser } from '../../middleware/auth';
import { Quiz } from '../../models/Quiz';
import { QuizSubmission } from '../../models/QuizSubmission';
import type { AttemptInput, QuizInput } from './quizzes.schema';

interface QuizQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: 'asc' | 'desc';
  search?: string;
  classId?: string;
  subjectId?: string;
  status?: string;
}

const SORTABLE = { title: 'title', date: 'date', createdAt: 'createdAt', status: 'status' };

export async function listQuizzes(query: QuizQuery, user: AuthUser) {
  const scope = await resolveScope(user);
  const search = searchOr(['title', 'instructions'], query.search);

  const filters = combineFilters(
    scopedFilter(scope, 'classId', query.classId),
    query.subjectId ? { subjectId: query.subjectId } : undefined,
    query.status ? { status: query.status } : undefined,
    search ? { $or: search } : undefined,
  );

  const [items, total] = await Promise.all([
    Quiz.find(filters).sort(sortOf(query as never, SORTABLE, 'date')).skip(skipOf(query as never)).limit(query.pageSize).lean(),
    Quiz.countDocuments(filters),
  ]);

  return paginate(serialiseList(items), total, query as never);
}

export async function getQuiz(id: string): Promise<unknown> {
  const quiz = await Quiz.findById(id).lean();
  if (!quiz) throw ApiError.notFound('That quiz could not be found.');
  return serialiseOne(quiz);
}

export async function createQuiz(input: QuizInput, user: AuthUser): Promise<unknown> {
  await assertClassAccess(user, input.classId);

  const totalMarks = input.questions.reduce((sum, question) => sum + question.marks, 0);

  const quiz = await Quiz.create({ ...input, teacherId: user.id, totalMarks });
  return serialiseOne(quiz.toObject());
}

export async function updateQuiz(id: string, input: Partial<QuizInput>, user: AuthUser): Promise<unknown> {
  const quiz = await Quiz.findById(id);
  if (!quiz) throw ApiError.notFound('That quiz could not be found.');

  if (user.role === 'teacher' && quiz.teacherId !== user.id) {
    throw ApiError.forbidden('Only the teacher who created this quiz can change it.');
  }

  Object.assign(quiz, input);
  if (input.questions) {
    quiz.totalMarks = input.questions.reduce((sum, question) => sum + question.marks, 0);
  }
  await quiz.save();

  return serialiseOne(quiz.toObject());
}

export async function deleteQuiz(id: string): Promise<void> {
  const quiz = await Quiz.findById(id).lean();
  if (!quiz) throw ApiError.notFound('That quiz could not be found.');

  await Quiz.deleteOne({ _id: id });
  await QuizSubmission.deleteMany({ quizId: id });
}

/** Auto-marks multiple-choice answers; short answers wait for the teacher. */
function autoScore(quiz: { questions: Array<{ id: string; type: string; answer: string; marks: number }> },
  answers: Record<string, string>,
): { score: number | null; needsMarking: boolean } {
  let score = 0;
  let needsMarking = false;

  for (const question of quiz.questions) {
    const given = (answers[question.id] ?? '').trim();
    if (question.type === 'short') {
      needsMarking = true;
      continue;
    }
    if (given && given.toLowerCase() === question.answer.trim().toLowerCase()) score += question.marks;
  }

  return { score: needsMarking ? null : score, needsMarking };
}

export async function submitAttempt(quizId: string, input: AttemptInput, user: AuthUser): Promise<unknown> {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw ApiError.notFound('That quiz could not be found.');
  if (quiz.status !== 'published') throw ApiError.badRequest('That quiz is not open for attempts.');

  const existing = await QuizSubmission.findOne({ quizId, studentId: user.id }).lean();
  if (existing) throw ApiError.conflict('You have already submitted this quiz.');

  const { score, needsMarking } = autoScore(quiz, input.answers);

  const submission = await QuizSubmission.create({
    quizId,
    studentId: user.id,
    answers: input.answers,
    score,
    feedback: needsMarking ? '' : 'Marked automatically.',
  });

  return serialiseOne(submission.toObject());
}

export async function listSubmissions(quizId: string, query: QuizQuery) {
  const filters = { quizId };
  const [items, total] = await Promise.all([
    QuizSubmission.find(filters).sort({ submittedAt: -1 }).skip(skipOf(query as never)).limit(query.pageSize).lean(),
    QuizSubmission.countDocuments(filters),
  ]);
  return paginate(serialiseList(items), total, query as never);
}

export async function markSubmission(id: string, score: number, feedback: string, user: AuthUser): Promise<unknown> {
  const submission = await QuizSubmission.findById(id);
  if (!submission) throw ApiError.notFound('That submission could not be found.');

  submission.score = score;
  submission.feedback = feedback;
  submission.markedBy = user.id;
  await submission.save();

  return serialiseOne(submission.toObject());
}

/** Every attempt made by the signed-in student (or their children, for a parent). */
export async function mySubmissions(studentId: string): Promise<unknown[]> {
  const items = await QuizSubmission.find({ studentId }).sort({ submittedAt: -1 }).lean();
  return serialiseList(items);
}

export { purgeSubjectReferences };
