import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { verifyAccessToken } from './services/tokens';

/**
 * Server entry: connect MongoDB, boot Express on :5000, attach Socket.io for
 * chat + real-time notifications (JWT handshake auth).
 */
async function main(): Promise<void> {
  await connectDb();

  const app = createApp();
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  // Handshake auth — reject sockets without a valid access token.
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.cookie ?? '')
        .split('; ')
        .find((part) => part.startsWith('access_token='))
        ?.slice('access_token='.length);
    if (!token) return next(new Error('UNAUTHORIZED'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string; role: string; inst: string | null };
    // Personal room for direct notifications + institution room for broadcasts.
    socket.join(`user:${user.sub}`);
    if (user.inst) socket.join(`inst:${user.inst}`);

    socket.on('chat:send', (message: { to: string; text: string }) => {
      if (!message?.text?.trim()) return;
      io.to(`user:${message.to}`).emit('chat:message', {
        from: user.sub,
        text: message.text.slice(0, 2000),
        at: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      // rooms auto-leave on disconnect
    });
  });

  httpServer.listen(env.port, () => {
    console.log(`EduCore API listening on http://localhost:${env.port}`);
    console.log(`Swagger docs  → http://localhost:${env.port}/api/docs`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
