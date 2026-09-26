import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';

export const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Enter the subject name').max(120),
  code: z.string().trim().min(1, 'Enter a subject code').max(24).toUpperCase(),
  classIds: z.array(z.string()).default([]),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour').optional(),
});

export const subjectUpdateSchema = subjectSchema.partial();

export const subjectQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
});

export const toggleClassSchema = z.object({ classId: z.string().min(8) });

export type SubjectInput = z.infer<typeof subjectSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
