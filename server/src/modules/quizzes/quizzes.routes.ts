import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { listQuerySchema } from '../../lib/pagination';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as service from './quizzes.service';
import { attemptSchema, quizQuerySchema, quizSchema, quizUpdateSchema, submissionMarkSchema } from './quizzes.schema';

const idParam = z.object({ id: z.string().min(8) });
const submissionParam = z.object({ id: z.string().min(8) });

export const quizzesRouter = Router();

quizzesRouter.use(authenticate);

quizzesRouter.get('/', requireCapability('quizzes.view'), validate({ query: quizQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.listQuizzes(req.query as never, req.user!));
}));

quizzesRouter.post('/', requireCapability('quizzes.manage'), validate({ body: quizSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ quiz: await service.createQuiz(req.body, req.user!) });
}));

// Submission routes are declared before `/:id` so "submissions" is not read as an id.
quizzesRouter.patch(
  '/submissions/:id',
  requireCapability('quizzes.mark'),
  validate({ params: submissionParam, body: submissionMarkSchema }),
  asyncHandler(async (req, res) => {
    res.json({ submission: await service.markSubmission(req.params.id, req.body.score, req.body.feedback, req.user!) });
  }),
);

quizzesRouter.get('/:id', requireCapability('quizzes.view'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json({ quiz: await service.getQuiz(req.params.id) });
}));

quizzesRouter.patch(
  '/:id',
  requireCapability('quizzes.manage'),
  validate({ params: idParam, body: quizUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ quiz: await service.updateQuiz(req.params.id, req.body, req.user!) });
  }),
);

quizzesRouter.delete('/:id', requireCapability('quizzes.manage'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  await service.deleteQuiz(req.params.id);
  res.status(204).send();
}));

quizzesRouter.post(
  '/:id/attempt',
  requireCapability('quizzes.attempt'),
  validate({ params: idParam, body: attemptSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ submission: await service.submitAttempt(req.params.id, req.body, req.user!) });
  }),
);

quizzesRouter.get(
  '/:id/submissions',
  requireCapability('quizzes.mark'),
  validate({ params: idParam, query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.listSubmissions(req.params.id, req.query as never));
  }),
);
