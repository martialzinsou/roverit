import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { newId, nowIso, type Machine, type SyncPayload, type WorkOrder } from '@roverit/shared';
import { authenticate, httpError, requireRole } from '../lib/auth.js';
import { broadcast } from '../lib/events.js';

/**
 * Routes de synchronisation hors-ligne : poussée (upsert machines/OT)
 * et récupération incrémentale des modifications depuis une date.
 */
export function syncRoutes(db: Database.Database) {
  return async function (app: FastifyInstance): Promise<void> {
    app.post(
      '/sync',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const body = req.body as SyncPayload;
        const upsertMachine = db.prepare(`
          INSERT INTO machines (id, name, client, serial, manufacturer, model, cpu, ram_gb, storage_tb, gpu, status, created_at, updated_at)
          VALUES (@id, @name, @client, @serial, @manufacturer, @model, @cpu, @ram_gb, @storage_tb, @gpu, @status, @created_at, @updated_at)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, client=excluded.client, serial=excluded.serial,
            manufacturer=excluded.manufacturer, model=excluded.model, cpu=excluded.cpu,
            ram_gb=excluded.ram_gb, storage_tb=excluded.storage_tb, gpu=excluded.gpu,
            status=excluded.status, updated_at=excluded.updated_at
        `);
        const upsertOrder = db.prepare(`
          INSERT INTO work_orders (id, machine_id, title, priority, status, assignee, created_at, updated_at)
          VALUES (@id, @machine_id, @title, @priority, @status, @assignee, @created_at, @updated_at)
          ON CONFLICT(id) DO UPDATE SET
            title=excluded.title, priority=excluded.priority, status=excluded.status,
            assignee=excluded.assignee, updated_at=excluded.updated_at
        `);
        let machines = 0;
        let work_orders = 0;
        for (const m of body.machines ?? []) {
          upsertMachine.run(m as Machine);
          machines++;
        }
        for (const wo of body.work_orders ?? []) {
          upsertOrder.run(wo as WorkOrder);
          work_orders++;
        }
        broadcast('sync', { action: 'push', machines, work_orders });
        return { ok: true, machines, work_orders };
      },
    );

    app.get('/sync/changes', { preHandler: authenticate }, async (req) => {
      const { since } = req.query as { since?: string };
      if (!since || !/^\d{4}-\d{2}-\d{2}T/.test(since)) {
        throw httpError(400, 'Paramètre since (ISO) manquant');
      }
      const machines = db
        .prepare('SELECT * FROM machines WHERE updated_at > ? ORDER BY updated_at')
        .all(since) as Machine[];
      const work_orders = db
        .prepare('SELECT * FROM work_orders WHERE updated_at > ? ORDER BY updated_at')
        .all(since) as WorkOrder[];
      return { machines, work_orders, server_time: nowIso() };
    });
  };
}