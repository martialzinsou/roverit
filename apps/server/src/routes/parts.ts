/**
 * Routes de gestion du catalogue de pièces détachées :
 * CRUD des pièces, contrôle de compatibilité et gestion des stocks atelier.
 * Auteur : Martial Zinsou
 */
import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { newId, type Machine, type Part } from '@roverit/shared';
import { authenticate, httpError, requireRole } from '../lib/auth.js';
import { broadcast } from '../lib/events.js';

function parsePartRow(row: {
  id: string;
  name: string;
  category: string;
  price_eur: number;
  stock: number;
  compatibility: string | null;
}): Part {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price_eur: row.price_eur,
    stock: row.stock,
    compatibility: row.compatibility ? (row.compatibility.split(',') as string[]) : [],
  };
}

/**
 * Vérifie la compatibilité d'une pièce avec une machine : compare chaque
 * règle de compatibilité (RAM, TDP, mots-clés...), renvoie la liste des
 * incompatibilités détectées (vide si la pièce est compatible).
 */
export function checkCompatibility(machine: Machine, compat: string[]): string[] {
  const reasons: string[] = [];
  const blob = `${machine.cpu ?? ''} ${machine.gpu ?? ''} ${machine.model ?? ''} ${machine.manufacturer ?? ''} ${machine.name}`.toLowerCase();
  for (const raw of compat) {
    const token = raw.toLowerCase().trim();
    if (!token || token === 'all') continue;
    const ramMatch = token.match(/^ram\s*(<=|>=)\s*(\d+)$/);
    if (ramMatch) {
      const ram = machine.ram_gb ?? 0;
      const bound = Number(ramMatch[2]);
      const ok = ramMatch[1] === '<=' ? ram <= bound : ram >= bound;
      if (!ok) reasons.push(`La quantité de RAM (${ram} Go) ne satisfait pas « ${token} »`);
      continue;
    }
    const tbpMatch = token.match(/^tbp\s*(<=|>=)\s*(\d+)$/);
    if (tbpMatch) {
      reasons.push(`Vérifier la consommation électrique (TDP) avant installation : « ${token} »`);
      continue;
    }
    if (!blob.includes(token)) {
      reasons.push(`Le composant cible « ${token} » n'est pas détecté sur la machine`);
    }
  }
  return reasons;
}

/**
 * Routes de gestion du stock de pièces : liste, création, mise à jour et
 * contrôle de compatibilité d'une pièce vis-à-vis d'une machine.
 */
export function partsRoutes(db: Database.Database) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get('/parts', { preHandler: authenticate }, async (req) => {
      const rows = db
        .prepare('SELECT * FROM parts ORDER BY category, name')
        .all() as Parameters<typeof parsePartRow>[0][];
      return rows.map(parsePartRow);
    });

    app.post(
      '/parts',
      { preHandler: [authenticate, requireRole('admin')] },
      async (req) => {
        const body = req.body as Partial<Part>;
        if (!body.name?.trim()) throw httpError(400, 'Nom de pièce requis');
        const part: Part = {
          id: newId(),
          name: body.name.trim(),
          category: body.category?.trim() || 'Autre',
          price_eur: typeof body.price_eur === 'number' ? body.price_eur : 0,
          stock: typeof body.stock === 'number' ? Math.max(0, body.stock) : 0,
          compatibility: Array.isArray(body.compatibility) ? body.compatibility : [],
        };
        db.prepare(
          'INSERT INTO parts (id, name, category, price_eur, stock, compatibility) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(part.id, part.name, part.category, part.price_eur, part.stock, part.compatibility.join(','));
        broadcast('parts', { action: 'create', part });
        return part;
      },
    );

    app.patch(
      '/parts/:id',
      { preHandler: [authenticate, requireRole('admin')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<Part>;
        const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(id) as
          | Parameters<typeof parsePartRow>[0]
          | undefined;
        if (!existing) {
          reply.code(404).send({ error: 'Pièce introuvable' });
          return;
        }
        const merged: Part = {
          ...parsePartRow(existing),
          ...body,
          id,
        };
        db.prepare(
          'UPDATE parts SET name=?, category=?, price_eur=?, stock=?, compatibility=? WHERE id=?',
        ).run(merged.name, merged.category, merged.price_eur, merged.stock, merged.compatibility.join(','), id);
        broadcast('parts', { action: 'update', part: merged });
        return merged;
      },
    );

    app.get(
      '/parts/compatibility-check',
      { preHandler: [authenticate, requireRole('technicien', 'admin')] },
      async (req) => {
        const { machine_id, part_id } = req.query as {
          machine_id?: string;
          part_id?: string;
        };
        if (!machine_id || !part_id) throw httpError(400, 'machine_id et part_id requis');
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machine_id) as
          | Machine
          | undefined;
        if (!machine) throw httpError(404, 'Machine introuvable');
        const partRow = db.prepare('SELECT * FROM parts WHERE id = ?').get(part_id) as
          | Parameters<typeof parsePartRow>[0]
          | undefined;
        if (!partRow) throw httpError(404, 'Pièce introuvable');
        const part = parsePartRow(partRow);
        const warnings = checkCompatibility(machine, part.compatibility);
        return { ok: warnings.length === 0, warnings, part, machine_id };
      },
    );
  };
}