import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { FeeStructure, FeeInvoice } from '../models/Fee';
import { ClassRoom } from '../models/ClassRoom';
import { User } from '../models/User';
import { ok, created, paginate } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import { protect, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';
import { logAudit } from '../services/audit';

export const feesRouter = Router();
feesRouter.use(protect, requireCapability('fees.view'), requireFeature('fees'));

function tenantFilter(req: Request): Record<string, unknown> {
  if (req.auth!.role === 'super_admin') {
    return req.query.institutionId ? { institutionId: String(req.query.institutionId) } : {};
  }
  return { institutionId: req.auth!.inst };
}

const structureSchema = z.object({
  body: z.object({
    classId: z.string().min(1),
    title: z.string().min(2),
    amount: z.number().min(0),
    frequency: z.enum(['monthly', 'termly', 'yearly', 'one-time']),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const paymentSchema = z.object({
  body: z.object({
    amount: z.number().min(0),
    method: z.enum(['cash', 'card', 'bank', 'upi', 'cheque']),
  }),
});

/** Next free invoice number — derived from existing docs so numbers never repeat. */
async function nextInvoiceNumber(): Promise<string> {
  const last = await FeeInvoice.findOne({}).sort({ invoiceNo: -1 }).select('invoiceNo').lean();
  const current = Number(/^INV-(\d+)$/.exec(last?.invoiceNo ?? '')?.[1] ?? 1000);
  return `INV-${current + 1}`;
}

/** GET /api/v1/fees/structures — list fee heads (filter: classId). */
feesRouter.get('/structures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const filter: Record<string, unknown> = tenantFilter(req);
    if (req.query.classId) filter.classId = req.query.classId;
    const [items, total] = await Promise.all([
      FeeStructure.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      FeeStructure.countDocuments(filter),
    ]);
    ok(res, paginate(items, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/fees/structures — create a fee head and raise one invoice
 * per student in the class (fees.manage capability).
 */
feesRouter.post(
  '/structures',
  requireCapability('fees.manage'),
  validate(structureSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof structureSchema>['body'];
      const classRoom = await ClassRoom.findOne({ _id: body.classId, ...tenantFilter(req) }).lean();
      if (!classRoom) throw ApiError.notFound('Class not found in this institution');
      const institutionId = classRoom.institutionId;
      const structure = await FeeStructure.create({ ...body, institutionId });

      const students = await User.find({ classId: body.classId, institutionId, role: 'student' }).lean();
      const invoices: Array<Record<string, unknown>> = [];
      for (const student of students) {
        invoices.push({
          invoiceNo: await nextInvoiceNumber(),
          studentId: student._id,
          structureId: structure._id,
          institutionId,
          amount: structure.amount,
          paidAmount: 0,
          status: 'unpaid',
          dueDate: structure.dueDate,
          paidOn: null,
        });
      }
      if (invoices.length) await FeeInvoice.insertMany(invoices);

      await logAudit({
        institutionId: institutionId ? String(institutionId) : null,
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        action: 'fee.structure.create',
        entity: 'FeeStructure',
        entityId: String(structure._id),
        detail: `${body.title} (${body.amount}) → ${invoices.length} invoices`,
        ip: req.ip ?? '',
      });
      created(res, { structure, invoicesRaised: invoices.length }, 'Fee structure created');
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/v1/fees/invoices — list invoices (students/parents see their own). */
feesRouter.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const filter: Record<string, unknown> = tenantFilter(req);
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const role = req.auth!.role;
    if (role === 'student') filter.studentId = req.auth!.sub;
    else if (role === 'parent') {
      const parent = await User.findById(req.auth!.sub).lean();
      filter.studentId = { $in: (parent?.childIds ?? []).map(String) };
    } else if (req.query.studentId) {
      filter.studentId = req.query.studentId;
    }

    const [items, total] = await Promise.all([
      FeeInvoice.find(filter).sort({ dueDate: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      FeeInvoice.countDocuments(filter),
    ]);
    ok(res, paginate(items, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

/** POST /api/v1/fees/invoices/:id/pay — record a payment (fees.manage). */
feesRouter.post(
  '/invoices/:id/pay',
  requireCapability('fees.manage'),
  validate(paymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, method } = req.body as z.infer<typeof paymentSchema>['body'];
      const invoice = await FeeInvoice.findOne({ _id: req.params.id, ...tenantFilter(req) });
      if (!invoice) throw ApiError.notFound('Invoice not found');
      if (amount <= 0) throw ApiError.badRequest('Amount must be positive');

      invoice.paidAmount = Math.min(invoice.amount, invoice.paidAmount + amount);
      invoice.status = invoice.paidAmount >= invoice.amount ? 'paid' : 'partial';
      invoice.method = method;
      if (invoice.status === 'paid') {
        invoice.paidOn = new Date().toISOString().slice(0, 10);
        if (!invoice.receiptNo) {
          invoice.receiptNo = `RCPT-${Date.now().toString(36).toUpperCase()}`;
        }
      }
      await invoice.save();

      await logAudit({
        institutionId: req.auth!.inst ?? null,
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        action: 'fee.payment',
        entity: 'FeeInvoice',
        entityId: String(invoice._id),
        detail: `${method} ${amount} → ${invoice.status}`,
        ip: req.ip ?? '',
      });
      ok(res, invoice, 'Payment recorded');
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/v1/fees/structures/:id — removes the head and its invoices. */
feesRouter.delete(
  '/structures/:id',
  requireCapability('fees.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const structure = await FeeStructure.findOneAndDelete(filter);
      if (!structure) throw ApiError.notFound('Fee structure not found');
      await FeeInvoice.deleteMany({ structureId: req.params.id, ...tenantFilter(req) });
      ok(res, { id: req.params.id }, 'Fee structure deleted');
    } catch (error) {
      next(error);
    }
  },
);

