import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** Assignment — coursework issued to a class, with student submissions. */
const AssignmentSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueDate: { type: String, required: true },
    totalMarks: { type: Number, default: 100 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true },
);

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & { _id: Types.ObjectId };
export const Assignment: Model<AssignmentDoc> = model('Assignment', AssignmentSchema) as unknown as Model<AssignmentDoc>;

/** AssignmentSubmission — one student's submission for one assignment. */
const AssignmentSubmissionSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    score: { type: Number, default: null },
    feedback: { type: String, default: '' },
  },
  { timestamps: true },
);

AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export type AssignmentSubmissionDoc = InferSchemaType<typeof AssignmentSubmissionSchema> & {
  _id: Types.ObjectId;
};
export const AssignmentSubmission: Model<AssignmentSubmissionDoc> = model(
  'AssignmentSubmission',
  AssignmentSubmissionSchema,
) as unknown as Model<AssignmentSubmissionDoc>;
