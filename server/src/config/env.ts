import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/educore'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL ?? '',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 4),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'no-reply@educore.local',
  },
} as const;
