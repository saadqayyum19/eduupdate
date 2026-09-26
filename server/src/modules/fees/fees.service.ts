import { ApiError } from '../../lib/ApiError';
import { buildPdf, money } from '../../lib/pdf';
import { combineFilters, paginate, searchOr, skipOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { findSettings } from '../../lib/settings';
import { resolveScope, scopedFilter } from '../../lib/scope';
import { nextInvoiceNumber } from '../../lib/graph';
import type { AuthUser } from '../../middleware/auth';
import { ClassRoom } from '../../models/ClassRoom';
import { FeePayment } from '../../models/FeePayment';
import { FeeStructure } from '../../models/FeeStructure';
import { User } from '../../models/User';
import type { FeeStructureInput, RecordPaymentInput } from './fees.schema';

const SYMBOLS: Record<string, string> = {
  PKR: 'Rs', INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR',
  AUD: 'A$', CAD: 'C$', MYR: 'RM', NGN: '₦', KES: 'KSh', BDT: '৳', LKR: 'Rs',
};

function symbol(currency: string): string {
  return SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

/* ------------------------------------------------------------------ structures */

export async function listStructures(query: { page: number; pageSize: number; classId?: string; search?: string }) {
  const search = searchOr(['title'], query.search);
  const filters = combineFilters(
    query.classId ? { classId: query.classId } : undefined,
    search ? { $or: search } : undefined,
  );

  const [items, total] = await Promise.all([
    FeeStructure.find(filters).sort({ dueDate: -1 }).skip(skipOf(query as never)).limit(query.pageSize).lean(),
    FeeStructure.countDocuments(filters),
  ]);

  return paginate(serialiseList(items), total, query as never);
}

/** Creating a structure raises one invoice per student enrolled in that class. */
export async function createStructure(input: FeeStructureInput): Promise<unknown> {
  const classRoom = await ClassRoom.findById(input.classId).lean();
  if (!classRoom) throw ApiError.notFound('That class could not be found.');

  const settings = await findSettings();
  const tax = settings.feeDefaults.taxPercent
    ? Math.round((input.amount * settings.feeDefaults.taxPercent) / 100)
    : 0;

  const structure = await FeeStructure.create({ ...input, amount: input.amount + tax });
  const students = await User.find({ role: 'student', classId: input.classId }).select('_id').lean();

  for (const student of students) {
    await FeePayment.create({
      invoiceNo: await nextInvoiceNumber(),
      studentId: String(student._id),
      structureId: String(structure._id),
      classId: input.classId,
      amount: input.amount + tax,
      paidAmount: 0,
      status: 'unpaid',
      dueDate: input.dueDate,
    });
  }

  return serialiseOne(await FeeStructure.findById(structure._id).lean());
}

export async function updateStructure(
  id: string,
  input: Partial<FeeStructureInput> & { active?: boolean },
): Promise<unknown> {
  const structure = await FeeStructure.findById(id);
  if (!structure) throw ApiError.notFound('That fee structure could not be found.');

  Object.assign(structure, input);
  await structure.save();
  return serialiseOne(structure.toObject());
}

/** Deleting a structure drops its unpaid invoices; money already received is kept. */
export async function deleteStructure(id: string): Promise<void> {
  const structure = await FeeStructure.findById(id).lean();
  if (!structure) throw ApiError.notFound('That fee structure could not be found.');

  await FeePayment.deleteMany({ structureId: id, paidAmount: 0 });
  await FeeStructure.deleteOne({ _id: id });
}

/* -------------------------------------------------------------------- invoices */

interface InvoiceQuery {
  page: number;
  pageSize: number;
  search?: string;
  classId?: string;
  studentId?: string;
  structureId?: string;
  status?: string;
}

/** Invoice rows enriched with the student, class and fee title the UI shows. */
export async function listInvoices(query: InvoiceQuery, user: AuthUser) {
  const scope = await resolveScope(user);

  const filters = combineFilters(
    scopedFilter(scope, 'studentId', query.studentId),
    scopedFilter(scope, 'classId', query.classId),
    query.structureId ? { structureId: query.structureId } : undefined,
    query.status ? { status: query.status } : undefined,
  );

  const payments = await FeePayment.find(filters).sort({ dueDate: -1 }).lean();

  const [students, classes, structures] = await Promise.all([
    User.find({ _id: { $in: [...new Set(payments.map((payment) => payment.studentId))] } })
      .select('name rollNo classId')
      .lean(),
    ClassRoom.find().select('name section').lean(),
    FeeStructure.find({ _id: { $in: [...new Set(payments.map((payment) => payment.structureId))] } })
      .select('title frequency')
      .lean(),
  ]);

  const enriched = payments.map((payment) => {
    const student = students.find((item) => String(item._id) === payment.studentId);
    const classRoom = classes.find((item) => String(item._id) === (payment.classId ?? student?.classId));
    const structure = structures.find((item) => String(item._id) === payment.structureId);
    return {
      ...(serialiseOne<Record<string, unknown>>(payment)),
      studentName: student?.name ?? '—',
      rollNo: student?.rollNo ?? '',
      classId: payment.classId ?? student?.classId ?? '',
      className: classRoom ? `${classRoom.name} ${classRoom.section}` : '',
      structureTitle: structure?.title ?? 'Fee',
    };
  });

  const term = query.search?.trim().toLowerCase();
  const filtered = term
    ? enriched.filter((row) =>
        `${row.invoiceNo} ${row.studentName} ${row.rollNo} ${row.className} ${row.structureTitle}`
          .toLowerCase()
          .includes(term),
      )
    : enriched;

  const start = (query.page - 1) * query.pageSize;
  return paginate(filtered.slice(start, start + query.pageSize), filtered.length, query as never);
}

export async function getInvoice(id: string): Promise<Record<string, unknown>> {
  const payment = await FeePayment.findById(id).lean();
  if (!payment) throw ApiError.notFound('That invoice could not be found.');

  const [student, classRoom, structure] = await Promise.all([
    User.findById(payment.studentId).select('name rollNo').lean(),
    payment.classId ? ClassRoom.findById(payment.classId).select('name section').lean() : null,
    FeeStructure.findById(payment.structureId).select('title frequency').lean(),
  ]);

  return {
    ...(serialiseOne<Record<string, unknown>>(payment)),
    studentName: student?.name ?? '—',
    rollNo: student?.rollNo ?? '',
    className: classRoom ? `${classRoom.name} ${classRoom.section}` : '',
    structureTitle: structure?.title ?? 'Fee',
  };
}

/* -------------------------------------------------------------------- payments */

/** Records a (possibly partial) payment and recomputes the invoice state. */
export async function recordPayment(
  paymentId: string,
  input: RecordPaymentInput,
  user: AuthUser,
): Promise<Record<string, unknown>> {
  const payment = await FeePayment.findById(paymentId);
  if (!payment) throw ApiError.notFound('That invoice could not be found.');

  const outstanding = payment.amount - payment.paidAmount;
  if (outstanding <= 0) throw ApiError.badRequest('That invoice is already fully paid.');

  const amount = Math.min(input.amount, outstanding);

  payment.receipts.push({
    amount,
    method: input.method,
    reference: input.reference,
    paidOn: input.paidOn,
    recordedBy: user.id,
    note: input.note,
  });

  payment.paidAmount += amount;
  payment.status = payment.paidAmount >= payment.amount ? 'paid' : 'partial';
  payment.paidOn = input.paidOn;
  payment.method = input.method;
  await payment.save();

  return getInvoice(paymentId);
}

/** Reverses the most recent receipt (mistakes happen at the counter). */
export async function undoLastReceipt(paymentId: string): Promise<Record<string, unknown>> {
  const payment = await FeePayment.findById(paymentId);
  if (!payment) throw ApiError.notFound('That invoice could not be found.');
  if (!payment.receipts.length) throw ApiError.badRequest('There is no payment to undo.');

  const receipts = payment.receipts.map((receipt) => ({
    amount: receipt.amount,
    method: receipt.method,
    reference: receipt.reference,
    paidOn: receipt.paidOn,
    recordedBy: receipt.recordedBy,
    note: receipt.note,
  }));
  receipts.pop();

  payment.set('receipts', receipts);
  payment.paidAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  payment.status = payment.paidAmount >= payment.amount ? 'paid' : payment.paidAmount > 0 ? 'partial' : 'unpaid';
  payment.paidOn = receipts.length ? receipts[receipts.length - 1].paidOn : null;
  payment.method = receipts.length ? receipts[receipts.length - 1].method : null;
  await payment.save();

  return getInvoice(paymentId);
}

/* ------------------------------------------------------------------------ PDFs */

export async function invoicePdf(id: string, institutionName: string, currency: string): Promise<Buffer> {
  const invoice = await getInvoice(id);
  const sym = symbol(currency);
  const amount = Number(invoice.amount);
  const paid = Number(invoice.paidAmount);

  const lines = [
    { text: `Invoice number: ${String(invoice.invoiceNo)}`, bold: true, gap: 14 },
    { text: `Student: ${String(invoice.studentName)}${invoice.rollNo ? ` (${String(invoice.rollNo)})` : ''}` },
    { text: `Class: ${String(invoice.className || '—')}` },
    { text: `Fee: ${String(invoice.structureTitle)}` },
    { text: `Due date: ${String(invoice.dueDate)}` },
    { text: '', gap: 10 },
    { text: `Invoice amount: ${money(amount, sym)}` },
    { text: `Received: ${money(paid, sym)}` },
    { text: `Balance due: ${money(amount - paid, sym)}`, bold: true },
    { text: `Status: ${String(invoice.status).toUpperCase()}`, bold: true },
  ];

  const receipts = (invoice.receipts ?? []) as Array<Record<string, unknown>>;
  if (receipts.length) {
    lines.push({ text: '', gap: 14 }, { text: 'Payments received', bold: true });
    for (const receipt of receipts) {
      lines.push({
        text: `${String(receipt.paidOn)} · ${money(Number(receipt.amount), sym)} · ${String(receipt.method)}${
          receipt.reference ? ` · ${String(receipt.reference)}` : ''
        }`,
      });
    }
  }

  lines.push({ text: '', gap: 20 }, { text: 'Generated by EduCore Lite', size: 8 });

  return buildPdf({ title: 'Fee invoice', subtitle: institutionName, lines });
}

export async function receiptPdf(id: string, institutionName: string, currency: string): Promise<Buffer> {
  const invoice = await getInvoice(id);
  const receipts = (invoice.receipts ?? []) as Array<Record<string, unknown>>;
  const receipt = receipts[receipts.length - 1];
  if (!receipt) throw ApiError.badRequest('There is no payment recorded against that invoice yet.');

  const sym = symbol(currency);

  return buildPdf({
    title: 'Payment receipt',
    subtitle: institutionName,
    lines: [
      { text: `Receipt for invoice ${String(invoice.invoiceNo)}`, bold: true, gap: 14 },
      { text: `Student: ${String(invoice.studentName)}${invoice.rollNo ? ` (${String(invoice.rollNo)})` : ''}` },
      { text: `Class: ${String(invoice.className || '—')}` },
      { text: `Fee: ${String(invoice.structureTitle)}` },
      { text: '', gap: 10 },
      { text: `Amount received: ${money(Number(receipt.amount), sym)}`, bold: true, size: 12 },
      { text: `Method: ${String(receipt.method)}` },
      { text: `Reference: ${String(receipt.reference || '—')}` },
      { text: `Paid on: ${String(receipt.paidOn)}` },
      { text: '', gap: 10 },
      { text: `Invoice total: ${money(Number(invoice.amount), sym)}` },
      { text: `Total received: ${money(Number(invoice.paidAmount), sym)}` },
      { text: `Balance: ${money(Number(invoice.amount) - Number(invoice.paidAmount), sym)}`, bold: true },
      { text: '', gap: 20 },
      { text: 'Generated by EduCore Lite', size: 8 },
    ],
  });
}

export { symbol };

/* --------------------------------------------------------------------- summary */

export interface FeeSummary {
  billed: number;
  collected: number;
  outstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  overdues: number;
}

/** Totals for the dashboard and the finance report, always scoped to the caller. */
export async function feeSummary(user: AuthUser): Promise<FeeSummary> {
  const scope = await resolveScope(user);
  const filters = combineFilters(
    scopedFilter(scope, 'studentId', undefined),
    scopedFilter(scope, 'classId', undefined),
  );

  const payments = await FeePayment.find(filters).lean();
  const today = new Date().toISOString().slice(0, 10);

  return {
    billed: payments.reduce((sum, payment) => sum + payment.amount, 0),
    collected: payments.reduce((sum, payment) => sum + payment.paidAmount, 0),
    outstanding: payments.reduce((sum, payment) => sum + Math.max(0, payment.amount - payment.paidAmount), 0),
    paidCount: payments.filter((payment) => payment.status === 'paid').length,
    partialCount: payments.filter((payment) => payment.status === 'partial').length,
    unpaidCount: payments.filter((payment) => payment.status === 'unpaid').length,
    overdues: payments.filter((payment) => payment.status !== 'paid' && payment.dueDate < today).length,
  };
}
