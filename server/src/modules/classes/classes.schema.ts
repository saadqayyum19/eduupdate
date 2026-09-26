import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';

export const classSchema = z.object({
  name: z.string().trim().min(1, 'Enter the class name').max(80),
  section: z.string().trim().min(1, 'Enter the section').max(20).default('A'),
  room: z.string().trim().max(40).default(''),
  teacherIds: z.array(z.string()).default([]),
  inchargeId: z.string().nullable().default(null),
  subjectIncharges: z.record(z.string(), z.string().nullable()).default({}),
  studentIds: z.array(z.string()).default([]),
  subjectIds: z.array(z.string()).default([]),
});

export const classUpdateSchema = classSchema.partial();

export const classQuerySchema = listQuerySchema;

export type ClassInput = z.infer<typeof classSchema>;
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;
