import pino from 'pino';
import { env } from './env';

/** One structured logger for the whole API. Secrets and tokens are always redacted. */
export const logger = pino({
  level: env.logLevel,
  base: { service: 'educore-lite-api', env: env.nodeEnv },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'newPassword',
      'currentPassword',
      'adminPassword',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[redacted]',
  },
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino/file',
        options: { destination: 1 },
      },
});
