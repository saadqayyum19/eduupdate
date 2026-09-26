import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';
import { WEEK_DAYS } from '../../models/TimetableSlot';

export const slotSchema = z.object({
  classId: z.string().min(8, 'Choose a class'),
  day: z.enum(WEEK_DAYS),
  period: z.coerce.number().int().min(1).max(8),
  subjectId: z.string().min(8, 'Choose a subject'),
  teacherId: z.string().nullable().default(null),
  room: z.string().trim().max(40).default(''),
});

export const timetableQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
  teacherId: z.string().trim().optional(),
});

export const clearSlotSchema = z.object({
  classId: z.string().min(8),
  day: z.enum(WEEK_DAYS),
  period: z.coerce.number().int().min(1).max(8),
});

export type SlotInput = z.infer<typeof slotSchema>;
