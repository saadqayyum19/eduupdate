import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

export const EXAM_TYPES = ['sessional', 'midterm', 'final', 'quiz', 'assignment'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

/**
 * Mark — one score entry. Totals/grades/GPA are derived by combining
 * sessional + midterm + final per subject (see services/grading.ts).
 */
const MarkSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    examType: { type: String, enum: EXAM_TYPES, required: true },
    title: { type: String, default: '' },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    date: { type: String, required: true },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

MarkSchema.index(
  { classId: 1, studentId: 1, subjectId: 1, examType: 1, title: 1 },
  { unique: true },
);

export type MarkDoc = InferSchemaType<typeof MarkSchema> & { _id: Types.ObjectId };
export const Mark: Model<MarkDoc> = model('Mark', MarkSchema) as unknown as Model<MarkDoc>;
