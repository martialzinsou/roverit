import Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import {
  daysAgoIso,
  newId,
  nowIso,
} from '@roverit/shared';
import { hashPassword } from './lib/password.js';

/**
 * Schéma SQL des tables de la base SQLite (users, machines, composants,
 * pièces, benchmarks, ordres de travail, interventions, audit...).
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technicien',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT,
  serial TEXT,
  manufacturer TEXT,
  model TEXT,
  cpu TEXT,
  ram_gb INTEGER,
  storage_tb REAL,
  gpu TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente_diagnostic',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  health TEXT,
  notes TEXT,
  installed_at TEXT
);

CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_eur REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  compatibility TEXT
);

CREATE TABLE IF NOT EXISTS benchmark_runs (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  score REAL,
  avg_temp_c REAL,
  max_temp_c REAL,
  avg_cpu_pct REAL,
  max_cpu_pct REAL,
  duration_s INTEGER,
  started_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normale',
  status TEXT NOT NULL DEFAULT 'ouverte',
  assignee TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  part_ids TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);
`;

/** Handle d'accès à la base de données SQLite. */
export interface Db {
  database: Database.Database;
}

/**
 * Ouvre (ou crée) la base SQLite au chemin indiqué, applique le schéma
 * et insère les données de démonstration si la base est vide.
 */
export function createDb(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seed(db);
  return db;
}

/** Insère le jeu de données de démonstration si aucun utilisateur n'existe. */
function seed(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get() as {
    n: number;
  };
  if (count.n > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (id, username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  insertUser.run(newId(), 'admin', 'admin@roverit.local', hashPassword('admin'), 'admin', nowIso());
  insertUser.run(newId(), 'tech', 'tech@roverit.local', hashPassword('tech'), 'technicien', nowIso());
  insertUser.run(newId(), 'client', 'client@roverit.local', hashPassword('client'), 'consultant', nowIso());

  const insertMachine = db.prepare(`
    INSERT INTO machines (id, name, client, serial, manufacturer, model, cpu, ram_gb, storage_tb, gpu, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const m1 = {
    id: 'm_ws1',
    name: 'Workstation Alpha WS-01',
    client: 'Studio Rendu 3D',
    serial: 'SN-2024-0001',
    manufacturer: 'Dell',
    model: 'Precision T5820',
    cpu: 'Intel Xeon W-2295 18C',
    ram_gb: 128,
    storage_tb: 4,
    gpu: 'NVIDIA RTX 4000 Ada',
  };
  const m2 = {
    id: 'm_ws2',
    name: 'Workstation Beta WS-02',
    client: 'Bureau d\'études',
    serial: 'SN-2024-0002',
    manufacturer: 'HP',
    model: 'Z4 G4',
    cpu: 'Intel Core i9-10900K',
    ram_gb: 64,
    storage_tb: 2,
    gpu: 'NVIDIA RTX A5000',
  };
  const m3 = {
    id: 'm_ws3',
    name: 'Tour Gamma WS-03',
    client: 'Atelier photo',
    serial: 'SN-2024-0003',
    manufacturer: 'ASUS',
    model: 'ProArt PA90',
    cpu: 'Intel Core i7-9700K',
    ram_gb: 32,
    storage_tb: 1,
    gpu: 'NVIDIA Quadro P2200',
  };
  const m4 = {
    id: 'm_ws4',
    name: 'Tour Delta WS-04',
    client: 'Labo IA',
    serial: 'SN-2024-0004',
    manufacturer: 'Lenovo',
    model: 'ThinkStation P620',
    cpu: 'AMD Threadripper PRO 3975WX 32C',
    ram_gb: 128,
    storage_tb: 8,
    gpu: 'NVIDIA RTX A6000',
  };

  const rows = [
    [m1.id, m1.name, m1.client, m1.serial, m1.manufacturer, m1.model, m1.cpu, m1.ram_gb, m1.storage_tb, m1.gpu, 'pret_deploiement', daysAgoIso(6), daysAgoIso(2)],
    [m2.id, m2.name, m2.client, m2.serial, m2.manufacturer, m2.model, m2.cpu, m2.ram_gb, m2.storage_tb, m2.gpu, 'en_test_thermique', daysAgoIso(10), nowIso()],
    [m3.id, m3.name, m3.client, m3.serial, m3.manufacturer, m3.model, m3.cpu, m3.ram_gb, m3.storage_tb, m3.gpu, 'en_cours_upgrade', daysAgoIso(12), nowIso()],
    [m4.id, m4.name, m4.client, m4.serial, m4.manufacturer, m4.model, m4.cpu, m4.ram_gb, m4.storage_tb, m4.gpu, 'en_attente_diagnostic', daysAgoIso(3), daysAgoIso(3)],
  ];
  for (const r of rows) insertMachine.run(...r);

  const insertComponent = db.prepare(`
    INSERT INTO components (id, machine_id, kind, name, model, health, notes, installed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertComponent.run(newId(), m1.id, 'cpu', 'Intel Xeon W-2295', 'W-2295', 'OK', 'Reconditionné, pâte thermique MX-6 appliquée', daysAgoIso(2));
  insertComponent.run(newId(), m1.id, 'gpu', 'NVIDIA RTX 4000 Ada', 'RTX 4000 Ada', 'OK', 'VBIOS flashé v95.02.65', daysAgoIso(2));
  insertComponent.run(newId(), m1.id, 'storage', 'Samsung 990 PRO', 'NVMe 2 To', 'OK', 'SMART 99%, 1 240 h allumage', daysAgoIso(2));
  insertComponent.run(newId(), m1.id, 'cooling', 'Noctua NH-D15', null, 'OK', 'Ventilation remplacée', daysAgoIso(2));
  insertComponent.run(newId(), m2.id, 'cpu', 'Intel Core i9-10900K', 'i9-10900K', 'OK', null, daysAgoIso(5));
  insertComponent.run(newId(), m2.id, 'gpu', 'NVIDIA RTX A5000', 'RTX A5000', 'OK', null, daysAgoIso(5));
  insertComponent.run(newId(), m2.id, 'battery', 'Batterie station', null, 'OK', '73 cycles, capacité 96%', daysAgoIso(5));
  insertComponent.run(newId(), m3.id, 'ram', 'Corsair Vengeance LPX', 'DDR4 32 Go (2x16)', 'OK', 'Upgrade 16 -> 32 Go', daysAgoIso(1));
  insertComponent.run(newId(), m4.id, 'storage', 'Crucial T700', 'NVMe 4 To x2', 'À tester', 'En RAID 0 — diagnostic en cours', null);

  const insertPart = db.prepare(`
    INSERT INTO parts (id, name, category, price_eur, stock, compatibility)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertPart.run(newId(), 'Module RAM DDR4 SO-DIMM 32 Go', 'RAM', 89.9, 14, 'ram<=128,ddr4');
  insertPart.run(newId(), 'NVMe Samsung 990 PRO 2 To', 'Stockage', 169.0, 8, 'nvme');
  insertPart.run(newId(), 'NVMe Crucial T700 4 To', 'Stockage', 289.0, 3, 'nvme,gen5');
  insertPart.run(newId(), 'Pâte thermique MX-6 8g', 'Refroidissement', 12.9, 40, 'all');
  insertPart.run(newId(), 'Ventilateur Noctua NF-A14', 'Refroidissement', 22.5, 12, 'all');
  insertPart.run(newId(), 'Alimentation 550W Gold', 'Alimentation', 88.0, 6, 'tbp<=550');
  insertPart.run(newId(), 'Module RAM DDR5 64 Go', 'RAM', 245.0, 5, 'ram<=256,ddr5');
  insertPart.run(newId(), 'GPU NVIDIA RTX A5000', 'GPU', 1890.0, 2, 'gpu,tdp<=230');

  const insertBench = db.prepare(`
    INSERT INTO benchmark_runs (id, machine_id, kind, score, avg_temp_c, max_temp_c, avg_cpu_pct, max_cpu_pct, duration_s, started_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBench.run(newId(), m1.id, 'stability', 96, 64, 72, 82, 100, 600, daysAgoIso(3), 'Avant livraison — refroidissement optimal');
  insertBench.run(newId(), m1.id, 'stability', 91, 71, 81, 85, 100, 600, daysAgoIso(9), 'Avant révision — pâte thermique d\'origine');
  insertBench.run(newId(), m2.id, 'stability', 84, 74, 86, 88, 100, 600, daysAgoIso(1), 'En cours — ventilateur bruyant remplacé');
  insertBench.run(newId(), m3.id, 'cpu', 62, 72, 88, 80, 100, 300, daysAgoIso(2), 'Stress CPU 5 min');
  insertBench.run(newId(), m4.id, 'memory', null, 55, 63, 40, 55, 300, daysAgoIso(1), 'Prime95 blend 5 min');

  const insertWorkOrder = db.prepare(`
    INSERT INTO work_orders (id, machine_id, title, priority, status, assignee, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertWorkOrder.run(newId(), m1.id, 'Reconditionnement complet WS-01', 'haute', 'terminee', 'Karim T.', daysAgoIso(7), daysAgoIso(2));
  insertWorkOrder.run(newId(), m2.id, 'Remplacement ventilation + check thermique', 'normale', 'en_cours', 'Karim T.', daysAgoIso(2), nowIso());
  insertWorkOrder.run(newId(), m3.id, 'Upgrade RAM 16 -> 32 Go', 'normale', 'ouverte', 'Léa M.', daysAgoIso(1), nowIso());
  insertWorkOrder.run(newId(), m4.id, 'Diagnostic lent SSD RAID', 'critique', 'ouverte', 'Léa M.', daysAgoIso(1), daysAgoIso(1));

  const insertChecklist = db.prepare(`
    INSERT INTO checklist_items (id, work_order_id, label, done) VALUES (?, ?, ?, ?)
  `);
  const wo2 = db.prepare('SELECT id FROM work_orders WHERE machine_id = ?').get(m2.id) as { id: string };
  const checklist = [
    'Nettoyage / dépoussiérage complet',
    'Remplacement pâte thermique',
    'Vérification ventilateurs et RPM',
    'Test de stabilité 10 minutes',
  ];
  for (let i = 0; i < checklist.length; i++) {
    insertChecklist.run(newId(), wo2.id, checklist[i], i < 2 ? 1 : 0);
  }

  const tech = db.prepare("SELECT id FROM users WHERE username = 'tech'").get() as { id: string };
  const insertIntervention = db.prepare(`
    INSERT INTO interventions (id, work_order_id, user_id, action, part_ids, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertIntervention.run(newId(), wo2.id, tech.id, 'Remplacement ventilateur Noctua NF-A14', '', 'Ventilateur d\'origine HS (roulement)', daysAgoIso(1));
  insertIntervention.run(newId(), wo2.id, tech.id, 'Application pâte thermique MX-6', '', 'CPU + GPU', daysAgoIso(1));
}

/** Convertit une ligne SQL quelconque en type métier `T`. */
export function mapRow<T>(row: unknown): T {
  return row as T;
}