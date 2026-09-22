import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import PDFDocument from 'pdfkit';
import { authenticate, httpError } from '../lib/auth.js';
import {
  BENCHMARK_KIND_LABELS,
  COMPONENT_KIND_LABELS,
  LIFECYCLE_LABELS,
  type BenchmarkRun,
  type Component,
  type Machine,
  type WorkOrder,
} from '@roverit/shared';

/**
 * Génère une fiche technique PDF (pdfkit) regroupant les renseignements
 * de la machine, ses composants, benchmarks et ordres de travail.
 */
async function buildMachinePdf(
  machine: Machine,
  components: Component[],
  benchmarks: BenchmarkRun[],
  orders: WorkOrder[],
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = '#b45309';
    doc.fillColor(brand).fontSize(20).font('Helvetica-Bold').text('FICHE TECHNIQUE — ROVERIT', { align: 'center' });
    doc.moveDown(0.2);
    doc.fillColor('#78716c').fontSize(11).font('Helvetica').text('Workstation OS Hub — Reconditionnement & supervision', { align: 'center' });
    doc.moveDown(1);

    doc.fillColor('#1c1917').fontSize(16).font('Helvetica-Bold').text(machine.name);
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#57534e').text(`Générée le ${new Date().toISOString().slice(0, 16).replace('T', ' à ')}`);
    doc.moveDown(0.5);

    const section = (title: string) => {
      doc.moveDown(0.6);
      doc.fillColor(brand).fontSize(12).font('Helvetica-Bold').text(title);
      doc.moveDown(0.2);
    };
    const kv = (k: string, v: string) => {
      doc.fillColor('#1c1917').font('Helvetica-Bold').text(`${k}: `, { continued: true });
      doc.font('Helvetica').fillColor('#44403c').text(v || '—');
    };

    section('Renseignements');
    kv('Client', machine.client ?? '');
    kv('N° de série', machine.serial ?? '');
    kv('Constructeur', machine.manufacturer ?? '');
    kv('Modèle', machine.model ?? '');
    kv('CPU', machine.cpu ?? '');
    kv('GPU', machine.gpu ?? '');
    kv('RAM', machine.ram_gb != null ? `${machine.ram_gb} Go` : '');
    kv('Stockage', machine.storage_tb != null ? `${machine.storage_tb} To` : '');
    kv('Statut', LIFECYCLE_LABELS[machine.status] ?? machine.status);

    section('Composants installés');
    for (const c of components) {
      doc.fillColor('#1c1917').font('Helvetica-Bold').text(`• ${COMPONENT_KIND_LABELS[c.kind]} — ${c.name}`, { continued: false });
      doc.font('Helvetica').fillColor('#57534e').fontSize(9);
      if (c.model) doc.text(`    ${c.model}`);
      if (c.health) doc.text(`    Santé : ${c.health}`);
      if (c.notes) doc.text(`    Notes : ${c.notes}`);
      if (c.installed_at) doc.text(`    Installé le ${c.installed_at.slice(0, 10)}`);
      doc.fontSize(10);
    }

    section('Benchmarks et stabilité thermique');
    const sorted = [...benchmarks].sort((a, b) => b.started_at.localeCompare(a.started_at));
    for (const b of sorted.slice(0, 10)) {
      doc.fillColor('#1c1917').font('Helvetica-Bold').text(
        `• ${BENCHMARK_KIND_LABELS[b.kind]} — score ${b.score ?? '—'}/100 — ${b.started_at.slice(0, 10)}`,
      );
      doc.font('Helvetica').fillColor('#57534e').fontSize(9);
      doc.text(
        `    Temp. moy. ${b.avg_temp_c ?? '—'}°C · max ${b.max_temp_c ?? '—'}°C · CPU moy. ${b.avg_cpu_pct}% · durée ${b.duration_s}s`,
      );
      if (b.notes) doc.text(`    Notes : ${b.notes}`);
      doc.fontSize(10);
    }
    if (sorted.length === 0) {
      doc.fillColor('#57534e').text('Aucun benchmark enregistré.');
    }

    section('Ordres de travail');
    for (const o of orders) {
      doc.fillColor('#1c1917').text(`• ${o.title} (${o.status}) — priorité ${o.priority}`);
    }
    if (orders.length === 0) {
      doc.fillColor('#57534e').text('Aucun ordre de travail.');
    }

    doc.moveDown(1.5);
    doc.fillColor('#a8a29e').fontSize(8).text('Document généré par RoverIt — Workstation OS Hub.', { align: 'center' });
    doc.end();
  });
}

/** Route d'export : génère et renvoie la fiche PDF d'une machine. */
export function reportRoutes(db: Database.Database) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get('/reports/:id/pdf', { preHandler: authenticate }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(id) as
        | Machine
        | undefined;
      if (!machine) throw httpError(404, 'Machine introuvable');
      const components = db
        .prepare('SELECT * FROM components WHERE machine_id = ?')
        .all(id) as Component[];
      const benchmarks = db
        .prepare('SELECT * FROM benchmark_runs WHERE machine_id = ?')
        .all(id) as BenchmarkRun[];
      const orders = db
        .prepare('SELECT * FROM work_orders WHERE machine_id = ?')
        .all(id) as WorkOrder[];
      const pdf = await buildMachinePdf(machine, components, benchmarks, orders);
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="fiche-${machine.id}.pdf"`)
        .send(pdf);
    });
  };
}