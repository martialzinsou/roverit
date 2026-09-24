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
 * pièces, benchmarks, ordres de travail, interventions, audit,
 * ainsi que l'ensemble des modules ITIL DSI : CIs/CMDB, Incidents,
 * Changements RFC/CAB, Problèmes/KEDB, Catalogue de services).
 * Auteur : Martial Zinsou
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

-- =========================================================================
-- TABLES ITIL DSI — Auteur : Martial Zinsou
-- =========================================================================

-- 1. Éléments de Configuration (CMDB / SACM)
CREATE TABLE IF NOT EXISTS configuration_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'en_service',
  criticality TEXT NOT NULL DEFAULT 'standard',
  site TEXT,
  ip_address TEXT,
  owner TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ci_relations (
  id TEXT PRIMARY KEY,
  source_ci_id TEXT NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  target_ci_id TEXT NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

-- 2. Gestion des Incidents (Incident Management)
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'moyen',
  urgency TEXT NOT NULL DEFAULT 'moyenne',
  priority TEXT NOT NULL DEFAULT 'P3',
  status TEXT NOT NULL DEFAULT 'nouveau',
  ci_id TEXT REFERENCES configuration_items(id) ON DELETE SET NULL,
  reporter TEXT NOT NULL,
  assignee TEXT,
  workaround TEXT,
  resolution TEXT,
  sla_resolution_hours INTEGER NOT NULL DEFAULT 24,
  sla_breached INTEGER NOT NULL DEFAULT 0,
  opened_at TEXT NOT NULL,
  resolved_at TEXT,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS incident_timeline (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. Gestion des Changements & CAB (Change Enablement)
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'soumis',
  risk_level TEXT NOT NULL DEFAULT 'modere',
  reason TEXT NOT NULL,
  impact_analysis TEXT NOT NULL,
  rollback_plan TEXT NOT NULL,
  scheduled_start TEXT,
  scheduled_end TEXT,
  requester TEXT NOT NULL,
  cab_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS change_cab_votes (
  id TEXT PRIMARY KEY,
  change_id TEXT NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT,
  voted_at TEXT NOT NULL
);

-- 4. Gestion des Problèmes & KEDB (Problem Management & Known Error DB)
CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'identifie',
  root_cause TEXT,
  workaround TEXT,
  solution TEXT,
  assignee TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kedb_articles (
  id TEXT PRIMARY KEY,
  problem_id TEXT REFERENCES problems(id) ON DELETE SET NULL,
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  workaround TEXT NOT NULL,
  permanent_fix TEXT,
  category TEXT NOT NULL DEFAULT 'Général',
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Catalogue de Services DSI & Demandes (Service Request Management)
CREATE TABLE IF NOT EXISTS service_catalog_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_delivery_days INTEGER NOT NULL DEFAULT 3,
  price_eur REAL NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '📦',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  item_id TEXT NOT NULL REFERENCES service_catalog_items(id),
  requester TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'soumise',
  details TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normale',
  due_date TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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

  // --- SEED ITIL DSI — Auteur : Martial Zinsou ---

  // 1. Éléments de Configuration (CIs)
  const insertCi = db.prepare(`
    INSERT INTO configuration_items (id, name, type, serial, model, status, criticality, site, ip_address, owner, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const ciSrvEsx1 = { id: 'ci_srv_esx1', name: 'Hyperviseur ESXi Prod 01', type: 'server', serial: 'SRV-DL-9821', model: 'Dell PowerEdge R750', status: 'en_service', criticality: 'vitale', site: 'Datacenter Principal — Baie A1', ip_address: '10.0.10.15', owner: 'Infra & Virtualisation', notes: 'Héberge 18 VMs critiques (ERP, DB, AD)', created_at: daysAgoIso(60), updated_at: daysAgoIso(2) };
  const ciSwCore = { id: 'ci_sw_core', name: 'Switch Core Réseau Datacenter', type: 'network', serial: 'SW-CS-4410', model: 'Cisco Nexus 9300-FX3', status: 'en_service', criticality: 'vitale', site: 'Datacenter Principal — Baie Reseau', ip_address: '10.0.0.1', owner: 'Équipe Réseau & Sécurité', notes: 'Cœur de commutation 40Gbps redondé', created_at: daysAgoIso(90), updated_at: daysAgoIso(5) };
  const ciDbPg = { id: 'ci_db_pg', name: 'Cluster PostgreSQL ERP (Primaire)', type: 'database', serial: null, model: 'PostgreSQL 16 HA streaming', status: 'en_service', criticality: 'vitale', site: 'ESXi Prod 01 (VM-102)', ip_address: '10.0.10.50', owner: 'DBA / Pôle Données', notes: 'Base transactionnelle ERP de la DSI (800 Go)', created_at: daysAgoIso(45), updated_at: daysAgoIso(1) };
  const ciAppErp = { id: 'ci_app_erp', name: 'ERP DSI & Gestion Commerciale', type: 'application', serial: null, model: 'RoverIt ERP v4.2 Enterprise', status: 'en_service', criticality: 'vitale', site: 'PaaS Interne', ip_address: '10.0.20.10', owner: 'Pôle Applications Métier', notes: 'Utilisé par 250 collaborateurs quotidiennement', created_at: daysAgoIso(40), updated_at: daysAgoIso(1) };
  const ciSrvAd = { id: 'ci_srv_ad', name: 'Contrôleur de Domaine AD / DNS', type: 'server', serial: 'VM-AD-01', model: 'Windows Server 2022', status: 'en_service', criticality: 'critique', site: 'Datacenter Principal — Baie B', ip_address: '10.0.1.10', owner: 'Équipe Systèmes', notes: 'Authentification Kerberos, SSO et annuaire LDAP', created_at: daysAgoIso(120), updated_at: daysAgoIso(10) };
  const ciWsCad01 = { id: 'ci_ws_cad01', name: 'Station R&D Alpha WS-01', type: 'workstation', serial: 'SN-2024-0001', model: 'Dell Precision T5820', status: 'en_service', criticality: 'importante', site: 'Bureau Études R&D — Poste 4', ip_address: '10.0.100.42', owner: 'Bureau d\'études', notes: 'Poste graphisme lourd et calcul éléments finis', created_at: daysAgoIso(15), updated_at: daysAgoIso(1) };
  const ciVpnGw = { id: 'ci_vpn_gw', name: 'Passerelle VPN Nomades FortiGate', type: 'network', serial: 'FG-100F-8871', model: 'Fortinet FortiGate 100F', status: 'en_service', criticality: 'vitale', site: 'DMZ Datacenter', ip_address: '194.2.0.1', owner: 'Équipe Réseau & Sécurité', notes: 'Terminaison VPN SSL / IPsec pour 120 télétravailleurs', created_at: daysAgoIso(80), updated_at: daysAgoIso(3) };

  for (const ci of [ciSrvEsx1, ciSwCore, ciDbPg, ciAppErp, ciSrvAd, ciWsCad01, ciVpnGw]) {
    insertCi.run(ci.id, ci.name, ci.type, ci.serial, ci.model, ci.status, ci.criticality, ci.site, ci.ip_address, ci.owner, ci.notes, ci.created_at, ci.updated_at);
  }

  // Relations CMDB
  const insertRel = db.prepare(`
    INSERT INTO ci_relations (id, source_ci_id, target_ci_id, relation_type, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertRel.run(newId(), ciAppErp.id, ciDbPg.id, 'depend_de', 'L\'application ERP stocke ses tables dans PostgreSQL', daysAgoIso(30));
  insertRel.run(newId(), ciDbPg.id, ciSrvEsx1.id, 'heberge', 'Le serveur ESXi exécute la machine virtuelle du cluster DB', daysAgoIso(30));
  insertRel.run(newId(), ciSrvEsx1.id, ciSwCore.id, 'connecte_a', 'Agrégation 2x10G LACP vers le switch cœur de réseau', daysAgoIso(30));
  insertRel.run(newId(), ciWsCad01.id, ciSwCore.id, 'connecte_a', 'Lien Gigabit Ethernet vers cœur de réseau', daysAgoIso(14));
  insertRel.run(newId(), ciAppErp.id, ciWsCad01.id, 'utilise_par', 'Client lourd ERP installé sur la station CAO', daysAgoIso(14));
  insertRel.run(newId(), ciVpnGw.id, ciSwCore.id, 'connecte_a', 'Liaison DMZ vers LAN interne via switch cœur', daysAgoIso(30));

  // 2. Incidents DSI & SLA
  const insertInc = db.prepare(`
    INSERT INTO incidents (id, number, title, description, impact, urgency, priority, status, ci_id, reporter, assignee, workaround, resolution, sla_resolution_hours, sla_breached, opened_at, resolved_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inc1 = {
    id: newId(),
    number: 'INC-2024-001',
    title: 'Latence critique et saturation des connexions sur la DB ERP',
    description: 'Temps de réponse supérieur à 15 secondes sur les requêtes comptables et blocage de sessions.',
    impact: 'critique',
    urgency: 'critique',
    priority: 'P1',
    status: 'en_cours',
    ci_id: ciDbPg.id,
    reporter: 'Direction Financière',
    assignee: 'Karim T.',
    workaround: 'Redémarrage du pool de connexions PgBouncer et kill des requêtes locks bloquantes',
    resolution: null,
    sla_resolution_hours: 2,
    sla_breached: 0,
    opened_at: daysAgoIso(0.1),
    resolved_at: null,
    closed_at: null,
  };

  const inc2 = {
    id: newId(),
    number: 'INC-2024-002',
    title: 'Écran bleu (BSOD WHEA_UNCORRECTABLE) en rendu GPU lourd',
    description: 'La station CAO Alpha plante brutalement après 20 minutes sous Lumion / Blender.',
    impact: 'eleve',
    urgency: 'haute',
    priority: 'P2',
    status: 'qualifie',
    ci_id: ciWsCad01.id,
    reporter: 'Chef de projet CAO',
    assignee: 'Karim T.',
    workaround: 'Limiter le power limit de la RTX 4000 à 80% via utilitaire pilote',
    resolution: null,
    sla_resolution_hours: 8,
    sla_breached: 0,
    opened_at: daysAgoIso(1),
    resolved_at: null,
    closed_at: null,
  };

  const inc3 = {
    id: newId(),
    number: 'INC-2024-003',
    title: 'Échec d\'authentification VPN SSL pour les collaborateurs distants',
    description: 'Erreur de poignée de main TLS lors de la connexion depuis le client nomade.',
    impact: 'moyen',
    urgency: 'moyenne',
    priority: 'P3',
    status: 'resolu',
    ci_id: ciVpnGw.id,
    reporter: 'Responsable Commercial',
    assignee: 'Léa M.',
    workaround: 'Connexion temporaire via le portail Web SSL VPN',
    resolution: 'Renouvellement du certificat wildcard Let\'s Encrypt sur le FortiGate et redémarrage daemon VPN.',
    sla_resolution_hours: 24,
    sla_breached: 0,
    opened_at: daysAgoIso(3),
    resolved_at: daysAgoIso(2.8),
    closed_at: daysAgoIso(2.5),
  };

  const inc4 = {
    id: newId(),
    number: 'INC-2024-004',
    title: 'Compte Active Directory verrouillé suite à 3 essais erronés',
    description: 'Utilisateur bloqué suite au changement de mot de passe mensuel.',
    impact: 'faible',
    urgency: 'faible',
    priority: 'P4',
    status: 'clos',
    ci_id: ciSrvAd.id,
    reporter: 'Secrétariat Général',
    assignee: 'Léa M.',
    workaround: null,
    resolution: 'Déverrouillage du compte dans l\'OU RH et réinitialisation sécurisée du mot de passe.',
    sla_resolution_hours: 72,
    sla_breached: 0,
    opened_at: daysAgoIso(5),
    resolved_at: daysAgoIso(4.9),
    closed_at: daysAgoIso(4.8),
  };

  for (const inc of [inc1, inc2, inc3, inc4]) {
    insertInc.run(
      inc.id, inc.number, inc.title, inc.description, inc.impact, inc.urgency, inc.priority,
      inc.status, inc.ci_id, inc.reporter, inc.assignee, inc.workaround, inc.resolution,
      inc.sla_resolution_hours, inc.sla_breached, inc.opened_at, inc.resolved_at, inc.closed_at
    );
  }

  // Timeline des incidents
  const insertTimeline = db.prepare(`
    INSERT INTO incident_timeline (id, incident_id, user_id, user_name, kind, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertTimeline.run(newId(), inc1.id, tech.id, 'Karim T.', 'escalade', 'Incident qualifié P1 suite à confirmation de coupure du pôle comptable.', daysAgoIso(0.09));
  insertTimeline.run(newId(), inc1.id, tech.id, 'Karim T.', 'workaround', 'Application du contournement : vidage des verrous inactifs sur PostgreSQL.', daysAgoIso(0.05));
  insertTimeline.run(newId(), inc3.id, tech.id, 'Léa M.', 'resolution', 'Certificat TLS déployé avec succès. Tests de connexion nomade validés sur 5 postes.', daysAgoIso(2.8));

  // 3. Changements & CAB (Change Enablement)
  const insertChange = db.prepare(`
    INSERT INTO change_requests (id, number, title, description, change_type, status, risk_level, reason, impact_analysis, rollback_plan, scheduled_start, scheduled_end, requester, cab_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rfc1 = {
    id: newId(),
    number: 'RFC-2024-001',
    title: 'Migration et montée de version mineure PostgreSQL 16.3 + failover HA',
    description: 'Application du patch critique de sécurité PostgreSQL et test du basculement automatique Patroni.',
    change_type: 'normal',
    status: 'en_attente_cab',
    risk_level: 'eleve',
    reason: 'Correction de deux failles de sécurité CVE et optimisation de la mémoire partagée.',
    impact_analysis: 'Indisponibilité planifiée de l\'ERP estimée à 4 minutes lors du switchover du nœud primaire.',
    rollback_plan: 'Restauration instantanée du snapshot VMware ESXi avant démarrage et réactivation du nœud réplique.',
    scheduled_start: daysAgoIso(-2), // Dans 2 jours
    scheduled_end: daysAgoIso(-2),
    requester: 'Pôle Infrastructure DSI',
    cab_notes: 'Présentation prévue au comité CAB de jeudi 14h. Validation préalable de l\'équipe applicative requise.',
    created_at: daysAgoIso(4),
    updated_at: daysAgoIso(1),
  };

  const rfc2 = {
    id: newId(),
    number: 'RFC-2024-002',
    title: 'Remplacement de l\'onduleur de la Baie Réseau A (APC Smart-UPS 3000VA)',
    description: 'Changement préventif des packs batteries usagés (4 ans de service) et test d\'autonomie.',
    change_type: 'normal',
    status: 'approuve',
    risk_level: 'modere',
    reason: 'Rapport de maintenance préventive indiquant une capacité batterie résiduelle de 52%.',
    impact_analysis: 'Aucune interruption réseau : alimentation secourue via commutateur de transfert automatique (ATS).',
    rollback_plan: 'Maintien de la voie bypass sur réseau Enedis en cas de défaut du nouvel onduleur.',
    scheduled_start: daysAgoIso(-1),
    scheduled_end: daysAgoIso(-1),
    requester: 'Responsable Énergie & Datacenter',
    cab_notes: 'Approuvé à l\'unanimité du CAB le 22/09/2026. Travaux programmés samedi matin 06h00.',
    created_at: daysAgoIso(7),
    updated_at: daysAgoIso(2),
  };

  const rfc3 = {
    id: newId(),
    number: 'RFC-2024-003',
    title: 'Mise à niveau firmware d\'urgence FortiOS v7.4.4 suite à alerte CERT-FR',
    description: 'Déploiement en urgence du correctif de vulnérabilité SSL-VPN à exécution de code à distance.',
    change_type: 'urgent',
    status: 'applique',
    risk_level: 'critique',
    reason: 'Vulnérabilité critique exploitée activement selon bulletin CERT-FR.',
    impact_analysis: 'Coupure des tunnels VPN durant le reboot (3 minutes).',
    rollback_plan: 'Boot sur partition flash secondaire avec ancienne version firmware si dysfonctionnement.',
    scheduled_start: daysAgoIso(3),
    scheduled_end: daysAgoIso(3),
    requester: 'RSSI / Responsable Sécurité DSI',
    cab_notes: 'Validation accordée par l\'Emergency CAB (ECAB) par appel d\'astreinte à 23h30.',
    created_at: daysAgoIso(3),
    updated_at: daysAgoIso(3),
  };

  for (const rfc of [rfc1, rfc2, rfc3]) {
    insertChange.run(
      rfc.id, rfc.number, rfc.title, rfc.description, rfc.change_type, rfc.status, rfc.risk_level,
      rfc.reason, rfc.impact_analysis, rfc.rollback_plan, rfc.scheduled_start, rfc.scheduled_end,
      rfc.requester, rfc.cab_notes, rfc.created_at, rfc.updated_at
    );
  }

  // Votes CAB
  const insertVote = db.prepare(`
    INSERT INTO change_cab_votes (id, change_id, user_id, user_name, decision, comment, voted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertVote.run(newId(), rfc1.id, tech.id, 'Karim T.', 'pour', 'Plan de rollback testé en pré-production sur réplique test.', daysAgoIso(1));
  insertVote.run(newId(), rfc2.id, tech.id, 'Karim T.', 'pour', 'ATS testé, double alimentation effective.', daysAgoIso(3));

  // 4. Problèmes & KEDB (Known Error Database)
  const insertProblem = db.prepare(`
    INSERT INTO problems (id, number, title, description, status, root_cause, workaround, solution, assignee, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const prb1 = {
    id: newId(),
    number: 'PRB-2024-001',
    title: 'Dégradation thermique et instabilité GPU sur les stations Dell T5820',
    description: 'Multiples incidents rapportés de baisse de framerate et crashs sous forte charge de rendu 3D.',
    status: 'erreur_connue',
    root_cause: 'Vieillissement accéléré de la pâte thermique d\'origine fabricant après 24 mois d\'usage continu.',
    workaround: 'Augmenter le seuil de ventilation des ventilateurs de boîtier à 85% via réglage BIOS.',
    solution: 'Remplacement de la pâte thermique par de la Noctua NT-H2 ou MX-6 lors du protocole de maintenance atelier RoverIt.',
    assignee: 'Karim T.',
    created_at: daysAgoIso(10),
    updated_at: daysAgoIso(2),
  };

  const prb2 = {
    id: newId(),
    number: 'PRB-2024-002',
    title: 'Déconnexions intempestives du client VPN nomade sur connexions fibre Free/Orange',
    description: 'Les sessions se ferment toutes les 15 minutes sans message d\'erreur explicite.',
    status: 'analyse_en_cours',
    root_cause: 'Timeout MTU/MSS non synchronisé sur les routeurs opérateurs imposant une fragmentation des paquets ESP.',
    workaround: 'Forcer la MTU à 1350 octets dans la configuration réseau de la carte virtuelle TAP.',
    solution: null,
    assignee: 'Léa M.',
    created_at: daysAgoIso(6),
    updated_at: daysAgoIso(1),
  };

  insertProblem.run(prb1.id, prb1.number, prb1.title, prb1.description, prb1.status, prb1.root_cause, prb1.workaround, prb1.solution, prb1.assignee, prb1.created_at, prb1.updated_at);
  insertProblem.run(prb2.id, prb2.number, prb2.title, prb2.description, prb2.status, prb2.root_cause, prb2.workaround, prb2.solution, prb2.assignee, prb2.created_at, prb2.updated_at);

  const insertKedb = db.prepare(`
    INSERT INTO kedb_articles (id, problem_id, number, title, symptoms, root_cause, workaround, permanent_fix, category, views_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertKedb.run(
    newId(),
    prb1.id,
    'KB-2024-001',
    'Chute de performance et BSOD sous rendu 3D (Stations Dell Precision)',
    'Écran noir, ventilation à 100%, erreur "Display driver nvlddmkm stopped responding".',
    'Assèchement de pâte thermique GPU/CPU sous cycles thermiques supérieurs à 85°C.',
    'Forcer le profil de ventilation "Cooling Performance" dans le BIOS UEFI et limiter la puissance à 85%.',
    'Dépôt en atelier RoverIt : reconditionnement thermique complet (pâte thermique MX-6 + test 15 min OCCT).',
    'Postes de travail & Matériel',
    42,
    daysAgoIso(9),
    daysAgoIso(1)
  );

  insertKedb.run(
    newId(),
    prb2.id,
    'KB-2024-002',
    'Client FortiClient VPN bloqué à 98% ou déconnexion toutes les 15 minutes',
    'La connexion s\'établit puis se coupe subitement sans alerte.',
    'Problème de fragmentation MTU sur les réseaux grand public avec paquet TLS VPN.',
    'Dans l\'invite de commande admin : netsh interface ipv4 set subinterface "Fortinet SSL" mtu=1350 store=persistent.',
    'Mise à jour du serveur FortiGate avec profil MSS Clamping forcé à 1350 octets via RFC-2024-004.',
    'Réseau & Télétravail',
    28,
    daysAgoIso(5),
    daysAgoIso(1)
  );

  // 5. Catalogue de Services DSI & Demandes
  const insertCat = db.prepare(`
    INSERT INTO service_catalog_items (id, title, category, description, estimated_delivery_days, price_eur, icon, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const catItems = [
    { id: 'sc_ws_heavy', title: 'Dotation Station Graphique 3D / Calcul (Workstation)', category: 'materiel', description: 'Poste complet Dell Precision, Intel Xeon / Core i9, 64 Go RAM, GPU NVIDIA RTX Pro, double écran 27".', estimated_delivery_days: 5, price_eur: 2450.0, icon: '🖥️' },
    { id: 'sc_lap_exec', title: 'Dotation PC Portable Nomade Cadre (ThinkPad 15")', category: 'materiel', description: 'Ultrabook professionnel, autonomie 12h, 32 Go RAM, station d\'accueil USB-C et sacoche antivol.', estimated_delivery_days: 3, price_eur: 1390.0, icon: '💻' },
    { id: 'sc_acc_erp', title: 'Création compte applicatif ERP & Profils métier', category: 'logiciel_acces', description: 'Activation d\'un compte utilisateur sur l\'ERP DSI, rôles métiers associés et paramétrage des droits.', estimated_delivery_days: 1, price_eur: 0.0, icon: '🔑' },
    { id: 'sc_vpn_nomad', title: 'Accès Télétravail Sécurisé & Certificat VPN', category: 'reseau_telecom', description: 'Délivrance d\'un jeton MFA d\'authentification forte et installation du profil VPN sécurisé.', estimated_delivery_days: 1, price_eur: 0.0, icon: '🛡️' },
    { id: 'sc_upg_ram', title: 'Upgrade Mémoire Vive Station (Passage à 64 Go)', category: 'materiel', description: 'Ajout de 32 Go de mémoire DDR4/DDR5 supplémentaire avec test de validation mémoire Prime95.', estimated_delivery_days: 2, price_eur: 180.0, icon: '⚡' },
    { id: 'sc_rep_diag', title: 'Diagnostic complet & Maintenance préventive atelier', category: 'support', description: 'Dépoussiérage ultra-son, repaste thermique, mise à jour microcodes BIOS et benchmark de stabilité.', estimated_delivery_days: 1, price_eur: 75.0, icon: '🛠️' },
  ];

  for (const c of catItems) {
    insertCat.run(c.id, c.title, c.category, c.description, c.estimated_delivery_days, c.price_eur, c.icon, 1);
  }

  const insertReq = db.prepare(`
    INSERT INTO service_requests (id, number, item_id, requester, beneficiary, department, status, details, priority, due_date, approved_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertReq.run(
    newId(),
    'SR-2024-001',
    'sc_lap_exec',
    'Direction Ressources Humaines',
    'Sophie Bernard (Nouvelle Responsable Marketing)',
    'Marketing & Communication',
    'en_traitement',
    'Arrivée prévue le 1er du mois prochain. Prévoir pack Office et accès Teams pré-configuré.',
    'normale',
    daysAgoIso(-5),
    'Admin DSI',
    daysAgoIso(2),
    daysAgoIso(1)
  );

  insertReq.run(
    newId(),
    'SR-2024-002',
    'sc_vpn_nomad',
    'Marc Lefevre',
    'Marc Lefevre (Chef de chantier)',
    'Direction des Opérations',
    'approuvee',
    'Besoin d\'accès distant pour consultation des plans et plannings depuis les sites extérieurs.',
    'normale',
    daysAgoIso(-1),
    'Responsable Réseau',
    daysAgoIso(1),
    daysAgoIso(0.5)
  );

  insertReq.run(
    newId(),
    'SR-2024-003',
    'sc_upg_ram',
    'Bureau d\'études R&D',
    'Julien Moreau',
    'Pôle Calcul & Simulation',
    'soumise',
    'Saturation de la mémoire lors du chargement des modèles géométriques 3D volumineux (fichiers > 20 Go).',
    'urgente',
    daysAgoIso(-2),
    null,
    daysAgoIso(0.3),
    daysAgoIso(0.3)
  );
}

/** Convertit une ligne SQL quelconque en type métier `T`. */
export function mapRow<T>(row: unknown): T {
  return row as T;
}