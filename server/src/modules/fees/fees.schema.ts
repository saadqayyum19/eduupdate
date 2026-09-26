import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';
import { FEE_FREQUENCIES } from '../../models/FeeStructure';
import { FEE_STATUSES, PAYMENT_METHODS } from '../../models/FeePayment';

export const feeStructureSchema = z.object({
  classId: z.string().min(8, 'Choose a class'),
  title: z.string().trim().min(2, 'Enter the fee title').max(120),
  amount: z.coerce.number().min(0, 'Amount cannot be negative').max(10_000_000),
  frequency: z.enum(FEE_FREQUENCIES).default('monthly'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD due date'),
});

export const feeStructureUpdateSchema = feeStructureSchema.partial().extend({
  active: z.boolean().optional(),
});

export const feeQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
  studentId: z.string().trim().optional(),
  structureId: z.string().trim().optional(),
  status: z.enum(FEE_STATUSES).optional(),
});

export const structureQuerySchema = listQuerySchema.extend({
  classId: z.string().trim().optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment must be greater than zero'),
  method: z.enum(PAYMENT_METHODS).default('cash'),
  reference: z.string().trim().max(80).default(''),
  paidOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date')
    .default(() => new Date().toISOString().slice(0, 10)),
  note: z.string().trim().max(300).default(''),
});

export type FeeStructureInput = z.infer<typeof feeStructureSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
