import { Schema, model } from 'mongoose';

export const FEE_STATUSES = ['paid', 'unpaid', 'partial'] as const;
export const PAYMENT_METHODS = ['cash', 'card', 'bank', 'upi'] as const;

const receiptSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    reference: { type: String, trim: true, default: '' },
    paidOn: { type: String, required: true },
    recordedBy: { type: String, default: null },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

/**
 * An invoice raised for one student. `paidAmount` and `status` are always derived
 * from the receipts array so the two can never disagree.
 */
const feePaymentSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    invoiceNo: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    structureId: { type: String, required: true, index: true },
    classId: { type: String, index: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: FEE_STATUSES, default: 'unpaid', index: true },
    dueDate: { type: String, required: true },
    paidOn: { type: String, default: null },
    method: { type: String, enum: [...PAYMENT_METHODS, null], default: null },
    receipts: { type: [receiptSchema], default: [] },
  },
  { timestamps: true },
);

export const FeePayment = model('FeePayment', feePaymentSchema);
