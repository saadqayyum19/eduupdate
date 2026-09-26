import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** AttendanceRecord — one student's status for one date (optionally subject-wise). */
const AttendanceSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

AttendanceSchema.index({ classId: 1, date: 1, studentId: 1, subjectId: 1 }, { unique: true });

export type AttendanceDoc = InferSchemaType<typeof AttendanceSchema> & { _id: Types.ObjectId };
export const Attendance: Model<AttendanceDoc> = model('Attendance', AttendanceSchema) as unknown as Model<AttendanceDoc>;
