import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../lib/ApiError';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
  instance?: string;
  requestId?: string;
}

/** RFC 7807 responses for everything, including errors thrown by third-party code. */
function sendProblem(res: Response, req: Request, body: ProblemBody): void {
  res
    .status(body.status)
    .type('application/problem+json')
    .json({ ...body, instance: req.originalUrl, requestId: req.requestId });
}

export function notFoundHandler(req: Request, res: Response): void {
  sendProblem(res, req, {
    type: 'https://educore.app/problems/not-found',
    title: 'Endpoint not found',
    status: 404,
    detail: `No route matches ${req.method} ${req.originalUrl}.`,
    code: 'not_found',
  });
}

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    sendProblem(res, req, {
      type: `https://educore.app/problems/${error.code ?? 'error'}`,
      title: error.title,
      status: error.status,
      detail: error.detail,
      code: error.code,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'request';
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    sendProblem(res, req, {
      type: 'https://educore.app/problems/validation-error',
      title: 'Validation failed',
      status: 422,
      detail: 'Please check the highlighted fields.',
      code: 'validation_error',
      errors,
    });
    return;
  }

  const mongoError = error as MongoError;

  if (mongoError?.name === 'ValidationError' && mongoError.errors) {
    const errors: Record<string, string[]> = {};
    for (const [field, detail] of Object.entries(mongoError.errors)) {
      errors[field] = [detail.message];
    }
    sendProblem(res, req, {
      type: 'https://educore.app/problems/validation-error',
      title: 'Validation failed',
      status: 422,
      detail: 'The record could not be saved because some values are invalid.',
      code: 'validation_error',
      errors,
    });
    return;
  }

  if (mongoError?.code === 11000) {
    const field = Object.keys(mongoError.keyValue ?? {})[0] ?? 'record';
    sendProblem(res, req, {
      type: 'https://educore.app/problems/duplicate',
      title: 'Already exists',
      status: 409,
      detail: `A record with that ${field} already exists.`,
      code: 'duplicate_key',
    });
    return;
  }

  if (mongoError?.name === 'CastError') {
    sendProblem(res, req, {
      type: 'https://educore.app/problems/invalid-identifier',
      title: 'Bad request',
      status: 400,
      detail: 'That identifier is not valid.',
      code: 'invalid_identifier',
    });
    return;
  }

  logger.error({ err: error, requestId: req.requestId, url: req.originalUrl }, 'Unhandled request error');

  sendProblem(res, req, {
    type: 'https://educore.app/problems/internal-error',
    title: 'Internal server error',
    status: 500,
    detail: env.isProduction
      ? 'Something went wrong on our side. Please try again.'
      : error instanceof Error
        ? error.message
        : 'Unknown error',
    code: 'internal_error',
  });
}
