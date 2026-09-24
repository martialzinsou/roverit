/**
 * Routes de gestion des ordres de travail et interventions atelier :
 * suivi des étapes de reconditionnement, checklists et clôture d'OT.
 * Auteur : Martial Zinsou
 */
import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { newId, nowIso, type ChecklistItem, type Intervention, type WorkOrder } from '@roverit/shared';
import { authenticate, httpError, requireRole } from '../lib/auth.js';
import { broadcast } from '../lib/events.js';

const DEFAULT_CHECKLIST = [
  'Nettoyage / dépoussiérage complet',
  'Remplacement pâte thermique',
  'Vérification ventilateurs et RPM',
  'Vérification de la connectique',
  'Test de stabilité 10 minutes',
  'Flashage / mise à jour firmware si nécessaire',
];

/**
 * Routes de gestion des ordres de travail : CRUD, interventions,
 * checklist et mise à jour du statut (jusqu'à la clôture).
 */
export function workOrderRoutes(db: Database.Database) {
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

  return async function (app: FastifyInstance): Promise<void> {
    app.get('/work-orders', { preHandler: authenticate }, async (req) => {
      const { machine_id, status } = req.query as { machine_id?: string; status?: string };
      const clauses: string[] = [];
      const params: string[] = [];
      if (machine_id) {
        clauses.push('machine_id = ?');
        params.push(machine_id);
      }
      if (status) {
        clauses.push('status = ?');
        params.push(status);
      }
      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const rows = db
        .prepare(
          `SELECT wo.*, m.name AS machine_name FROM work_orders wo
           JOIN machines m ON m.id = wo.machine_id${where}
           ORDER BY wo.created_at DESC`,
        )
        .all(...params);
      return rows;
    });

    app.post(
      '/work-orders',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const userId = req.user?.userId ?? '';
        const body = req.body as Partial<WorkOrder> & { machine_id: string };
        if (!body.machine_id) throw httpError(400, 'machine_id requis');
        if (!body.title?.trim()) throw httpError(400, 'Titre d\'OT requis');
        if (!db.prepare('SELECT id FROM machines WHERE id = ?').get(body.machine_id)) {
          throw httpError(404, 'Machine introuvable');
        }
        const ts = nowIso();
        const wo: WorkOrder = {
          id: /^[0-9a-fA-F-]{36}$/.test(body.id ?? '') ? (body.id as string) : newId(),
          machine_id: body.machine_id,
          title: body.title.trim(),
          priority: body.priority ?? 'normale',
          status: body.status ?? 'ouverte',
          assignee: body.assignee ?? null,
          created_at: ts,
          updated_at: ts,
        };
        db.prepare(
          'INSERT INTO work_orders (id, machine_id, title, priority, status, assignee, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(wo.id, wo.machine_id, wo.title, wo.priority, wo.status, wo.assignee, wo.created_at, wo.updated_at);
        const insertItem = db.prepare(
          'INSERT INTO checklist_items (id, work_order_id, label, done) VALUES (?, ?, ?, 0)',
        );
        const checklist: { id: string; label: string; done: boolean }[] = [];
        for (const label of DEFAULT_CHECKLIST) {
          const itemId = newId();
          insertItem.run(itemId, wo.id, label);
          checklist.push({ id: itemId, label, done: false });
        }
        db.prepare('UPDATE machines SET status = \'en_cours_upgrade\', updated_at = ? WHERE id = ?').run(ts, wo.machine_id);
        logAudit(userId, 'work_order', wo.id, 'create', wo);
        broadcast('work_orders', { action: 'create', work_order: wo });
        return { ...wo, checklist };
      },
    );

    app.get('/work-orders/:id', { preHandler: authenticate }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const wo = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as
        | WorkOrder
        | undefined;
      if (!wo) {
        reply.code(404).send({ error: 'OT introuvable' });
        return;
      }
      const interventions = db
        .prepare(
          `SELECT i.*, u.username AS user_name FROM interventions i
           JOIN users u ON u.id = i.user_id
           WHERE i.work_order_id = ? ORDER BY i.created_at DESC`,
        )
        .all(id) as (Intervention & { user_name?: string })[];
      const checkRows = db
        .prepare(
          'SELECT id, work_order_id, label, done FROM checklist_items WHERE work_order_id = ? ORDER BY rowid',
        )
        .all(id) as Array<{ id: string; work_order_id: string; label: string; done: number }>;
      const checklist: ChecklistItem[] = checkRows.map((c) => ({
        id: c.id,
        work_order_id: c.work_order_id,
        label: c.label,
        done: c.done === 1,
      }));
      const machine = db
        .prepare('SELECT name FROM machines WHERE id = ?')
        .get(wo.machine_id) as { name: string };
      return { ...wo, machine_name: machine.name, interventions, checklist };
    });

    app.patch(
      '/work-orders/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const userId = req.user?.userId ?? '';
        const { id } = req.params as { id: string };
        const body = req.body as Partial<WorkOrder>;
        const existing = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as
          | WorkOrder
          | undefined;
        if (!existing) {
          reply.code(404).send({ error: 'OT introuvable' });
          return;
        }
        const merged: WorkOrder = { ...existing, ...body, id, updated_at: nowIso() };
        db.prepare(
          'UPDATE work_orders SET title=?, priority=?, status=?, assignee=?, updated_at=? WHERE id=?',
        ).run(merged.title, merged.priority, merged.status, merged.assignee, merged.updated_at, id);

        if (merged.status === 'terminee') {
          db.prepare('UPDATE machines SET status = \'pret_deploiement\', updated_at = ? WHERE id = ?').run(nowIso(), merged.machine_id);
        }
        logAudit(userId, 'work_order', id, 'update', merged);
        broadcast('work_orders', { action: 'update', work_order: merged });
        return merged;
      },
    );

    app.post(
      '/work-orders/:id/interventions',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const userId = req.user?.userId ?? '';
        const { id } = req.params as { id: string };
        const body = req.body as Partial<Intervention> & { action?: string };
        if (!body.action?.trim()) throw httpError(400, 'Action requise');
        const wo = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as
          | WorkOrder
          | undefined;
        if (!wo) {
          reply.code(404).send({ error: 'OT introuvable' });
          return;
        }
        const intervention: Intervention = {
          id: newId(),
          work_order_id: id,
          user_id: userId,
          action: body.action.trim(),
          part_ids: Array.isArray(body.part_ids) ? body.part_ids : [],
          notes: body.notes ?? null,
          created_at: nowIso(),
        };
        db.prepare(
          'INSERT INTO interventions (id, work_order_id, user_id, action, part_ids, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(intervention.id, id, userId, intervention.action, JSON.stringify(intervention.part_ids), intervention.notes, intervention.created_at);
        db.prepare('UPDATE work_orders SET status = \'en_cours\', updated_at = ? WHERE id = ?').run(nowIso(), id);
        db.prepare('UPDATE machines SET updated_at = ? WHERE id = ?').run(nowIso(), wo.machine_id);
        logAudit(userId, 'intervention', intervention.id, 'create', intervention);
        broadcast('interventions', { action: 'create', intervention, work_order_id: id });
        return intervention;
      },
    );

    app.patch(
      '/work-orders/:id/checklist/:itemId',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const { id, itemId } = req.params as { id: string; itemId: string };
        const body = req.body as { done?: boolean };
        const info = db
          .prepare('UPDATE checklist_items SET done = ? WHERE id = ? AND work_order_id = ?')
          .run(body.done ? 1 : 0, itemId, id);
        if (info.changes === 0) {
          reply.code(404).send({ error: 'Élément de checklist introuvable' });
          return;
        }
        broadcast('checklist', { action: 'update', work_order_id: id, itemId, done: !!body.done });
        return { ok: true };
      },
    );
  };
}