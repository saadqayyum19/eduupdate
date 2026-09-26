import { Schema, model } from 'mongoose';

/** A student's attempt at a quiz. `score` stays null until a teacher marks it. */
const quizSubmissionSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    quizId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    answers: { type: Map, of: String, default: {} },
    submittedAt: { type: Date, default: () => new Date() },
    score: { type: Number, default: null },
    feedback: { type: String, trim: true, default: '' },
    markedBy: { type: String, default: null },
  },
  { timestamps: true },
);

quizSubmissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export const QuizSubmission = model('QuizSubmission', quizSubmissionSchema);
