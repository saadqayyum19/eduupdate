import { Schema, model } from 'mongoose';

export const QUIZ_STATUSES = ['draft', 'published', 'closed'] as const;
export const QUESTION_TYPES = ['mcq', 'short'] as const;

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, default: 'mcq' },
    text: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    answer: { type: String, default: '' },
    marks: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

const quizSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subjectId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    teacherId: { type: String, default: null, index: true },
    date: { type: String, required: true },
    durationMin: { type: Number, default: 30, min: 1 },
    totalMarks: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: QUIZ_STATUSES, default: 'draft', index: true },
    instructions: { type: String, trim: true, default: '' },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true },
);

export const Quiz = model('Quiz', quizSchema);
