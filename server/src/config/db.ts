import mongoose from 'mongoose';
import { env } from './env';

let connected = false;

export async function connectDb(uri = env.mongoUri): Promise<void> {
  if (connected) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  connected = true;
}

export async function disconnectDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isDbConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}
