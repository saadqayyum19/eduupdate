import { z } from 'zod';
import { FEATURE_KEYS } from '../../lib/features';

const gradeBandSchema = z.object({
  grade: z.string().trim().min(1).max(8),
  gpa: z.coerce.number().min(0).max(10),
  min: z.coerce.number().min(0).max(100),
  max: z.coerce.number().min(0).max(100),
});

export const settingsUpdateSchema = z.object({
  institution: z
    .object({
      name: z.string().trim().min(2).max(160).optional(),
      type: z.enum(['school', 'college', 'university']).optional(),
      address: z.string().trim().max(300).optional(),
      phone: z.string().trim().max(40).optional(),
      email: z.string().trim().toLowerCase().email().or(z.literal('')).optional(),
      logoUrl: z.string().trim().max(500).optional(),
    })
    .optional(),

  academicYearStart: z.string().trim().regex(/^\d{4}$/).optional(),
  academicYearEnd: z.string().trim().regex(/^\d{4}$/).optional(),
  term: z.string().trim().max(40).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  timezone: z.string().trim().max(64).optional(),

  gradeBands: z.array(gradeBandSchema).max(20).optional(),

  feeDefaults: z
    .object({
      lateFeePercent: z.coerce.number().min(0).max(100).optional(),
      taxPercent: z.coerce.number().min(0).max(100).optional(),
    })
    .optional(),

  attendanceRules: z
    .object({
      workingDays: z.array(z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])).optional(),
      lateThresholdMin: z.coerce.number().min(0).max(240).optional(),
      minAttendancePercent: z.coerce.number().min(0).max(100).optional(),
    })
    .optional(),

  smtp: z
    .object({
      host: z.string().trim().max(160).optional(),
      port: z.coerce.number().int().min(1).max(65535).optional(),
      secure: z.boolean().optional(),
      user: z.string().trim().max(160).optional(),
      pass: z.string().max(200).optional(),
      from: z.string().trim().max(200).optional(),
    })
    .optional(),
});

export const featurePatchSchema = z
  .object(Object.fromEntries(FEATURE_KEYS.map((key) => [key, z.boolean().optional()])) as Record<
    (typeof FEATURE_KEYS)[number],
    z.ZodOptional<z.ZodBoolean>
  >)
  .strict();

export const wipeSchema = z.object({
  confirmName: z.string().trim().min(2, 'Type the institution name to confirm'),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
