import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { Institution } from '../../models/Institution';
import { authenticate } from '../../middleware/auth';
import { requireAnyCapability, requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as service from './marks.service';
import { markInputSchema, marksQuerySchema, marksSaveSchema, rankingQuerySchema } from './marks.schema';

const idParam = z.object({ id: z.string().min(8) });

export const marksRouter = Router();

marksRouter.use(authenticate);

marksRouter.get(
  '/',
  requireAnyCapability(['marks.view', 'marks.viewOwn']),
  validate({ query: marksQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.listMarks(req.query as never, req.user!));
  }),
);

/** Save a whole column of the mark-entry sheet in one request. */
marksRouter.put(
  '/',
  requireCapability('marks.enter'),
  validate({ body: marksSaveSchema }),
  asyncHandler(async (req, res) => {
    const items = await service.saveMarks(req.body, req.user!);
    res.json({ items, total: items.length });
  }),
);

marksRouter.post(
  '/',
  requireCapability('marks.enter'),
  validate({ body: markInputSchema }),
  asyncHandler(async (req, res) => {
    const [item] = await service.saveMarks([req.body], req.user!);
    res.status(201).json({ mark: item });
  }),
);

marksRouter.get(
  '/ranking',
  requireAnyCapability(['marks.view', 'marks.viewOwn']),
  validate({ query: rankingQuerySchema }),
  asyncHandler(async (req, res) => {
    const items = await service.classRanking((req.query as { classId: string }).classId);
    res.json({ items, total: items.length });
  }),
);

marksRouter.get(
  '/report-card/:id/pdf',
  requireAnyCapability(['marks.view', 'marks.viewOwn']),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const card = await service.buildReportCard(req.params.id);
    const institution = await Institution.findOne().lean();
    const pdf = await service.reportCardPdf(req.params.id, institution?.name ?? 'Institution');

    const name = `${String(card.student.name ?? 'student').replace(/\s+/g, '-').toLowerCase()}-result-card.pdf`;
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(pdf);
  }),
);

marksRouter.get(
  '/report-card/:id',
  requireAnyCapability(['marks.view', 'marks.viewOwn']),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await service.buildReportCard(req.params.id));
  }),
);

marksRouter.delete('/:id', requireCapability('marks.enter'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  await service.deleteMark(req.params.id);
  res.status(204).send();
}));
