import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/**
 * ClassRoom — a teachable cohort. For schools: "Class 10 — Section A".
 * For colleges: "FSc Part 1 — A". For universities: "BS CS Semester 3 — A".
 */
const ClassRoomSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    name: { type: String, required: true, trim: true },
    section: { type: String, default: 'A', trim: true },
    room: { type: String, default: '' },
    /** School: grade number 1–12. College/university: year or semester. */
    grade: { type: Number, default: 0 },
    year: { type: Number, default: 1 },
    semester: { type: Number, default: 1 },
    teacherIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    inchargeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    subjectIncharges: { type: Map, of: Schema.Types.ObjectId, default: {} },
    studentIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    subjectIds: { type: [Schema.Types.ObjectId], ref: 'Subject', default: [] },
  },
  { timestamps: true },
);

export type ClassRoomDoc = InferSchemaType<typeof ClassRoomSchema> & { _id: Types.ObjectId };
export const ClassRoom: Model<ClassRoomDoc> = model('ClassRoom', ClassRoomSchema) as unknown as Model<ClassRoomDoc>;
