import { Schema, model } from 'mongoose';

/** The tenant record — created once by the setup wizard. */
const institutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: ['school', 'college', 'university'], default: 'school' },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    logoUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

export const Institution = model('Institution', institutionSchema);
