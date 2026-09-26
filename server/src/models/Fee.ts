import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** FeeStructure — recurring/one-time fee head for a class. */
const FeeStructureSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: ['monthly', 'termly', 'yearly', 'one-time'], default: 'monthly' },
    dueDate: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type FeeStructureDoc = InferSchemaType<typeof FeeStructureSchema> & { _id: Types.ObjectId };
export const FeeStructure: Model<FeeStructureDoc> = model('FeeStructure', FeeStructureSchema) as unknown as Model<FeeStructureDoc>;

/** FeeInvoice — one payable bill raised for a student against a structure. */
const FeeInvoiceSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    invoiceNo: { type: String, required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    structureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid', index: true },
    dueDate: { type: String, required: true },
    paidOn: { type: String, default: null },
    method: { type: String, enum: ['cash', 'card', 'bank', 'upi', 'cheque', ''], default: '' },
    receiptNo: { type: String, default: '' },
  },
  { timestamps: true },
);

export type FeeInvoiceDoc = InferSchemaType<typeof FeeInvoiceSchema> & { _id: Types.ObjectId };
export const FeeInvoice: Model<FeeInvoiceDoc> = model('FeeInvoice', FeeInvoiceSchema) as unknown as Model<FeeInvoiceDoc>;
