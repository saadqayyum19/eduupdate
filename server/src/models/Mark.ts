import { Schema, model } from 'mongoose';

export const EXAM_TYPES = ['quiz', 'midterm', 'final', 'assignment'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

/**
 * One assessment result. The mark-entry sheet writes one record per
 * student × subject × exam type × title.
 */
const markSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    studentId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    examType: { type: String, enum: EXAM_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    date: { type: String, required: true },
    enteredBy: { type: String, default: null },
  },
  { timestamps: true },
);

markSchema.index({ studentId: 1, subjectId: 1, examType: 1, title: 1 }, { unique: true });

export const Mark = model('Mark', markSchema);
