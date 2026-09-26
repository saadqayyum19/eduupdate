import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false'])
    .default(fallback ? 'true' : 'false')
    .transform((value) => value === 'true');

/**
 * Environment schema. The process refuses to start when a required value is missing or
 * malformed so misconfiguration is caught at deploy time, never at request time.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_SECURE: bool(false),
  COOKIE_DOMAIN: z.string().optional(),
  BODY_LIMIT: z.string().default('1mb'),

  APP_URL: z.string().default('http://localhost:3000'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('EduCore Lite <no-reply@example.com>'),

  REDIS_URL: z.string().optional(),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(4),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL,

  mongoUri: raw.MONGO_URI,

  jwt: {
    accessSecret: raw.JWT_ACCESS_SECRET,
    refreshSecret: raw.JWT_REFRESH_SECRET,
    accessTtl: raw.ACCESS_TOKEN_TTL,
    refreshTtlDays: raw.REFRESH_TOKEN_TTL_DAYS,
  },

  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookie: {
    secure: raw.COOKIE_SECURE,
    domain: raw.COOKIE_DOMAIN || undefined,
    name: 'educore_rt',
  },

  bodyLimit: raw.BODY_LIMIT,
  appUrl: raw.APP_URL.replace(/\/$/, ''),

  mail: {
    host: raw.SMTP_HOST ?? '',
    port: raw.SMTP_PORT,
    secure: raw.SMTP_SECURE,
    user: raw.SMTP_USER ?? '',
    pass: raw.SMTP_PASS ?? '',
    from: raw.MAIL_FROM,
  },

  redisUrl: raw.REDIS_URL ?? '',
  uploadDir: raw.UPLOAD_DIR,
  maxUploadMb: raw.MAX_UPLOAD_MB,
} as const;

export type Env = typeof env;
