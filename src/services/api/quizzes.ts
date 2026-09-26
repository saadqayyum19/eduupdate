import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Quiz, QuizQuestion, QuizStatus, QuizSubmission } from '@/types';
import { getDb, mockDelay, nextId } from '../mockDb';

export const quizKeys = {
  all: ['quizzes'] as const,
  list: (filters?: QuizFilters) => [...quizKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...quizKeys.all, 'detail', id] as const,
  submissions: (quizId: string) => [...quizKeys.all, 'submissions', quizId] as const,
  mySubmissions: (studentId: string) => [...quizKeys.all, 'my-submissions', studentId] as const,
};

export interface QuizFilters {
  classId?: string;
  /** Restrict to quizzes belonging to any of these classes (used for teacher scoping). */
  classIds?: string[];
  teacherId?: string;
}

export interface QuizInput {
  title: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  date: string;
  durationMin: number;
  instructions?: string;
  status?: QuizStatus;
  questions: Array<{
    text: string;
    type: 'mcq' | 'short';
    options?: string[];
    answer: string;
    marks: number;
  }>;
}

/* ------------------------------------------------------------------ answer helpers */

/**
 * Resolve the stored answer of a question to the canonical option text.
 *
 * Historic data stored the **option index** for multiple-choice questions while the
 * attempt form submits the **option text**, which silently broke auto-grading. This
 * helper accepts either representation so both old and new data grade correctly.
 */
export function canonicalAnswer(question: QuizQuestion): string {
  const raw = (question.answer ?? '').trim();
  if (question.type !== 'mcq' || !question.options?.length) return raw;

  // Already an option label → use as-is.
  if (question.options.includes(raw)) return raw;

  // Legacy numeric index → map to the label.
  const index = Number(raw);
  if (Number.isInteger(index) && index >= 0 && index < question.options.length) {
    return question.options[index];
  }
  return raw;
}

/** Case-insensitive, whitespace-trimmed comparison against the canonical answer. */
export function isAnswerCorrect(question: QuizQuestion, submitted: string | undefined): boolean {
  const given = (submitted ?? '').trim();
  if (!given) return false;
  return given.toLowerCase() === canonicalAnswer(question).toLowerCase();
}

/* ------------------------------------------------------------------------- fetches */

export async function fetchQuizzes(filters: QuizFilters = {}): Promise<Quiz[]> {
  await mockDelay();
  return getDb()
    .quizzes.filter(
      (quiz) =>
        (filters.classId ? quiz.classId === filters.classId : true) &&
        (filters.classIds ? filters.classIds.includes(quiz.classId) : true) &&
        (filters.teacherId ? quiz.teacherId === filters.teacherId : true),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchQuiz(id: string): Promise<Quiz> {
  await mockDelay();
  const quiz = getDb().quizzes.find((item) => item.id === id);
  if (!quiz) throw new Error('That quiz could not be found.');
  return quiz;
}

export async function fetchSubmissions(quizId: string): Promise<QuizSubmission[]> {
  await mockDelay();
  return getDb().quizSubmissions.filter((submission) => submission.quizId === quizId);
}

export async function fetchMySubmissions(studentId: string): Promise<QuizSubmission[]> {
  await mockDelay();
  return getDb().quizSubmissions.filter((submission) => submission.studentId === studentId);
}

export async function createQuiz(input: QuizInput): Promise<Quiz> {
  await mockDelay(500);
  const questions = input.questions.map((question) => ({ ...question, id: nextId('qq') }));
  const quiz: Quiz = {
    id: nextId('q'),
    title: input.title.trim(),
    classId: input.classId,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
    date: input.date,
    durationMin: input.durationMin,
    totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
    status: input.status ?? 'published',
    instructions: input.instructions,
    questions,
  };
  getDb().quizzes.push(quiz);
  return quiz;
}

/**
 * Update a quiz. Pass `status` on its own to publish or close an existing quiz —
 * this is what makes the "Closed" state reachable (previously only settable at creation).
 */
export async function updateQuiz(id: string, input: Partial<QuizInput>): Promise<Quiz> {
  await mockDelay(300);
  const db = getDb();
  const index = db.quizzes.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('That quiz could not be found.');

  const current = db.quizzes[index];
  const questions = input.questions
    ? input.questions.map((question, position) => ({
        ...question,
        id: current.questions[position]?.id ?? nextId('qq'),
      }))
    : current.questions;

  const next: Quiz = {
    ...current,
    ...input,
    title: input.title ? input.title.trim() : current.title,
    questions,
    totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
  };
  db.quizzes[index] = next;
  return next;
}

export async function deleteQuiz(id: string): Promise<{ id: string }> {
  await mockDelay();
  const db = getDb();
  db.quizzes = db.quizzes.filter((item) => item.id !== id);
  db.quizSubmissions = db.quizSubmissions.filter((submission) => submission.quizId !== id);
  return { id };
}

/**
 * Student submits a quiz attempt.
 * MCQs are graded immediately (index- or label-format answer keys both work);
 * quizzes containing short answers stay pending until a teacher marks them.
 */
export async function submitAttempt(input: {
  quizId: string;
  studentId: string;
  answers: Record<string, string>;
}): Promise<QuizSubmission> {
  await mockDelay(500);
  const db = getDb();
  const quiz = db.quizzes.find((item) => item.id === input.quizId);
  if (!quiz) throw new Error('That quiz could not be found.');

  let autoScore = 0;
  let pendingShort = false;
  quiz.questions.forEach((question) => {
    if (question.type === 'mcq') {
      if (isAnswerCorrect(question, input.answers[question.id])) autoScore += question.marks;
    } else {
      pendingShort = true;
    }
  });

  const existing = db.quizSubmissions.find(
    (submission) => submission.quizId === input.quizId && submission.studentId === input.studentId,
  );

  const submission: QuizSubmission = {
    id: existing?.id ?? nextId('qs'),
    quizId: input.quizId,
    studentId: input.studentId,
    answers: input.answers,
    submittedAt: new Date().toISOString(),
    score: pendingShort ? null : autoScore,
    feedback: existing?.feedback,
  };

  if (existing) {
    Object.assign(existing, submission);
  } else {
    db.quizSubmissions.push(submission);
  }
  return submission;
}

/** Teacher marks an attempt (required when a quiz has short-answer questions). */
export async function markSubmission(input: {
  submissionId: string;
  score: number;
  feedback?: string;
}): Promise<QuizSubmission> {
  await mockDelay(350);
  const submission = getDb().quizSubmissions.find((item) => item.id === input.submissionId);
  if (!submission) throw new Error('That attempt could not be found.');
  submission.score = input.score;
  submission.feedback = input.feedback;
  return submission;
}

// ---------------------------------------------------------------------------- hooks

export function useQuizzes(filters: QuizFilters = {}) {
  return useQuery({ queryKey: quizKeys.list(filters), queryFn: () => fetchQuizzes(filters) });
}

export function useQuiz(id: string | undefined) {
  return useQuery({
    queryKey: quizKeys.detail(id ?? ''),
    queryFn: () => fetchQuiz(id as string),
    enabled: Boolean(id),
  });
}

export function useSubmissions(quizId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.submissions(quizId ?? ''),
    queryFn: () => fetchSubmissions(quizId as string),
    enabled: Boolean(quizId),
  });
}

export function useMySubmissions(studentId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.mySubmissions(studentId ?? ''),
    queryFn: () => fetchMySubmissions(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all }),
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<QuizInput> }) => updateQuiz(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all }),
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all }),
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitAttempt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all }),
  });
}

export function useMarkSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markSubmission,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all }),
  });
}
