import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';
import { ATTENDANCE_STATUSES } from '../../models/Attendance';

export const rosterSchema = z.object({
  classId: z.string().min(8, 'Choose a class'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date'),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(8),
        status: z.enum(ATTENDANCE_STATUSES),
        note: z.string().trim().max(200).default(''),
      }),
    )
    .min(1, 'There is nothing to save'),
});

export const attendanceQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
  studentId: z.string().trim().optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  date: z.string().trim().optional(),
});

export type RosterInput = z.infer<typeof rosterSchema>;
