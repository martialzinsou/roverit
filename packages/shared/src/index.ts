/**
 * Types et constantes partagés entre le backend (apps/server) et le frontend
 * (apps/web). Ce package sert de source unique de vérité pour les modèles
 * métier de RoverIt (machines, ordres de travail, pièces, etc.).
 */

/** Rôle d'un utilisateur, utilisé pour la gestion des droits d'accès (RBAC). */
export type Role = 'technicien' | 'admin' | 'consultant';

/** Statut de cycle de vie d'une machine durant le reconditionnement. */
export type LifecycleStatus =
  | 'en_attente_diagnostic'
  | 'en_cours_upgrade'
  | 'en_test_thermique'
  | 'pret_deploiement'
  | 'archive';

/** Statut courant d'un ordre de travail. */
export type WorkOrderStatus = 'ouverte' | 'en_cours' | 'terminee' | 'annulee';
/** Priorité d'un ordre de travail. */
export type WorkOrderPriority = 'basse' | 'normale' | 'haute' | 'critique';
/** Type de benchmark exécuté sur une machine. */
export type BenchmarkKind = 'stability' | 'cpu' | 'gpu' | 'memory' | 'thermal';

/** Type matériel d'un composant installé sur une machine. */
export type ComponentKind =
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'battery'
  | 'motherboard'
  | 'cooling'
  | 'other';

/** Utilisateur de la plateforme (technicien, admin ou consultant). */
export interface User {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  created_at: string;
}

/** Machine (workstation) suivie dans le processus de reconditionnement. */
export interface Machine {
  id: string;
  name: string;
  client: string | null;
  serial: string | null;
  manufacturer: string | null;
  model: string | null;
  cpu: string | null;
  ram_gb: number | null;
  storage_tb: number | null;
  gpu: string | null;
  status: LifecycleStatus;
  created_at: string;
  updated_at: string;
}

/** Composant matériel (CPU, GPU, RAM...) installé sur une machine. */
export interface Component {
  id: string;
  machine_id: string;
  kind: ComponentKind;
  name: string;
  model: string | null;
  health: string | null;
  notes: string | null;
  installed_at: string | null;
}

/** Pièce détachée référencée en stock, posée lors des interventions. */
export interface Part {
  id: string;
  name: string;
  category: string;
  price_eur: number;
  stock: number;
  compatibility: string[];
}

/** Résultat d'un benchmark (stabilité, CPU, GPU...) enregistré pour une machine. */
export interface BenchmarkRun {
  id: string;
  machine_id: string;
  kind: BenchmarkKind;
  score: number;
  avg_temp_c: number | null;
  max_temp_c: number | null;
  avg_cpu_pct: number;
  max_cpu_pct: number;
  duration_s: number;
  started_at: string;
  notes: string | null;
}

/** Ordre de travail rattaché à une machine. */
export interface WorkOrder {
  id: string;
  machine_id: string;
  title: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

/** Intervention réalisée par un technicien dans le cadre d'un ordre de travail. */
export interface Intervention {
  id: string;
  work_order_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  part_ids: string[];
  notes: string | null;
  created_at: string;
}

/** Élément d'une checklist rattachée à un ordre de travail. */
export interface ChecklistItem {
  id: string;
  work_order_id: string;
  label: string;
  done: boolean;
}

/** Agrégats (KPIs) calculés pour le tableau de bord. */
export interface DashboardKpis {
  machinesTotal: number;
  byStatus: Record<LifecycleStatus, number>;
  workOrdersOpen: number;
  workOrdersTotal: number;
  avgStabilityScore: number | null;
  interventions30d: number;
  partsTotal: number;
  partsStockValue: number;
  machinesDeployed30d: number;
}

/** Machine enrichie de ses composants, benchmarks et ordres de travail. */
export interface MachineDetail extends Machine {
  components: Component[];
  benchmarks: BenchmarkRun[];
  work_orders: WorkOrder[];
}

/** Événement d'audit traçant une action utilisateur sur une entité. */
export interface AuditEvent {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  user_id: string;
  payload: string | null;
  created_at: string;
}

/** Charge utile échangée lors d'une synchronisation (mode hors-ligne). */
export interface SyncPayload {
  machines?: Machine[];
  work_orders?: WorkOrder[];
}

/** Liste ordonnée des statuts de cycle de vie d'une machine. */
export const LIFECYCLE_STATUSES: LifecycleStatus[] = [
  'en_attente_diagnostic',
  'en_cours_upgrade',
  'en_test_thermique',
  'pret_deploiement',
  'archive',
];

/** Valeurs possibles du statut d'un ordre de travail. */
export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'ouverte',
  'en_cours',
  'terminee',
  'annulee',
];

/** Valeurs possibles de la priorité d'un ordre de travail. */
export const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = [
  'basse',
  'normale',
  'haute',
  'critique',
];

/** Types de benchmark pouvant être exécutés. */
export const BENCHMARK_KINDS: BenchmarkKind[] = [
  'stability',
  'cpu',
  'gpu',
  'memory',
  'thermal',
];

/** Rôles d'utilisateur reconnus par la plateforme. */
export const ROLES: Role[] = ['technicien', 'admin', 'consultant'];

/** Libellés d'affichage (français) des statuts de cycle de vie. */
export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  en_attente_diagnostic: 'En attente de diagnostic',
  en_cours_upgrade: "En cours d'upgrade",
  en_test_thermique: 'En test thermique',
  pret_deploiement: 'Prêt pour déploiement / vente',
  archive: 'Archivé',
};

/** Libellés d'affichage (français) des statuts d'ordre de travail. */
export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

/** Libellés d'affichage (français) des priorités d'ordre de travail. */
export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  critique: 'Critique',
};

/** Libellés d'affichage (français) des types de benchmark. */
export const BENCHMARK_KIND_LABELS: Record<BenchmarkKind, string> = {
  stability: 'Stabilité thermique',
  cpu: 'CPU',
  gpu: 'GPU',
  memory: 'Mémoire',
  thermal: 'Thermique',
};

/** Libellés d'affichage (français) des rôles d'utilisateur. */
export const ROLE_LABELS: Record<Role, string> = {
  technicien: 'Technicien',
  admin: "Chef d'atelier / Admin",
  consultant: 'Consultant / Client',
};

/** Libellés d'affichage (français) des types de composants. */
export const COMPONENT_KIND_LABELS: Record<ComponentKind, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  ram: 'RAM',
  storage: 'Stockage',
  battery: 'Batterie',
  motherboard: 'Carte mère',
  cooling: 'Refroidissement',
  other: 'Autre',
};

/**
 * Génère un identifiant unique (UUID) pour une nouvelle entité.
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Renvoie la date/heure courante au format ISO 8601 (UTC).
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Renvoie une date ISO correspondant à `days` jours dans le passé.
 */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}