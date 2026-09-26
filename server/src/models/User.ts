import { Schema, model } from 'mongoose';

export const ROLES = [
  'super_admin',
  'admin',
  'principal',
  'teacher_incharge',
  'teacher',
  'student',
  'parent',
] as const;

export type Role = (typeof ROLES)[number];
export type UserStatus = 'active' | 'inactive';

/**
 * Accounts are never created automatically. The setup wizard creates the first
 * administrator; every other account is created by an administrator afterwards.
 */
const userSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    avatarColor: { type: String, default: '#2563eb' },
    joinedAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },

    // Staff
    designation: { type: String, trim: true, default: '' },
    classIds: { type: [String], default: [] },
    subjectIds: { type: [String], default: [] },

    // Students
    classId: { type: String, default: null, index: true },
    rollNo: { type: String, trim: true, default: '' },
    registrationNo: { type: String, trim: true, default: '' },
    fatherName: { type: String, trim: true, default: '' },
    cnic: { type: String, trim: true, default: '' },
    bform: { type: String, trim: true, default: '' },
    dob: { type: String, default: '' },
    address: { type: String, trim: true, default: '' },
    photoUrl: { type: String, default: '' },

    // Relationships
    parentIds: { type: [String], default: [] },
    childIds: { type: [String], default: [] },

    // Credentials — the hash is never selected unless explicitly asked for.
    passwordHash: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, default: false },

    // Brute-force protection: 5 failures lock the account for 15 minutes.
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // Password reset
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },

    createdBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = model('User', userSchema);
