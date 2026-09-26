import mongoose from 'mongoose';
import { logger } from './logger';

/**
 * MongoDB connection.
 *
 * The database is expected to be EMPTY on a fresh install: no collections are seeded,
 * no indexes create data. The one-time setup wizard writes the first documents.
 */
export async function connectDb(uri: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (error) => logger.error({ err: error }, 'MongoDB error'));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
    maxPoolSize: 20,
    autoIndex: true,
  });

  // Drop the username index definition mismatch guard: only build what is declared.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.connection.close(false);
}

export function dbState(): 'connected' | 'connecting' | 'disconnected' | 'unknown' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 0:
      return 'disconnected';
    default:
      return 'unknown';
  }
}
