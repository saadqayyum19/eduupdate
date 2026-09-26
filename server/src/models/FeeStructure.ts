import { Schema, model } from 'mongoose';

export const FEE_FREQUENCIES = ['monthly', 'termly', 'yearly', 'one-time'] as const;

/** A billing rule for one class. Creating a structure raises an invoice per student. */
const feeStructureSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    classId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: FEE_FREQUENCIES, default: 'monthly' },
    dueDate: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const FeeStructure = model('FeeStructure', feeStructureSchema);
