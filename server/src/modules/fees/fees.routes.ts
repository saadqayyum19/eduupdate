import { Router, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { Institution } from '../../models/Institution';
import { findSettings } from '../../lib/settings';
import { authenticate } from '../../middleware/auth';
import { requireAnyCapability, requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as service from './fees.service';
import {
  feeQuerySchema,
  feeStructureSchema,
  feeStructureUpdateSchema,
  recordPaymentSchema,
  structureQuerySchema,
} from './fees.schema';

const idParam = z.object({ id: z.string().min(8) });

async function documentContext() {
  const [institution, settings] = await Promise.all([Institution.findOne().lean(), findSettings()]);
  return { institutionName: institution?.name ?? 'Institution', currency: settings.currency };
}

function sendPdf(res: Response, buffer: Buffer, filename: string): void {
  res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export const feesRouter = Router();

feesRouter.use(authenticate);
feesRouter.use(requireAnyCapability(['fees.view', 'fees.viewOwn']));

/* Structures */
feesRouter.get('/structures', validate({ query: structureQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.listStructures(req.query as never));
}));

feesRouter.post(
  '/structures',
  requireCapability('fees.manage'),
  validate({ body: feeStructureSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ structure: await service.createStructure(req.body) });
  }),
);

feesRouter.patch(
  '/structures/:id',
  requireCapability('fees.manage'),
  validate({ params: idParam, body: feeStructureUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ structure: await service.updateStructure(req.params.id, req.body) });
  }),
);

feesRouter.delete('/structures/:id', requireCapability('fees.manage'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  await service.deleteStructure(req.params.id);
  res.status(204).send();
}));

/* Invoice list + detail */
feesRouter.get('/payments', validate({ query: feeQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.listInvoices(req.query as never, req.user!));
}));

feesRouter.get('/invoices', validate({ query: feeQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.listInvoices(req.query as never, req.user!));
}));

feesRouter.get('/invoices/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json({ invoice: await service.getInvoice(req.params.id) });
}));

feesRouter.get('/summary', asyncHandler(async (req, res) => {
  res.json(await service.feeSummary(req.user!));
}));

/* Payments */
feesRouter.post(
  '/payments/:id/receipts',
  requireCapability('fees.manage'),
  validate({ params: idParam, body: recordPaymentSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ invoice: await service.recordPayment(req.params.id, req.body, req.user!) });
  }),
);

feesRouter.delete(
  '/payments/:id/receipts/last',
  requireCapability('fees.manage'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ invoice: await service.undoLastReceipt(req.params.id) });
  }),
);

/* PDFs */
feesRouter.get('/invoices/:id/pdf', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const { institutionName, currency } = await documentContext();
  const invoice = await service.getInvoice(req.params.id);
  sendPdf(res, await service.invoicePdf(req.params.id, institutionName, currency), `${invoice.invoiceNo}.pdf`);
}));

feesRouter.get('/payments/:id/receipt.pdf', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const { institutionName, currency } = await documentContext();
  sendPdf(res, await service.receiptPdf(req.params.id, institutionName, currency), `receipt-${req.params.id}.pdf`);
}));
