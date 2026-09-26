import { z } from 'zod';
import { listQuerySchema } from '../../lib/pagination';
import { passwordSchema } from '../../lib/password';
import { ROLES } from '../../models/User';

export const roleSchema = z.enum(ROLES);
export const statusSchema = z.enum(['active', 'inactive']);

const baseUser = {
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().max(40).default(''),
  role: roleSchema,
  status: statusSchema.default('active'),
  designation: z.string().trim().max(120).default(''),
  classIds: z.array(z.string()).default([]),
  subjectIds: z.array(z.string()).default([]),
  classId: z.string().nullable().optional(),
  rollNo: z.string().trim().max(40).default(''),
  registrationNo: z.string().trim().max(60).default(''),
  fatherName: z.string().trim().max(120).default(''),
  cnic: z.string().trim().max(40).default(''),
  bform: z.string().trim().max(40).default(''),
  dob: z.string().trim().max(20).default(''),
  address: z.string().trim().max(300).default(''),
  photoUrl: z.string().trim().max(500).default(''),
  parentIds: z.array(z.string()).default([]),
  childIds: z.array(z.string()).default([]),
};

/**
 * Creating an account: the administrator either types an initial password or asks the
 * API to email an invite link. Accounts are never created automatically.
 */
export const userCreateSchema = z.object({
  ...baseUser,
  password: passwordSchema.optional(),
  sendInvite: z.boolean().default(false),
});

export const userUpdateSchema = z.object({
  ...baseUser,
  name: baseUser.name.optional(),
  email: baseUser.email.optional(),
  role: baseUser.role.optional(),
  password: passwordSchema.optional(),
});

export const userQuerySchema = listQuerySchema.extend({
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  classId: z.string().trim().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  photoUrl: z.string().trim().max(500).optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
