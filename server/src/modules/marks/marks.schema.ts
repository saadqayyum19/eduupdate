import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';
import { EXAM_TYPES } from '../../models/Mark';

export const markInputSchema = z
  .object({
    studentId: z.string().min(8, 'Choose a student'),
    classId: z.string().min(8, 'Choose a class'),
    subjectId: z.string().min(8, 'Choose a subject'),
    examType: z.enum(EXAM_TYPES),
    title: z.string().trim().min(1, 'Enter the assessment title').max(120),
    score: z.coerce.number().min(0),
    total: z.coerce.number().min(1, 'Total marks must be at least 1'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date'),
  })
  .refine((value) => value.score <= value.total, {
    message: 'Score cannot be higher than the total marks',
    path: ['score'],
  });

/** The mark-entry sheet sends a whole column at once. */
export const marksSaveSchema = z.array(markInputSchema).min(1, 'There is nothing to save').max(500);

export const marksQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
  studentId: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  examType: z.enum(EXAM_TYPES).optional(),
  title: z.string().trim().optional(),
});

export const rankingQuerySchema = z.object({ classId: z.string().min(8, 'Choose a class') });

export type MarkInput = z.infer<typeof markInputSchema>;
export type MarksQuery = z.infer<typeof marksQuerySchema>;
