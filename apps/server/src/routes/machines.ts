/**
 * Routes de gestion de l'inventaire matériel et du cycle de vie des machines :
 * CRUD, ajout/suppression de composants et fiches détaillées.
 * Auteur : Martial Zinsou
 */
import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import {
  LIFECYCLE_STATUSES,
  newId,
  nowIso,
  type BenchmarkRun,
  type Component,
  type LifecycleStatus,
  type Machine,
  type MachineDetail,
  type ComponentKind,
  type WorkOrder,
} from '@roverit/shared';
import { authenticate, httpError, requireRole } from '../lib/auth.js';
import { broadcast } from '../lib/events.js';

function isUuid(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-fA-F-]{36}$/.test(value);
}

const CREATE_FIELDS = [
  'name',
  'client',
  'serial',
  'manufacturer',
  'model',
  'cpu',
  'ram_gb',
  'storage_tb',
  'gpu',
] as const;

/**
 * Routes de gestion des machines : CRUD complet, consultation du détail
 * (composants, benchmarks, OT) et ajout de composants.
 */
export function machinesRoutes(db: Database.Database) {
  const logAudit = (
    userId: string,
    entity: string,
    entityId: string,
    action: string,
    payload?: unknown,
  ) => {
    db.prepare(
      'INSERT INTO audit_events (id, entity, entity_id, action, user_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(newId(), entity, entityId, action, userId, JSON.stringify(payload ?? null), nowIso());
  };

  const toMachine = (row: unknown): Machine => row as Machine;

  return async function (app: FastifyInstance): Promise<void> {
    app.get('/machines', { preHandler: authenticate }, async (req) => {
      const { status } = req.query as { status?: LifecycleStatus };
      const base =
        'SELECT * FROM machines' + (status ? ' WHERE status = ?' : '') + ' ORDER BY updated_at DESC';
      const rows = status ? db.prepare(base).all(status) : db.prepare(base).all();
      return rows.map(toMachine);
    });

    app.post(
      '/machines',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const userId = req.user?.userId ?? '';
        const body = req.body as Partial<Machine>;
        if (!body.name?.trim()) throw httpError(400, 'Nom de machine requis');
        const id: string = isUuid(body.id) ? String(body.id) : newId();
        const ts = nowIso();
        const machine: Machine = {
          id,
          name: body.name.trim(),
          client: body.client ?? null,
          serial: body.serial ?? null,
          manufacturer: body.manufacturer ?? null,
          model: body.model ?? null,
          cpu: body.cpu ?? null,
          ram_gb: body.ram_gb ?? null,
          storage_tb: body.storage_tb ?? null,
          gpu: body.gpu ?? null,
          status: LIFECYCLE_STATUSES.includes(body.status as LifecycleStatus)
            ? (body.status as LifecycleStatus)
            : 'en_attente_diagnostic',
          created_at: ts,
          updated_at: ts,
        };
        db.prepare(
          `INSERT INTO machines (id, name, client, serial, manufacturer, model, cpu, ram_gb, storage_tb, gpu, status, created_at, updated_at)
           VALUES (@id, @name, @client, @serial, @manufacturer, @model, @cpu, @ram_gb, @storage_tb, @gpu, @status, @created_at, @updated_at)`,
        ).run(machine);
        logAudit(userId, 'machine', id, 'create', machine);
        broadcast('machines', { action: 'create', machine });
        reply.code(201);
        return machine;
      },
    );

    app.get('/machines/:id', { preHandler: authenticate }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(id);
      if (!machine) {
        reply.code(404).send({ error: 'Machine introuvable' });
        return;
      }
      const components = db
        .prepare('SELECT * FROM components WHERE machine_id = ? ORDER BY installed_at DESC')
        .all(id) as Component[];
      const benchmarks = db
        .prepare(
          'SELECT * FROM benchmark_runs WHERE machine_id = ? ORDER BY started_at DESC',
        )
        .all(id) as BenchmarkRun[];
      const work_orders = db
        .prepare('SELECT * FROM work_orders WHERE machine_id = ? ORDER BY created_at DESC')
        .all(id) as WorkOrder[];
      const detail: MachineDetail = {
        ...(machine as Machine),
        components,
        benchmarks: benchmarks,
        work_orders,
      };
      return detail;
    });

    app.patch(
      '/machines/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const userId = req.user?.userId ?? '';
        const { id } = req.params as { id: string };
        const body = req.body as Partial<Machine>;
        const existing = db.prepare('SELECT * FROM machines WHERE id = ?').get(id) as
          | Machine
          | undefined;
        if (!existing) {
          reply.code(404).send({ error: 'Machine introuvable' });
          return;
        }
        const merged: Machine = { ...existing, ...body, id };
        const record = merged as unknown as Record<string, unknown>;
        for (const f of CREATE_FIELDS) {
          if (record[f] === undefined) record[f] = null;
        }
        if (!LIFECYCLE_STATUSES.includes(merged.status as LifecycleStatus)) {
          throw httpError(400, 'Statut de cycle de vie invalide');
        }
        merged.updated_at = nowIso();
        db.prepare(
          `UPDATE machines SET client=@client, serial=@serial, manufacturer=@manufacturer,
            model=@model, cpu=@cpu, ram_gb=@ram_gb, storage_tb=@storage_tb, gpu=@gpu,
            status=@status, updated_at=@updated_at WHERE id=@id`,
        ).run(merged);
        logAudit(userId, 'machine', id, 'update', merged);
        broadcast('machines', { action: 'update', machine: merged });
        return merged;
      },
    );

    app.delete(
      '/machines/:id',
      { preHandler: [authenticate, requireRole('admin')] },
      async (req, reply) => {
        const userId = req.user?.userId ?? '';
        const { id } = req.params as { id: string };
        const info = db.prepare('DELETE FROM machines WHERE id = ?').run(id);
        if (info.changes === 0) {
          reply.code(404).send({ error: 'Machine introuvable' });
          return;
        }
        logAudit(userId, 'machine', id, 'delete', null);
        broadcast('machines', { action: 'delete', id });
        return { ok: true };
      },
    );

    app.get('/machines/:id/components', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      return db
        .prepare('SELECT * FROM components WHERE machine_id = ? ORDER BY installed_at DESC')
        .all(id);
    });

    app.post(
      '/machines/:id/components',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const userId = req.user?.userId ?? '';
        const { id } = req.params as { id: string };
        const body = req.body as Partial<Component>;
        if (!db.prepare('SELECT id FROM machines WHERE id = ?').get(id)) {
          reply.code(404).send({ error: 'Machine introuvable' });
          return;
        }
        if (!body.kind || !body.name?.trim()) {
          throw httpError(400, 'Type et nom du composant requis');
        }
        const component: Component = {
          id: newId(),
          machine_id: id,
          kind: body.kind as ComponentKind,
          name: body.name.trim(),
          model: body.model ?? null,
          health: body.health ?? null,
          notes: body.notes ?? null,
          installed_at: body.installed_at ?? nowIso(),
        };
        db.prepare(
          'INSERT INTO components (id, machine_id, kind, name, model, health, notes, installed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(component.id, id, component.kind, component.name, component.model, component.health, component.notes, component.installed_at);
        db.prepare('UPDATE machines SET updated_at = ? WHERE id = ?').run(nowIso(), id);
        logAudit(userId, 'component', component.id, 'create', component);
        broadcast('components', { action: 'create', component, machine_id: id });
        return component;
      },
    );
  };
}