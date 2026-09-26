import express from 'express';
import pinoHttp from 'pino-http';
import { dbState } from './config/db';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import {
  compressionMiddleware,
  cookieMiddleware,
  corsMiddleware,
  helmetMiddleware,
  hppMiddleware,
  jsonBody,
  mongoSanitizeMiddleware,
  requestId,
  sanitiseInput,
} from './middleware/security';
import { mountApi } from './routes';

/**
 * Express application factory.
 *
 * Middleware order matters: correlation id → security headers → CORS → compression → body
 * parsing → input sanitising → routes → 404 → RFC 7807 error handler.
 */
export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.requestId ?? '', autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compressionMiddleware);

  app.use(jsonBody);
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieMiddleware);

  app.use(sanitiseInput);
  app.use(mongoSanitizeMiddleware);
  app.use(hppMiddleware);

  /** Liveness + readiness probe used by Docker and monitoring. */
  app.get('/api/health', (_req, res) => {
    const db = dbState();
    res.status(db === 'connected' ? 200 : 503).json({
      status: db === 'connected' ? 'ok' : 'degraded',
      db,
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
    });
  });

  mountApi(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
