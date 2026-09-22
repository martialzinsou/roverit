import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import {
  BENCHMARK_KINDS,
  newId,
  nowIso,
  type BenchmarkKind,
  type BenchmarkRun,
} from '@roverit/shared';
import { authenticate, httpError, requireRole } from '../lib/auth.js';
import { broadcast } from '../lib/events.js';

/**
 * Calcule un score de stabilité (0-100) à partir des températures moyenne
 * et maximale ainsi que de la charge CPU moyenne observées.
 */
function computeStabilityScore(avgTemp: number, maxTemp: number, avgCpu: number): number {
  let score = 100;
  if (avgTemp > 80) score -= (avgTemp - 80) * 1.5;
  if (maxTemp > 95) score -= (maxTemp - 95) * 2;
  if (avgCpu > 88) score -= (avgCpu - 88) * 0.4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Simule une charge de stress sur la durée demandée et collecte des
 * échantillons de température et d'utilisation CPU (démo en mémoire).
 */
async function simulateStress(durationS: number): Promise<{
  avgTemp: number;
  maxTemp: number;
  avgCpu: number;
  maxCpu: number;
}> {
  const samples: { temp: number; cpu: number }[] = [];
  const step = 500;
  const baseTemp = 58;
  for (let t = 0; t < durationS * 1000; t += step) {
    const progress = t / (durationS * 1000);
    const intensity = 0.78 + Math.sin(progress * Math.PI) * 0.18 + Math.random() * 0.1;
    const cpu = Math.round(Math.min(100, intensity * 100));
    const temp = baseTemp + intensity * 18 + Math.random() * 4;
    samples.push({ temp, cpu });
    await new Promise((r) => setTimeout(r, Math.min(step, 200)));
  }
  const temps = samples.map((s) => s.temp);
  const cpus = samples.map((s) => s.cpu);
  return {
    avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
    maxTemp: Math.round(Math.max(...temps) * 10) / 10,
    avgCpu: Math.round((cpus.reduce((a, b) => a + b, 0) / cpus.length) * 10) / 10,
    maxCpu: Math.round(Math.max(...cpus) * 10) / 10,
  };
}

/**
 * Routes de gestion des benchmarks : historique, lancement d'un test de
 * stress et enregistrement manuel d'un résultat.
 */
export function benchmarkRoutes(db: Database.Database) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get('/benchmarks', { preHandler: authenticate }, async (req) => {
      const { machine_id } = req.query as { machine_id?: string };
      const base =
        'SELECT * FROM benchmark_runs' + (machine_id ? ' WHERE machine_id = ?' : '') + ' ORDER BY started_at DESC';
      const rows = machine_id ? db.prepare(base).all(machine_id) : db.prepare(base).all();
      return rows as BenchmarkRun[];
    });

    app.get('/machines/:id/benchmarks', { preHandler: authenticate }, async (req) => {
      const { id } = req.params as { id: string };
      return db
        .prepare('SELECT * FROM benchmark_runs WHERE machine_id = ? ORDER BY started_at DESC')
        .all(id) as BenchmarkRun[];
    });

    app.post(
      '/benchmarks/run',
      {
        preHandler: [
          authenticate,
          requireRole('technicien', 'admin'),
          async (req) => {
            const body = req.body as { machine_id?: string };
            if (!body?.machine_id) throw httpError(400, 'machine_id requis');
            const exists = db.prepare('SELECT id FROM machines WHERE id = ?').get(body.machine_id);
            if (!exists) throw httpError(404, 'Machine introuvable');
          },
        ],
      },
      async (req, reply) => {
        const body = req.body as {
          machine_id: string;
          kind?: BenchmarkKind;
          duration_s?: number;
          notes?: string;
        };
        const kind: BenchmarkKind = BENCHMARK_KINDS.includes(body.kind as BenchmarkKind)
          ? (body.kind as BenchmarkKind)
          : 'stability';
        const durationS = Math.min(7200, Math.max(10, body.duration_s ?? 60));
        const result = await simulateStress(durationS);
        const score =
          kind === 'stability' || kind === 'thermal'
            ? computeStabilityScore(result.avgTemp, result.maxTemp, result.avgCpu)
            : Math.round((result.avgCpu * 100) / 100);

        const run: BenchmarkRun = {
          id: newId(),
          machine_id: body.machine_id,
          kind,
          score,
          avg_temp_c: result.avgTemp,
          max_temp_c: result.maxTemp,
          avg_cpu_pct: result.avgCpu,
          max_cpu_pct: result.maxCpu,
          duration_s: durationS,
          started_at: nowIso(),
          notes: body.notes ?? null,
        };
        db.prepare(
          `INSERT INTO benchmark_runs (id, machine_id, kind, score, avg_temp_c, max_temp_c, avg_cpu_pct, max_cpu_pct, duration_s, started_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(run.id, run.machine_id, run.kind, run.score, run.avg_temp_c, run.max_temp_c, run.avg_cpu_pct, run.max_cpu_pct, run.duration_s, run.started_at, run.notes);
        db.prepare('UPDATE machines SET updated_at = ? WHERE id = ?').run(nowIso(), body.machine_id);
        broadcast('benchmarks', { action: 'run', run });
        reply.code(201);
        return run;
      },
    );

    app.post(
      '/benchmarks',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const body = req.body as Partial<BenchmarkRun>;
        if (!body.machine_id) throw httpError(400, 'machine_id requis');
        const run: BenchmarkRun = {
          id: newId(),
          machine_id: body.machine_id,
          kind: BENCHMARK_KINDS.includes(body.kind as BenchmarkKind)
            ? (body.kind as BenchmarkKind)
            : 'stability',
          score: body.score ?? 0,
          avg_temp_c: body.avg_temp_c ?? null,
          max_temp_c: body.max_temp_c ?? null,
          avg_cpu_pct: body.avg_cpu_pct ?? 0,
          max_cpu_pct: body.max_cpu_pct ?? 0,
          duration_s: body.duration_s ?? 60,
          started_at: body.started_at ?? nowIso(),
          notes: body.notes ?? null,
        };
        db.prepare(
          `INSERT INTO benchmark_runs (id, machine_id, kind, score, avg_temp_c, max_temp_c, avg_cpu_pct, max_cpu_pct, duration_s, started_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(run.id, run.machine_id, run.kind, run.score, run.avg_temp_c, run.max_temp_c, run.avg_cpu_pct, run.max_cpu_pct, run.duration_s, run.started_at, run.notes);
        broadcast('benchmarks', { action: 'create', run });
        return run;
      },
    );
  };
}