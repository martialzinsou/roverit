/**
 * Routes de gestion ITIL v4 pour la DSI :
 * - Tableau de bord DSI (KPIs ITIL, SLA, MTTR)
 * - CMDB & Éléments de Configuration (CIs et relations)
 * - Gestion des Incidents & SLA (P1 à P4, timeline)
 * - Gestion des Changements & CAB (RFC, votes, plans de rollback)
 * - Gestion des Problèmes & KEDB (RCA, erreurs connues)
 * - Catalogue de Services & Demandes usagers
 * Auteur : Martial Zinsou
 */
import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import {
  newId,
  nowIso,
  calculateIncidentPriority,
  getIncidentSlaHours,
  type ConfigurationItem,
  type CiRelation,
  type Incident,
  type ChangeRequest,
  type Problem,
  type KedbArticle,
  type ServiceCatalogItem,
  type ServiceRequest,
  type ItilDashboardKpis,
} from '@roverit/shared';
import { authenticate, httpError, requireRole } from '../lib/auth.js';
import { broadcast } from '../lib/events.js';

export function itilRoutes(db: Database.Database) {
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
    // =========================================================================
    // 0. TABLEAU DE BORD DSI / KPIS ITIL
    // =========================================================================
    app.get('/itil/dashboard', { preHandler: authenticate }, async () => {
      const activeIncidents = (
        db.prepare(
          "SELECT COUNT(*) AS count FROM incidents WHERE status NOT IN ('resolu', 'clos')",
        ).get() as { count: number }
      ).count;

      const incidentsP1P2 = (
        db.prepare(
          "SELECT COUNT(*) AS count FROM incidents WHERE priority IN ('P1', 'P2') AND status NOT IN ('clos')",
        ).get() as { count: number }
      ).count;

      const resolvedIncidents = db
        .prepare(
          "SELECT sla_breached, opened_at, resolved_at FROM incidents WHERE status IN ('resolu', 'clos')",
        )
        .all() as { sla_breached: number; opened_at: string; resolved_at: string | null }[];

      let slaComplianceRate = 100;
      let mttrHours = 0;
      if (resolvedIncidents.length > 0) {
        const withoutBreach = resolvedIncidents.filter((i) => i.sla_breached === 0).length;
        slaComplianceRate = Math.round((withoutBreach / resolvedIncidents.length) * 100);

        let totalDurationMs = 0;
        let countWithTimes = 0;
        for (const inc of resolvedIncidents) {
          if (inc.resolved_at && inc.opened_at) {
            const start = new Date(inc.opened_at).getTime();
            const end = new Date(inc.resolved_at).getTime();
            if (end > start) {
              totalDurationMs += end - start;
              countWithTimes++;
            }
          }
        }
        if (countWithTimes > 0) {
          mttrHours = Math.round((totalDurationMs / (countWithTimes * 3600000)) * 10) / 10;
        }
      }

      const totalCis = (
        db.prepare('SELECT COUNT(*) AS count FROM configuration_items').get() as { count: number }
      ).count;

      const cisInMaintenance = (
        db.prepare(
          "SELECT COUNT(*) AS count FROM configuration_items WHERE status = 'en_maintenance'",
        ).get() as { count: number }
      ).count;

      const pendingChangesCab = (
        db.prepare(
          "SELECT COUNT(*) AS count FROM change_requests WHERE status = 'en_attente_cab'",
        ).get() as { count: number }
      ).count;

      const activeProblems = (
        db.prepare("SELECT COUNT(*) AS count FROM problems WHERE status != 'clos'").get() as {
          count: number;
        }
      ).count;

      const kedbArticlesCount = (
        db.prepare('SELECT COUNT(*) AS count FROM kedb_articles').get() as { count: number }
      ).count;

      const openServiceRequests = (
        db.prepare(
          "SELECT COUNT(*) AS count FROM service_requests WHERE status NOT IN ('livree', 'rejetee')",
        ).get() as { count: number }
      ).count;

      const kpis: ItilDashboardKpis = {
        activeIncidents,
        incidentsP1P2,
        slaComplianceRate,
        mttrHours,
        totalCis,
        cisInMaintenance,
        pendingChangesCab,
        activeProblems,
        kedbArticlesCount,
        openServiceRequests,
      };

      return kpis;
    });

    // =========================================================================
    // 1. CMDB & ÉLÉMENTS DE CONFIGURATION (CI)
    // =========================================================================
    app.get('/itil/cmdb/cis', { preHandler: authenticate }, async (req) => {
      const { type, status, criticality, q } = req.query as {
        type?: string;
        status?: string;
        criticality?: string;
        q?: string;
      };
      const clauses: string[] = [];
      const params: string[] = [];

      if (type) {
        clauses.push('type = ?');
        params.push(type);
      }
      if (status) {
        clauses.push('status = ?');
        params.push(status);
      }
      if (criticality) {
        clauses.push('criticality = ?');
        params.push(criticality);
      }
      if (q) {
        clauses.push('(name LIKE ? OR serial LIKE ? OR model LIKE ? OR ip_address LIKE ?)');
        const wild = `%${q}%`;
        params.push(wild, wild, wild, wild);
      }

      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const cis = db
        .prepare(`SELECT * FROM configuration_items${where} ORDER BY updated_at DESC`)
        .all(...params) as ConfigurationItem[];
      return cis;
    });

    app.post(
      '/itil/cmdb/cis',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const body = req.body as Partial<ConfigurationItem>;
        if (!body.name || !body.type) {
          throw httpError(400, 'Le nom et le type du CI sont requis');
        }

        const id = newId();
        const now = nowIso();
        db.prepare(
          `INSERT INTO configuration_items (id, name, type, serial, model, status, criticality, site, ip_address, owner, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          body.name,
          body.type,
          body.serial ?? null,
          body.model ?? null,
          body.status ?? 'en_service',
          body.criticality ?? 'standard',
          body.site ?? null,
          body.ip_address ?? null,
          body.owner ?? null,
          body.notes ?? null,
          now,
          now,
        );

        logAudit(req.user!.userId, 'configuration_item', id, 'create_ci', body);
        broadcast('itil_ci_created', { id, name: body.name });
        reply.code(201);
        return db.prepare('SELECT * FROM configuration_items WHERE id = ?').get(id);
      },
    );

    app.get('/itil/cmdb/cis/:id', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      const ci = db.prepare('SELECT * FROM configuration_items WHERE id = ?').get(id) as
        | ConfigurationItem
        | undefined;
      if (!ci) throw httpError(404, 'Élément de configuration non trouvé');

      const outgoing = db
        .prepare(
          `SELECT r.*, t.name AS target_ci_name, t.type AS target_ci_type
           FROM ci_relations r
           JOIN configuration_items t ON t.id = r.target_ci_id
           WHERE r.source_ci_id = ?`,
        )
        .all(id) as CiRelation[];

      const incoming = db
        .prepare(
          `SELECT r.*, s.name AS source_ci_name, s.type AS source_ci_type
           FROM ci_relations r
           JOIN configuration_items s ON s.id = r.source_ci_id
           WHERE r.target_ci_id = ?`,
        )
        .all(id) as CiRelation[];

      const linkedIncidents = db
        .prepare('SELECT * FROM incidents WHERE ci_id = ? ORDER BY opened_at DESC')
        .all(id);

      return {
        ...ci,
        relations_outgoing: outgoing,
        relations_incoming: incoming,
        incidents: linkedIncidents,
      };
    });

    app.patch(
      '/itil/cmdb/cis/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<ConfigurationItem>;
        const existing = db.prepare('SELECT * FROM configuration_items WHERE id = ?').get(id);
        if (!existing) throw httpError(404, 'Élément de configuration non trouvé');

        const fields: string[] = [];
        const params: unknown[] = [];
        const allowed = [
          'name',
          'type',
          'serial',
          'model',
          'status',
          'criticality',
          'site',
          'ip_address',
          'owner',
          'notes',
        ] as const;

        for (const k of allowed) {
          if (body[k] !== undefined) {
            fields.push(`${k} = ?`);
            params.push(body[k]);
          }
        }
        fields.push('updated_at = ?');
        params.push(nowIso());
        params.push(id);

        db.prepare(`UPDATE configuration_items SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        logAudit(req.user!.userId, 'configuration_item', id, 'update_ci', body);
        broadcast('itil_ci_updated', { id });
        return db.prepare('SELECT * FROM configuration_items WHERE id = ?').get(id);
      },
    );

    app.delete(
      '/itil/cmdb/cis/:id',
      { preHandler: [authenticate, requireRole('admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const res = db.prepare('DELETE FROM configuration_items WHERE id = ?').run(id);
        if (!res.changes) throw httpError(404, 'CI introuvable');
        logAudit(req.user!.userId, 'configuration_item', id, 'delete_ci');
        return { ok: true };
      },
    );

    // Relations CMDB
    app.get('/itil/cmdb/relations', { preHandler: authenticate }, async () => {
      return db
        .prepare(
          `SELECT r.*, s.name AS source_ci_name, s.type AS source_ci_type,
                  t.name AS target_ci_name, t.type AS target_ci_type
           FROM ci_relations r
           JOIN configuration_items s ON s.id = r.source_ci_id
           JOIN configuration_items t ON t.id = r.target_ci_id
           ORDER BY r.created_at DESC`,
        )
        .all();
    });

    app.post(
      '/itil/cmdb/relations',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { source_ci_id, target_ci_id, relation_type, notes } = req.body as {
          source_ci_id: string;
          target_ci_id: string;
          relation_type: string;
          notes?: string;
        };

        if (!source_ci_id || !target_ci_id || !relation_type) {
          throw httpError(400, 'source_ci_id, target_ci_id et relation_type sont requis');
        }

        const id = newId();
        db.prepare(
          `INSERT INTO ci_relations (id, source_ci_id, target_ci_id, relation_type, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(id, source_ci_id, target_ci_id, relation_type, notes ?? null, nowIso());

        return db.prepare('SELECT * FROM ci_relations WHERE id = ?').get(id);
      },
    );

    app.delete(
      '/itil/cmdb/relations/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        db.prepare('DELETE FROM ci_relations WHERE id = ?').run(id);
        return { ok: true };
      },
    );

    // =========================================================================
    // 2. GESTION DES INCIDENTS (INCIDENT MANAGEMENT)
    // =========================================================================
    app.get('/itil/incidents', { preHandler: authenticate }, async (req) => {
      const { priority, status, ci_id, q } = req.query as {
        priority?: string;
        status?: string;
        ci_id?: string;
        q?: string;
      };

      const clauses: string[] = [];
      const params: string[] = [];

      if (priority) {
        clauses.push('i.priority = ?');
        params.push(priority);
      }
      if (status) {
        clauses.push('i.status = ?');
        params.push(status);
      }
      if (ci_id) {
        clauses.push('i.ci_id = ?');
        params.push(ci_id);
      }
      if (q) {
        clauses.push('(i.number LIKE ? OR i.title LIKE ? OR i.description LIKE ? OR i.reporter LIKE ?)');
        const wild = `%${q}%`;
        params.push(wild, wild, wild, wild);
      }

      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const rows = db
        .prepare(
          `SELECT i.*, ci.name AS ci_name, ci.type AS ci_type
           FROM incidents i
           LEFT JOIN configuration_items ci ON ci.id = i.ci_id${where}
           ORDER BY CASE i.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END ASC,
                    i.opened_at DESC`,
        )
        .all(...params) as Incident[];
      return rows;
    });

    app.post('/itil/incidents', { preHandler: authenticate }, async (req, reply) => {
      const body = req.body as Partial<Incident>;
      if (!body.title || !body.description) {
        throw httpError(400, 'Titre et description requis');
      }

      const count = (
        db.prepare('SELECT COUNT(*) AS n FROM incidents').get() as { n: number }
      ).n;
      const year = new Date().getFullYear();
      const number = `INC-${year}-${String(count + 1).padStart(3, '0')}`;

      const impact = body.impact ?? 'moyen';
      const urgency = body.urgency ?? 'moyenne';
      const priority = body.priority ?? calculateIncidentPriority(impact, urgency);
      const slaHours = getIncidentSlaHours(priority);
      const id = newId();
      const now = nowIso();

      db.prepare(
        `INSERT INTO incidents (id, number, title, description, impact, urgency, priority, status, ci_id, reporter, assignee, workaround, resolution, sla_resolution_hours, sla_breached, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        number,
        body.title,
        body.description,
        impact,
        urgency,
        priority,
        'nouveau',
        body.ci_id ?? null,
        body.reporter ?? req.user!.username,
        body.assignee ?? null,
        null,
        null,
        slaHours,
        0,
        now,
      );

      // Entrée de timeline initiale
      db.prepare(
        `INSERT INTO incident_timeline (id, incident_id, user_id, user_name, kind, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        newId(),
        id,
        req.user!.userId,
        req.user!.username,
        'statut',
        `Incident déclaré avec priorité ${priority} (SLA : ${slaHours}h).`,
        now,
      );

      logAudit(req.user!.userId, 'incident', id, 'create_incident', { number, priority });
      broadcast('itil_incident_created', { id, number, priority, title: body.title });
      reply.code(201);
      return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    });

    app.get('/itil/incidents/:id', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      const inc = db
        .prepare(
          `SELECT i.*, ci.name AS ci_name, ci.type AS ci_type, ci.site AS ci_site
           FROM incidents i
           LEFT JOIN configuration_items ci ON ci.id = i.ci_id
           WHERE i.id = ?`,
        )
        .get(id) as Incident | undefined;
      if (!inc) throw httpError(404, 'Incident introuvable');

      const timeline = db
        .prepare('SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC')
        .all(id);

      return { ...inc, timeline };
    });

    app.patch(
      '/itil/incidents/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<Incident>;
        const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as
          | Incident
          | undefined;
        if (!existing) throw httpError(404, 'Incident introuvable');

        const fields: string[] = [];
        const params: unknown[] = [];
        const now = nowIso();

        if (body.status && body.status !== existing.status) {
          fields.push('status = ?');
          params.push(body.status);

          if (body.status === 'resolu' && !existing.resolved_at) {
            fields.push('resolved_at = ?');
            params.push(now);

            // Vérification SLA breach
            const openTime = new Date(existing.opened_at).getTime();
            const closeTime = new Date(now).getTime();
            const elapsedHours = (closeTime - openTime) / 3600000;
            if (elapsedHours > existing.sla_resolution_hours) {
              fields.push('sla_breached = 1');
            }
          }
          if (body.status === 'clos' && !existing.closed_at) {
            fields.push('closed_at = ?');
            params.push(now);
          }

          db.prepare(
            `INSERT INTO incident_timeline (id, incident_id, user_id, user_name, kind, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            newId(),
            id,
            req.user!.userId,
            req.user!.username,
            'statut',
            `Statut passé de "${existing.status}" à "${body.status}".`,
            now,
          );
        }

        if (body.assignee !== undefined) {
          fields.push('assignee = ?');
          params.push(body.assignee);
        }
        if (body.workaround !== undefined) {
          fields.push('workaround = ?');
          params.push(body.workaround);
          if (body.workaround) {
            db.prepare(
              `INSERT INTO incident_timeline (id, incident_id, user_id, user_name, kind, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              newId(),
              id,
              req.user!.userId,
              req.user!.username,
              'workaround',
              `Solution de contournement : ${body.workaround}`,
              now,
            );
          }
        }
        if (body.resolution !== undefined) {
          fields.push('resolution = ?');
          params.push(body.resolution);
          if (body.resolution) {
            db.prepare(
              `INSERT INTO incident_timeline (id, incident_id, user_id, user_name, kind, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              newId(),
              id,
              req.user!.userId,
              req.user!.username,
              'resolution',
              `Résolution définitive : ${body.resolution}`,
              now,
            );
          }
        }

        if (fields.length > 0) {
          params.push(id);
          db.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        }

        broadcast('itil_incident_updated', { id });
        return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
      },
    );

    app.post('/itil/incidents/:id/timeline', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      const { notes, kind } = req.body as { notes: string; kind?: string };
      if (!notes) throw httpError(400, 'Note requise');

      const tid = newId();
      db.prepare(
        `INSERT INTO incident_timeline (id, incident_id, user_id, user_name, kind, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(tid, id, req.user!.userId, req.user!.username, kind ?? 'commentaire', notes, nowIso());

      return db.prepare('SELECT * FROM incident_timeline WHERE id = ?').get(tid);
    });

    // =========================================================================
    // 3. GESTION DES CHANGEMENTS (CHANGE MANAGEMENT & CAB)
    // =========================================================================
    app.get('/itil/changes', { preHandler: authenticate }, async (req) => {
      const { status, change_type } = req.query as { status?: string; change_type?: string };
      const clauses: string[] = [];
      const params: string[] = [];

      if (status) {
        clauses.push('status = ?');
        params.push(status);
      }
      if (change_type) {
        clauses.push('change_type = ?');
        params.push(change_type);
      }

      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      return db
        .prepare(`SELECT * FROM change_requests${where} ORDER BY created_at DESC`)
        .all(...params) as ChangeRequest[];
    });

    app.post(
      '/itil/changes',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const body = req.body as Partial<ChangeRequest>;
        if (!body.title || !body.description || !body.reason || !body.rollback_plan) {
          throw httpError(
            400,
            'Titre, description, motif du changement et plan de rollback sont obligatoires',
          );
        }

        const count = (
          db.prepare('SELECT COUNT(*) AS n FROM change_requests').get() as { n: number }
        ).n;
        const year = new Date().getFullYear();
        const number = `RFC-${year}-${String(count + 1).padStart(3, '0')}`;
        const id = newId();
        const now = nowIso();

        db.prepare(
          `INSERT INTO change_requests (id, number, title, description, change_type, status, risk_level, reason, impact_analysis, rollback_plan, scheduled_start, scheduled_end, requester, cab_notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          number,
          body.title,
          body.description,
          body.change_type ?? 'normal',
          body.status ?? 'soumis',
          body.risk_level ?? 'modere',
          body.reason,
          body.impact_analysis ?? 'Analyse standard d\'impact DSI',
          body.rollback_plan,
          body.scheduled_start ?? null,
          body.scheduled_end ?? null,
          body.requester ?? req.user!.username,
          body.cab_notes ?? null,
          now,
          now,
        );

        logAudit(req.user!.userId, 'change_request', id, 'create_change', { number });
        broadcast('itil_change_created', { id, number, title: body.title });
        reply.code(201);
        return db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id);
      },
    );

    app.get('/itil/changes/:id', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      const change = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id) as
        | ChangeRequest
        | undefined;
      if (!change) throw httpError(404, 'Demande de changement non trouvée');

      const votes = db
        .prepare('SELECT * FROM change_cab_votes WHERE change_id = ? ORDER BY voted_at DESC')
        .all(id);

      return { ...change, cab_votes: votes };
    });

    app.patch(
      '/itil/changes/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<ChangeRequest>;
        const existing = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id);
        if (!existing) throw httpError(404, 'Demande de changement non trouvée');

        const fields: string[] = [];
        const params: unknown[] = [];
        const allowed = [
          'title',
          'description',
          'change_type',
          'status',
          'risk_level',
          'reason',
          'impact_analysis',
          'rollback_plan',
          'scheduled_start',
          'scheduled_end',
          'cab_notes',
        ] as const;

        for (const k of allowed) {
          if (body[k] !== undefined) {
            fields.push(`${k} = ?`);
            params.push(body[k]);
          }
        }
        fields.push('updated_at = ?');
        params.push(nowIso());
        params.push(id);

        db.prepare(`UPDATE change_requests SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        broadcast('itil_change_updated', { id });
        return db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id);
      },
    );

    app.post(
      '/itil/changes/:id/cab-vote',
      { preHandler: [authenticate, requireRole('admin', 'technicien')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const { decision, comment } = req.body as { decision: string; comment?: string };
        if (!['pour', 'contre', 'abstention'].includes(decision)) {
          throw httpError(400, 'Décision invalide (pour, contre, abstention)');
        }

        const voteId = newId();
        db.prepare(
          `INSERT INTO change_cab_votes (id, change_id, user_id, user_name, decision, comment, voted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(voteId, id, req.user!.userId, req.user!.username, decision, comment ?? null, nowIso());

        return db.prepare('SELECT * FROM change_cab_votes WHERE id = ?').get(voteId);
      },
    );

    // =========================================================================
    // 4. GESTION DES PROBLÈMES & KEDB (PROBLEM & KNOWN ERROR)
    // =========================================================================
    app.get('/itil/problems', { preHandler: authenticate }, async () => {
      return db.prepare('SELECT * FROM problems ORDER BY updated_at DESC').all() as Problem[];
    });

    app.post(
      '/itil/problems',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const body = req.body as Partial<Problem>;
        if (!body.title || !body.description) {
          throw httpError(400, 'Titre et description requis');
        }

        const count = (
          db.prepare('SELECT COUNT(*) AS n FROM problems').get() as { n: number }
        ).n;
        const year = new Date().getFullYear();
        const number = `PRB-${year}-${String(count + 1).padStart(3, '0')}`;
        const id = newId();
        const now = nowIso();

        db.prepare(
          `INSERT INTO problems (id, number, title, description, status, root_cause, workaround, solution, assignee, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          number,
          body.title,
          body.description,
          body.status ?? 'identifie',
          body.root_cause ?? null,
          body.workaround ?? null,
          body.solution ?? null,
          body.assignee ?? req.user!.username,
          now,
          now,
        );

        reply.code(201);
        return db.prepare('SELECT * FROM problems WHERE id = ?').get(id);
      },
    );

    app.get('/itil/problems/:id', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      const prob = db.prepare('SELECT * FROM problems WHERE id = ?').get(id);
      if (!prob) throw httpError(404, 'Problème introuvable');
      const articles = db.prepare('SELECT * FROM kedb_articles WHERE problem_id = ?').all(id);
      return { ...prob, kedb_articles: articles };
    });

    app.patch(
      '/itil/problems/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<Problem>;
        const existing = db.prepare('SELECT * FROM problems WHERE id = ?').get(id);
        if (!existing) throw httpError(404, 'Problème introuvable');

        const fields: string[] = [];
        const params: unknown[] = [];
        for (const k of ['title', 'description', 'status', 'root_cause', 'workaround', 'solution', 'assignee'] as const) {
          if (body[k] !== undefined) {
            fields.push(`${k} = ?`);
            params.push(body[k]);
          }
        }
        fields.push('updated_at = ?');
        params.push(nowIso());
        params.push(id);

        db.prepare(`UPDATE problems SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM problems WHERE id = ?').get(id);
      },
    );

    // KEDB Articles
    app.get('/itil/kedb', { preHandler: authenticate }, async (req) => {
      const { q, category } = req.query as { q?: string; category?: string };
      const clauses: string[] = [];
      const params: string[] = [];

      if (category) {
        clauses.push('category = ?');
        params.push(category);
      }
      if (q) {
        clauses.push('(title LIKE ? OR symptoms LIKE ? OR root_cause LIKE ? OR workaround LIKE ?)');
        const wild = `%${q}%`;
        params.push(wild, wild, wild, wild);
      }

      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      return db
        .prepare(`SELECT * FROM kedb_articles${where} ORDER BY views_count DESC, updated_at DESC`)
        .all(...params) as KedbArticle[];
    });

    app.post(
      '/itil/kedb',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req, reply) => {
        const body = req.body as Partial<KedbArticle>;
        if (!body.title || !body.symptoms || !body.root_cause || !body.workaround) {
          throw httpError(
            400,
            'Titre, symptômes, cause racine et solution de contournement (workaround) sont requis',
          );
        }

        const count = (
          db.prepare('SELECT COUNT(*) AS n FROM kedb_articles').get() as { n: number }
        ).n;
        const year = new Date().getFullYear();
        const number = `KB-${year}-${String(count + 1).padStart(3, '0')}`;
        const id = newId();
        const now = nowIso();

        db.prepare(
          `INSERT INTO kedb_articles (id, problem_id, number, title, symptoms, root_cause, workaround, permanent_fix, category, views_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          body.problem_id ?? null,
          number,
          body.title,
          body.symptoms,
          body.root_cause,
          body.workaround,
          body.permanent_fix ?? null,
          body.category ?? 'Général',
          0,
          now,
          now,
        );

        reply.code(201);
        return db.prepare('SELECT * FROM kedb_articles WHERE id = ?').get(id);
      },
    );

    app.get('/itil/kedb/:id', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      db.prepare('UPDATE kedb_articles SET views_count = views_count + 1 WHERE id = ?').run(id);
      const art = db.prepare('SELECT * FROM kedb_articles WHERE id = ?').get(id);
      if (!art) throw httpError(404, 'Article KEDB non trouvé');
      return art;
    });

    // =========================================================================
    // 5. CATALOGUE DE SERVICES & DEMANDES DSI
    // =========================================================================
    app.get('/itil/services/catalog', { preHandler: authenticate }, async () => {
      return db
        .prepare('SELECT * FROM service_catalog_items WHERE active = 1 ORDER BY category ASC, title ASC')
        .all() as ServiceCatalogItem[];
    });

    app.post(
      '/itil/services/catalog',
      { preHandler: [authenticate, requireRole('admin')] },
      async (req, reply) => {
        const body = req.body as Partial<ServiceCatalogItem>;
        if (!body.title || !body.category || !body.description) {
          throw httpError(400, 'Titre, catégorie et description sont requis');
        }

        const id = newId();
        db.prepare(
          `INSERT INTO service_catalog_items (id, title, category, description, estimated_delivery_days, price_eur, icon, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          body.title,
          body.category,
          body.description,
          body.estimated_delivery_days ?? 3,
          body.price_eur ?? 0,
          body.icon ?? '📦',
          1,
        );

        reply.code(201);
        return db.prepare('SELECT * FROM service_catalog_items WHERE id = ?').get(id);
      },
    );

    app.get('/itil/services/requests', { preHandler: authenticate }, async (req) => {
      const { status } = req.query as { status?: string };
      const clauses: string[] = [];
      const params: string[] = [];

      if (status) {
        clauses.push('sr.status = ?');
        params.push(status);
      }

      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      return db
        .prepare(
          `SELECT sr.*, sci.title AS item_title, sci.category AS item_category, sci.icon AS item_icon
           FROM service_requests sr
           JOIN service_catalog_items sci ON sci.id = sr.item_id${where}
           ORDER BY sr.created_at DESC`,
        )
        .all(...params) as ServiceRequest[];
    });

    app.post('/itil/services/requests', { preHandler: authenticate }, async (req, reply) => {
      const body = req.body as Partial<ServiceRequest>;
      if (!body.item_id || !body.beneficiary || !body.department || !body.details) {
        throw httpError(400, 'Prestation demandée, bénéficiaire, département et détails sont requis');
      }

      const item = db.prepare('SELECT * FROM service_catalog_items WHERE id = ?').get(body.item_id) as
        | ServiceCatalogItem
        | undefined;
      if (!item) throw httpError(404, 'Prestation de catalogue introuvable');

      const count = (
        db.prepare('SELECT COUNT(*) AS n FROM service_requests').get() as { n: number }
      ).n;
      const year = new Date().getFullYear();
      const number = `SR-${year}-${String(count + 1).padStart(3, '0')}`;
      const id = newId();
      const now = nowIso();
      const dueDays = item.estimated_delivery_days || 3;
      const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString();

      db.prepare(
        `INSERT INTO service_requests (id, number, item_id, requester, beneficiary, department, status, details, priority, due_date, approved_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        number,
        body.item_id,
        req.user!.username,
        body.beneficiary,
        body.department,
        'soumise',
        body.details,
        body.priority ?? 'normale',
        dueDate,
        null,
        now,
        now,
      );

      broadcast('itil_service_request_created', { id, number, item: item.title });
      reply.code(201);
      return db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id);
    });

    app.patch(
      '/itil/services/requests/:id',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { id } = req.params as { id: string };
        const { status, approved_by } = req.body as { status?: string; approved_by?: string };

        const existing = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id);
        if (!existing) throw httpError(404, 'Demande de service introuvable');

        const fields: string[] = [];
        const params: unknown[] = [];

        if (status) {
          fields.push('status = ?');
          params.push(status);
        }
        if (approved_by !== undefined) {
          fields.push('approved_by = ?');
          params.push(approved_by);
        }
        fields.push('updated_at = ?');
        params.push(nowIso());
        params.push(id);

        db.prepare(`UPDATE service_requests SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id);
      },
    );
  };
}
