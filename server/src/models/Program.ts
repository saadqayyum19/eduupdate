import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/**
 * Program — the academic offering of an institution.
 * Shape depends on institution type:
 *  - school:     classes 1–12 ("Matric Science", "Class 9")
 *  - college:    intermediate programs (FA, FSc, ICS, ICom)
 *  - university: degree programs (BS, MS, PhD) with departments + credit hours
 */
const ProgramSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ['school', 'college', 'university'], required: true },
    level: {
      type: String,
      enum: ['primary', 'middle', 'matric', 'intermediate', 'bachelor', 'master', 'doctorate', 'certificate'],
      required: true,
    },
    department: { type: String, default: '' },
    durationYears: { type: Number, default: 1 },
    semestersPerYear: { type: Number, default: 2 },
    totalCreditHours: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ProgramSchema.index({ institutionId: 1, code: 1 }, { unique: true });

export type ProgramDoc = InferSchemaType<typeof ProgramSchema> & { _id: Types.ObjectId };
export const Program: Model<ProgramDoc> = model('Program', ProgramSchema) as unknown as Model<ProgramDoc>;
