/**
 * Types et constantes partagés entre le backend (apps/server) et le frontend
 * (apps/web). Ce package sert de source unique de vérité pour les modèles
 * métier de RoverIt (machines, ordres de travail, pièces, etc.) ainsi que
 * l'ensemble des processus ITIL v4 de gestion de DSI (Incidents, CMDB/CIs,
 * Changements RFC/CAB, Problèmes/KEDB, Catalogue de services).
 * Auteur : Martial Zinsou
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

/* =========================================================================
 * MODULE ITIL DSI — Auteur : Martial Zinsou
 * Implémentation des pratiques ITIL v4 de gestion de DSI :
 * 1. Gestion des Éléments de Configuration (CMDB / SACM)
 * 2. Gestion des Incidents & SLA (Incident Management)
 * 3. Gestion des Changements & CAB (Change Enablement)
 * 4. Gestion des Problèmes & KEDB (Problem Management & Known Error DB)
 * 5. Gestion des Demandes de Services & Catalogue DSI (Service Requests)
 * ========================================================================= */

// --- 1. CMDB & ÉLÉMENTS DE CONFIGURATION (CI) ---

export type CiType =
  | 'workstation'
  | 'server'
  | 'network'
  | 'application'
  | 'database'
  | 'service_it'
  | 'printer'
  | 'other';

export type CiStatus =
  | 'commande'
  | 'en_stock'
  | 'en_service'
  | 'en_maintenance'
  | 'reforme'
  | 'retire';

export type CiCriticality = 'vitale' | 'critique' | 'importante' | 'standard';

export type CiRelationType =
  | 'depend_de'
  | 'heberge'
  | 'connecte_a'
  | 'utilise_par'
  | 'redondance_de';

export interface ConfigurationItem {
  id: string;
  name: string;
  type: CiType;
  serial: string | null;
  model: string | null;
  status: CiStatus;
  criticality: CiCriticality;
  site: string | null;
  ip_address: string | null;
  owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CiRelation {
  id: string;
  source_ci_id: string;
  target_ci_id: string;
  relation_type: CiRelationType;
  notes: string | null;
  created_at: string;
  source_ci_name?: string;
  target_ci_name?: string;
}

// --- 2. GESTION DES INCIDENTS (ITIL INCIDENT MANAGEMENT) ---

export type IncidentImpact = 'faible' | 'moyen' | 'eleve' | 'critique';
export type IncidentUrgency = 'faible' | 'moyenne' | 'haute' | 'critique';
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus =
  | 'nouveau'
  | 'qualifie'
  | 'en_cours'
  | 'en_attente'
  | 'resolu'
  | 'clos';

export interface Incident {
  id: string;
  number: string;
  title: string;
  description: string;
  impact: IncidentImpact;
  urgency: IncidentUrgency;
  priority: IncidentPriority;
  status: IncidentStatus;
  ci_id: string | null;
  ci_name?: string | null;
  reporter: string;
  assignee: string | null;
  workaround: string | null;
  resolution: string | null;
  sla_resolution_hours: number;
  sla_breached: boolean;
  opened_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface IncidentTimeline {
  id: string;
  incident_id: string;
  user_id: string;
  user_name: string;
  kind: 'statut' | 'commentaire' | 'workaround' | 'resolution' | 'escalade';
  notes: string;
  created_at: string;
}

/** Matrice ITIL standard de calcul de priorité P1..P4 selon Impact et Urgence */
export function calculateIncidentPriority(
  impact: IncidentImpact,
  urgency: IncidentUrgency,
): IncidentPriority {
  const impactScore = impact === 'critique' ? 4 : impact === 'eleve' ? 3 : impact === 'moyen' ? 2 : 1;
  const urgencyScore = urgency === 'critique' ? 4 : urgency === 'haute' ? 3 : urgency === 'moyenne' ? 2 : 1;
  const sum = impactScore + urgencyScore;
  if (sum >= 7) return 'P1';
  if (sum >= 5) return 'P2';
  if (sum >= 4) return 'P3';
  return 'P4';
}

/** Objectifs SLA de résolution standard en heures par priorité */
export function getIncidentSlaHours(priority: IncidentPriority): number {
  switch (priority) {
    case 'P1':
      return 2; // 2 heures pour incident critique
    case 'P2':
      return 8; // 8 heures pour incident majeur
    case 'P3':
      return 24; // 24 heures (1 jour ouvré)
    case 'P4':
    default:
      return 72; // 72 heures (3 jours ouvrés)
  }
}

// --- 3. GESTION DES CHANGEMENTS & CAB (CHANGE ENABLEMENT) ---

export type ChangeType = 'standard' | 'normal' | 'urgent';

export type ChangeStatus =
  | 'brouillon'
  | 'soumis'
  | 'analyse_impact'
  | 'en_attente_cab'
  | 'approuve'
  | 'rejete'
  | 'en_cours_deploiement'
  | 'applique'
  | 'revue_post_changement'
  | 'clos'
  | 'echec';

export type ChangeRisk = 'faible' | 'modere' | 'eleve' | 'critique';

export interface ChangeRequest {
  id: string;
  number: string;
  title: string;
  description: string;
  change_type: ChangeType;
  status: ChangeStatus;
  risk_level: ChangeRisk;
  reason: string;
  impact_analysis: string;
  rollback_plan: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  requester: string;
  cab_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CabApproval {
  id: string;
  change_id: string;
  user_id: string;
  user_name: string;
  decision: 'pour' | 'contre' | 'abstention';
  comment: string | null;
  voted_at: string;
}

// --- 4. GESTION DES PROBLÈMES & KEDB (PROBLEM MANAGEMENT) ---

export type ProblemStatus =
  | 'identifie'
  | 'analyse_en_cours'
  | 'erreur_connue'
  | 'solution_trouvee'
  | 'clos';

export interface Problem {
  id: string;
  number: string;
  title: string;
  description: string;
  status: ProblemStatus;
  root_cause: string | null;
  workaround: string | null;
  solution: string | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export interface KedbArticle {
  id: string;
  problem_id: string | null;
  number: string;
  title: string;
  symptoms: string;
  root_cause: string;
  workaround: string;
  permanent_fix: string | null;
  category: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

// --- 5. CATALOGUE DE SERVICES & DEMANDES DSI (SERVICE CATALOG) ---

export type ServiceCatalogCategory =
  | 'materiel'
  | 'logiciel_acces'
  | 'support'
  | 'reseau_telecom';

export type ServiceRequestStatus =
  | 'soumise'
  | 'en_approbation'
  | 'approuvee'
  | 'en_traitement'
  | 'livree'
  | 'rejetee';

export interface ServiceCatalogItem {
  id: string;
  title: string;
  category: ServiceCatalogCategory;
  description: string;
  estimated_delivery_days: number;
  price_eur: number;
  icon: string;
  active: boolean;
}

export interface ServiceRequest {
  id: string;
  number: string;
  item_id: string;
  item_title?: string;
  requester: string;
  beneficiary: string;
  department: string;
  status: ServiceRequestStatus;
  details: string;
  priority: 'basse' | 'normale' | 'urgente';
  due_date: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- 6. TABLEAU DE BORD DSI / KPIS ITIL ---

export interface ItilDashboardKpis {
  activeIncidents: number;
  incidentsP1P2: number;
  slaComplianceRate: number;
  mttrHours: number;
  totalCis: number;
  cisInMaintenance: number;
  pendingChangesCab: number;
  activeProblems: number;
  kedbArticlesCount: number;
  openServiceRequests: number;
}

// --- LIBELLÉS D'AFFICHAGE (FRANÇAIS) ---

export const CI_TYPE_LABELS: Record<CiType, string> = {
  workstation: 'Poste de travail',
  server: 'Serveur physique / virtuel',
  network: 'Équipement réseau (Switch, Routeur)',
  application: 'Application métier / Logiciel',
  database: 'Base de données',
  service_it: 'Service informatique global',
  printer: 'Imprimante / Périphérique',
  other: 'Autre équipement',
};

export const CI_STATUS_LABELS: Record<CiStatus, string> = {
  commande: 'Commandé',
  en_stock: 'En stock DSI',
  en_service: 'En production / service',
  en_maintenance: 'En maintenance',
  reforme: 'Réformé / Rebut',
  retire: 'Retiré',
};

export const CI_CRITICALITY_LABELS: Record<CiCriticality, string> = {
  vitale: 'Vitale (Cœur de métier)',
  critique: 'Critique (Pertes majeures)',
  importante: 'Importante',
  standard: 'Standard',
};

export const CI_RELATION_LABELS: Record<CiRelationType, string> = {
  depend_de: 'Dépend de',
  heberge: 'Héberge',
  connecte_a: 'Connecté à',
  utilise_par: 'Utilisé par',
  redondance_de: 'Redondance / Secours de',
};

export const INCIDENT_PRIORITY_LABELS: Record<IncidentPriority, string> = {
  P1: 'P1 — Critique (Urgence vitale)',
  P2: 'P2 — Majeur (Dégradation forte)',
  P3: 'P3 — Moyen (Gêne opérationnelle)',
  P4: 'P4 — Mineur (Impact marginal)',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  nouveau: 'Nouveau',
  qualifie: 'Qualifié',
  en_cours: 'En cours de résolution',
  en_attente: 'En attente tiers / client',
  resolu: 'Résolu (Workaround/Fix)',
  clos: 'Clos',
};

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  standard: 'Changement standard (Pré-approuvé)',
  normal: 'Changement normal (Validation CAB)',
  urgent: 'Changement d’urgence (ECAB)',
};

export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis pour analyse',
  analyse_impact: 'Analyse d’impact',
  en_attente_cab: 'En attente revue CAB',
  approuve: 'Approuvé par le CAB',
  rejete: 'Rejeté',
  en_cours_deploiement: 'En cours de déploiement',
  applique: 'Appliqué avec succès',
  revue_post_changement: 'Revue post-implémentation',
  clos: 'Clos',
  echec: 'Échec / Rollback exécuté',
};

export const CHANGE_RISK_LABELS: Record<ChangeRisk, string> = {
  faible: 'Risque faible',
  modere: 'Risque modéré',
  eleve: 'Risque élevé',
  critique: 'Risque critique',
};

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  identifie: 'Problème identifié',
  analyse_en_cours: 'Analyse cause racine en cours',
  erreur_connue: 'Erreur connue documentée (KEDB)',
  solution_trouvee: 'Solution définitive validée',
  clos: 'Problème résolu et clos',
};

export const SERVICE_CATALOG_CATEGORY_LABELS: Record<ServiceCatalogCategory, string> = {
  materiel: 'Matériel & Équipements',
  logiciel_acces: 'Logiciels & Droits d’accès',
  support: 'Support & Assistance DSI',
  reseau_telecom: 'Réseau, Téléphonie & Sécurité',
};

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  soumise: 'Demande soumise',
  en_approbation: 'En attente approbation manager',
  approuvee: 'Approuvée (Validation DSI)',
  en_traitement: 'En cours de préparation / livraison',
  livree: 'Prestation livrée',
  rejetee: 'Demande rejetée',
};