import { z } from 'zod';
import { passwordSchema } from '../../lib/password';

/** Payload of the one-time setup wizard. */
export const setupSchema = z.object({
  institutionName: z.string().trim().min(2, 'Enter the institution name').max(160),

  institutionType: z.enum(['school', 'college', 'university']),

  address: z.string().trim().max(300).default(''),
  phone: z.string().trim().max(40).default(''),
  email: z.string().trim().toLowerCase().email('Enter a valid institution email').or(z.literal('')).default(''),

  academicYearStart: z.string().trim().regex(/^\d{4}$/, 'Use a four digit year, e.g. 2025'),
  academicYearEnd: z.string().trim().regex(/^\d{4}$/, 'Use a four digit year, e.g. 2026'),

  currency: z.string().trim().min(3).max(3, 'Use a three letter currency code, e.g. PKR').toUpperCase(),
  timezone: z.string().trim().min(3).max(64),

  adminName: z.string().trim().min(2, 'Enter the administrator name').max(120),
  adminEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
  adminPassword: passwordSchema,
});

export type SetupInput = z.infer<typeof setupSchema>;
