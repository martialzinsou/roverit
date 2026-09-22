import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import websocket from '@fastify/websocket';
import fs from 'node:fs';
import type Database from 'better-sqlite3';
import { createDb } from './db.js';
import { config } from './config.js';
import { addSocket, broadcast, socketCount } from './lib/events.js';
import { authRoutes } from './routes/auth.js';
import { machinesRoutes } from './routes/machines.js';
import { partsRoutes } from './routes/parts.js';
import { benchmarkRoutes } from './routes/benchmarks.js';
import { workOrderRoutes } from './routes/workorders.js';
import { reportRoutes } from './routes/reports.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { syncRoutes } from './routes/sync.js';

/**
 * Options de construction de l'application : emplacement de la base SQLite,
 * répertoire du frontend à servir et configuration du logger Fastify.
 */
export interface BuildOptions {
  dbPath?: string;
  publicDir?: string;
  logger?: boolean | Record<string, unknown>;
}

/**
 * Construit et configure l'application Fastify : plugins, routes API,
 * WebSocket temps réel, statique et gestion des erreurs.
 */
export async function buildApp(
  opts: BuildOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });
  const db: Database.Database = createDb(opts.dbPath ?? ':memory:');

  if (!process.env.ROVERIT_NO_WS) {
    await app.register(websocket);
  }

  await app.register(authRoutes(db), { prefix: '/api/v1' });
  await app.register(machinesRoutes(db), { prefix: '/api/v1' });
  await app.register(partsRoutes(db), { prefix: '/api/v1' });
  await app.register(benchmarkRoutes(db), { prefix: '/api/v1' });
  await app.register(workOrderRoutes(db), { prefix: '/api/v1' });
  await app.register(reportRoutes(db), { prefix: '/api/v1' });
  await app.register(dashboardRoutes(db), { prefix: '/api/v1' });
  await app.register(syncRoutes(db), { prefix: '/api/v1' });

  app.get('/health', async () => ({
    ok: true,
    ts: new Date().toISOString(),
    sockets: socketCount(),
  }));

  app.get('/api/v1/health', async () => ({ ok: true, version: '0.1.0' }));

  if (!process.env.ROVERIT_NO_WS) {
    app.get(
      '/ws',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { websocket: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket: any) => {
        addSocket(socket);
        socket.send(
          JSON.stringify({
            event: 'hello',
            payload: { server_time: new Date().toISOString() },
            ts: new Date().toISOString(),
          }),
        );
        socket.on('message', (raw: unknown) => {
          try {
            const data = JSON.parse(String(raw));
            if (data?.event === 'ping') {
              socket.send(
                JSON.stringify({ event: 'pong', payload: data, ts: new Date().toISOString() }),
              );
            }
          } catch {
            /* message non JSON ignoré */
          }
        });
      },
    );
  }

  const publicDir = opts.publicDir ?? config.publicDir;
  const hasFrontend = fs.existsSync(publicDir);
  if (hasFrontend) {
    await app.register(staticPlugin, { root: publicDir });
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
      reply.code(404).send({ error: 'Ressource introuvable' });
      return;
    }
    if (hasFrontend) {
      reply.sendFile('index.html');
      return;
    }
    reply.code(404).send({
      error: 'Frontend non compilé — lancez npm run build -w @roverit/web',
    });
  });

  return app;
}

export { broadcast };