import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Quiz, QuizQuestion, QuizStatus, QuizSubmission } from '@/types';
import { http } from '../http';

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

export interface QuizQuestionInput {
  id?: string;
  text: string;
  type: 'mcq' | 'short';
  options?: string[];
  answer: string;
  marks: number;
}

export interface QuizInput {
  title: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  date: string;
  durationMin: number;
  instructions?: string;
  status?: QuizStatus;
  questions: QuizQuestionInput[];
}

/* ------------------------------------------------------------------ answer helpers */

/**
 * Resolve the stored answer of a question to the canonical option text.
 * Historic data stored the option index for multiple-choice questions while the attempt
 * form submits the option text, so both representations are accepted.
 */
export function canonicalAnswer(question: QuizQuestion): string {
  const raw = (question.answer ?? '').trim();
  if (question.type !== 'mcq' || !question.options?.length) return raw;

  if (question.options.includes(raw)) return raw;

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

function questionId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function withQuestionIds(questions: QuizQuestionInput[]) {
  return questions.map((question) => ({ ...question, id: question.id ?? questionId() }));
}

export async function fetchQuizzes(filters: QuizFilters = {}): Promise<Quiz[]> {
  const { data } = await http.get<{ items: Quiz[] }>('/quizzes', {
    params: { pageSize: 200, classId: filters.classId },
  });

  // The API already scopes to the caller's classes; `classIds` narrows further.
  return filters.classIds?.length
    ? data.items.filter((quiz) => filters.classIds?.includes(quiz.classId))
    : data.items;
}

export async function fetchQuiz(id: string): Promise<Quiz> {
  const { data } = await http.get<{ quiz: Quiz }>(`/quizzes/${id}`);
  return data.quiz;
}

export async function fetchSubmissions(quizId: string): Promise<QuizSubmission[]> {
  const { data } = await http.get<{ items: QuizSubmission[] }>(`/quizzes/${quizId}/submissions`, {
    params: { pageSize: 500 },
  });
  return data.items;
}

export async function fetchMySubmissions(studentId: string): Promise<QuizSubmission[]> {
  const { data } = await http.get<{ items: QuizSubmission[] }>('/quizzes/submissions/mine', {
    params: { studentId },
  });
  return data.items;
}

export async function createQuiz(input: QuizInput): Promise<Quiz> {
  const { data } = await http.post<{ quiz: Quiz }>('/quizzes', {
    ...input,
    questions: withQuestionIds(input.questions ?? []),
  });
  return data.quiz;
}

export async function updateQuiz(id: string, input: Partial<QuizInput>): Promise<Quiz> {
  const { data } = await http.patch<{ quiz: Quiz }>(`/quizzes/${id}`, {
    ...input,
    ...(input.questions ? { questions: withQuestionIds(input.questions) } : {}),
  });
  return data.quiz;
}

export async function deleteQuiz(id: string): Promise<{ id: string }> {
  await http.delete(`/quizzes/${id}`);
  return { id };
}

/** The student's attempt. Auto-marking happens on the server. */
export async function submitAttempt(input: {
  quizId: string;
  studentId: string;
  answers: Record<string, string>;
}): Promise<QuizSubmission> {
  const { data } = await http.post<{ submission: QuizSubmission }>(`/quizzes/${input.quizId}/attempt`, {
    answers: input.answers,
  });
  return data.submission;
}

/** Teacher marks an attempt (required when a quiz has short-answer questions). */
export async function markSubmission(input: {
  submissionId: string;
  score: number;
  feedback?: string;
}): Promise<QuizSubmission> {
  const { data } = await http.patch<{ submission: QuizSubmission }>(`/quizzes/submissions/${input.submissionId}`, {
    score: input.score,
    feedback: input.feedback ?? '',
  });
  return data.submission;
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
