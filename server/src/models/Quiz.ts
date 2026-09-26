import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** Quiz — online test with embedded questions (MCQ + short answer). */
const QuizQuestionSchema = new Schema(
  {
    type: { type: String, enum: ['mcq', 'short'], required: true },
    text: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    marks: { type: Number, required: true, min: 1 },
  },
  { _id: true },
);

const QuizSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    title: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    durationMin: { type: Number, default: 15 },
    totalMarks: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' },
    instructions: { type: String, default: '' },
    questions: { type: [QuizQuestionSchema], default: [] },
  },
  { timestamps: true },
);

export type QuizDoc = InferSchemaType<typeof QuizSchema> & { _id: Types.ObjectId };
export const Quiz: Model<QuizDoc> = model('Quiz', QuizSchema) as unknown as Model<QuizDoc>;

/** QuizSubmission — a student's attempt; score null until teacher marks it. */
const QuizSubmissionSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: { type: Map, of: String, default: {} },
    score: { type: Number, default: null },
    feedback: { type: String, default: '' },
  },
  { timestamps: true },
);

QuizSubmissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export type QuizSubmissionDoc = InferSchemaType<typeof QuizSubmissionSchema> & { _id: Types.ObjectId };
export const QuizSubmission: Model<QuizSubmissionDoc> = model('QuizSubmission', QuizSubmissionSchema) as unknown as Model<QuizSubmissionDoc>;
