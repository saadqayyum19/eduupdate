import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { institutionRouter } from './routes/institutions.routes';
import { resourcesRouter } from './routes/resources';
import { attendanceRouter } from './routes/attendance.routes';
import { marksRouter } from './routes/marks.routes';
import { feesRouter } from './routes/fees.routes';
import { quizzesRouter } from './routes/quizzes.routes';
import { searchRouter } from './routes/search.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { documentsRouter } from './routes/documents.routes';
import { errorHandler, notFoundHandler } from './middleware/auth';
import { swaggerSpec } from './config/swagger';

/**
 * Express application factory — `createApp()` returns a configured app without
 * listening, so tests can mount it with supertest against an in-memory Mongo.
 */
export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // Basic rate limit on the whole API (auth has its own stricter bucket below).
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, data: null, message: 'Too many requests', error: 'RATE_LIMIT' },
    }),
  );
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, data: null, message: 'Too many attempts', error: 'RATE_LIMIT' },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'up' }, message: 'OK', error: null });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/institutions', institutionRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/marks', marksRouter);
  app.use('/api/v1/fees', feesRouter);
  app.use('/api/v1/quizzes', quizzesRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/documents', documentsRouter);
  app.use('/api/v1', resourcesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
