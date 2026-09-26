import { Schema, model } from 'mongoose';

const subjectSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 24 },
    classIds: { type: [String], default: [] },
    color: { type: String, default: '#2563eb' },
  },
  { timestamps: true },
);

subjectSchema.index({ code: 1 }, { unique: true });

export const Subject = model('Subject', subjectSchema);
