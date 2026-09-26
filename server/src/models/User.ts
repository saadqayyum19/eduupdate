import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';
import type { Role } from '../rbac';

/**
 * User — every account on the platform (staff, students, parents) plus the
 * platform-level Super Admin. Institution-scoped except for super_admin.
 */
const UserSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', index: true, default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, default: '' },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher', 'student', 'parent'],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatarColor: { type: String, default: '#2563eb' },
    designation: { type: String, default: '' },

    // Students
    registrationNo: { type: String, default: '' },
    fatherName: { type: String, default: '' },
    cnic: { type: String, default: '' },
    bform: { type: String, default: '' },
    dob: { type: String, default: '' },
    address: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', default: null, index: true },
    rollNo: { type: String, default: '' },

    // Teachers
    classIds: { type: [Schema.Types.ObjectId], ref: 'ClassRoom', default: [] },
    subjectIds: { type: [Schema.Types.ObjectId], ref: 'Subject', default: [] },

    // Family links
    parentIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    childIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.index({ name: 'text', email: 'text', registrationNo: 'text' });

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export const User: Model<UserDoc> = model('User', UserSchema) as unknown as Model<UserDoc>;

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher'];
