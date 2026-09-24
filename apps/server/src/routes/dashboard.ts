/**
 * Routes du tableau de bord : calcule et renvoie les KPIs globaux
 * (parc machines, OT ouverts, score de stabilité, interventions 30j...).
 * Auteur : Martial Zinsou
 */
import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { daysAgoIso, LIFECYCLE_STATUSES, type DashboardKpis } from '@roverit/shared';
import { authenticate } from '../lib/auth.js';

export function dashboardRoutes(db: Database.Database) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get('/dashboard/kpis', { preHandler: authenticate }, async () => {
      const monthAgo = daysAgoIso(30);

      const counts = db
        .prepare('SELECT status, COUNT(*) AS n FROM machines GROUP BY status')
        .all() as { status: string; n: number }[];

      const byStatus = Object.fromEntries(
        LIFECYCLE_STATUSES.map((s) => [s, counts.find((c) => c.status === s)?.n ?? 0]),
      ) as DashboardKpis['byStatus'];

      const machinesTotal = counts.reduce((a, c) => a + c.n, 0);

      const openWo = db
        .prepare("SELECT COUNT(*) AS n FROM work_orders WHERE status IN ('ouverte','en_cours')")
        .get() as { n: number };
      const woTotal = db.prepare('SELECT COUNT(*) AS n FROM work_orders').get() as { n: number };
      const avgScore = db
        .prepare("SELECT AVG(score) AS s FROM benchmark_runs WHERE kind IN ('stability','thermal') AND score IS NOT NULL")
        .get() as { s: number | null };
      const interventions = db
        .prepare('SELECT COUNT(*) AS n FROM interventions WHERE created_at >= ?')
        .get(monthAgo) as { n: number };
      const deployed = db
        .prepare("SELECT COUNT(*) AS n FROM machines WHERE status = 'pret_deploiement' AND updated_at >= ?")
        .get(monthAgo) as { n: number };
      const parts = db
        .prepare('SELECT COUNT(*) AS n, COALESCE(SUM(price_eur * stock), 0) AS v FROM parts')
        .get() as { n: number; v: number };

      const kpis: DashboardKpis = {
        machinesTotal,
        byStatus,
        workOrdersOpen: openWo.n,
        workOrdersTotal: woTotal.n,
        avgStabilityScore: avgScore.s != null ? Math.round(avgScore.s * 10) / 10 : null,
        interventions30d: interventions.n,
        partsTotal: parts.n,
        partsStockValue: Math.round(parts.v * 100) / 100,
        machinesDeployed30d: deployed.n,
      };
      return kpis;
    });
  };
}