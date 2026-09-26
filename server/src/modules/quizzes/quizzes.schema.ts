import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';
import { QUIZ_STATUSES } from '../../models/Quiz';

export const questionSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['mcq', 'short']).default('mcq'),
  text: z.string().trim().min(1, 'Enter the question').max(600),
  options: z.array(z.string().trim().max(300)).default([]),
  answer: z.string().trim().max(600).default(''),
  marks: z.coerce.number().min(1).max(1000),
});

export const quizSchema = z.object({
  title: z.string().trim().min(2, 'Enter the quiz title').max(160),
  subjectId: z.string().min(8, 'Choose a subject'),
  classId: z.string().min(8, 'Choose a class'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date'),
  durationMin: z.coerce.number().int().min(1).max(600).default(30),
  status: z.enum(QUIZ_STATUSES).default('draft'),
  instructions: z.string().trim().max(2000).default(''),
  questions: z.array(questionSchema).default([]),
});

export const quizUpdateSchema = quizSchema.partial();

export const quizQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  status: z.enum(QUIZ_STATUSES).optional(),
});

export const attemptSchema = z.object({
  answers: z.record(z.string(), z.string().max(600)).default({}),
});

export const submissionMarkSchema = z.object({
  score: z.coerce.number().min(0).max(1000),
  feedback: z.string().trim().max(2000).default(''),
});

export type QuizInput = z.infer<typeof quizSchema>;
export type AttemptInput = z.infer<typeof attemptSchema>;
