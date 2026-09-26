import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { User } from './models/User';

/**
 * Process entry point: connect to Mongo, start listening, then shut down cleanly on
 * SIGTERM / SIGINT so `docker compose down` never leaves a half-open connection behind.
 */
async function main(): Promise<void> {
  const app = createApp();
  const server: Server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'EduCore Lite API listening');
  });

  try {
    await connectDb(env.mongoUri);

    const userCount = await User.estimatedDocumentCount();
    if (userCount === 0) {
      logger.warn('Fresh install — setup required. Open the web app to create the institution and first administrator.');
    } else {
      logger.info({ accounts: userCount }, 'Existing installation loaded');
    }
  } catch (error) {
    logger.fatal({ err: error }, 'Could not connect to MongoDB — exiting');
    server.close(() => process.exit(1));
    return;
  }

  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    server.close(() => {
      void disconnectDb()
        .then(() => {
          logger.info('Shutdown complete');
          process.exit(0);
        })
        .catch((error) => {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        });
    });

    // Never hang forever on open keep-alive connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Unhandled promise rejection'));
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

void main();
