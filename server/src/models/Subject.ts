import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** Subject — offered by a program and assigned to classes + teachers. */
const SubjectSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', default: null, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    classIds: { type: [Schema.Types.ObjectId], ref: 'ClassRoom', default: [] },
    creditHours: { type: Number, default: 0 },
    color: { type: String, default: '#2563eb' },
  },
  { timestamps: true },
);

export type SubjectDoc = InferSchemaType<typeof SubjectSchema> & { _id: Types.ObjectId };
export const Subject: Model<SubjectDoc> = model('Subject', SubjectSchema) as unknown as Model<SubjectDoc>;
