import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** TeacherAssignment — teacher ↔ class ↔ subject ↔ day/period teaching load. */
const TeacherAssignmentSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], required: true },
    period: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

TeacherAssignmentSchema.index({ classId: 1, day: 1, period: 1 }, { unique: true });

export type TeacherAssignmentDoc = InferSchemaType<typeof TeacherAssignmentSchema> & { _id: Types.ObjectId };
export const TeacherAssignment: Model<TeacherAssignmentDoc> = model(
  'TeacherAssignment',
  TeacherAssignmentSchema,
) as unknown as Model<TeacherAssignmentDoc>;
