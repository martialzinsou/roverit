/**
 * Badges de statut métier colorés (cycle de vie machine, OT, priorités,
 * ainsi que statuts ITIL : incidents, CIs, changements, SLA, KEDB).
 * Mappe chaque statut à un ton de la palette et affiche un libellé par défaut.
 * Auteur : Martial Zinsou
 */
import type {
  LifecycleStatus,
  WorkOrderStatus,
  WorkOrderPriority,
  IncidentPriority,
  IncidentStatus,
  CiStatus,
  CiCriticality,
  ChangeStatus,
  ChangeRisk,
} from '@roverit/shared';
import {
  INCIDENT_PRIORITY_LABELS,
  INCIDENT_STATUS_LABELS,
  CI_STATUS_LABELS,
  CI_CRITICALITY_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_RISK_LABELS,
} from '@roverit/shared';
import { Badge } from './ui';

/** Tonalités de couleur par statut de cycle de vie d'une machine. */
const STATUS_TONE: Record<LifecycleStatus, string> = {
  en_attente_diagnostic: 'amber',
  en_cours_upgrade: 'blue',
  en_test_thermique: 'amber',
  pret_deploiement: 'green',
  archive: 'gray',
};

/** Tonalités de couleur par statut d'ordre de travail. */
const WO_STATUS_TONE: Record<WorkOrderStatus, string> = {
  ouverte: 'blue',
  en_cours: 'amber',
  terminee: 'green',
  annulee: 'red',
};

/** Tonalités de couleur par niveau de priorité d'un OT. */
const PRIORITY_TONE: Record<WorkOrderPriority, string> = {
  basse: 'gray',
  normale: 'blue',
  haute: 'amber',
  critique: 'red',
};

/** Badge coloré du statut de cycle de vie d'une machine. */
export function MachineStatusBadge({ status, label }: { status: LifecycleStatus | string; label?: string }) {
  return <Badge tone={STATUS_TONE[status as LifecycleStatus] ?? 'neutral'}>{label ?? status}</Badge>;
}

/** Badge coloré du statut d'un ordre de travail. */
export function WoStatusBadge({ status, label }: { status: WorkOrderStatus | string; label?: string }) {
  return <Badge tone={WO_STATUS_TONE[status as WorkOrderStatus] ?? 'neutral'}>{label ?? status}</Badge>;
}

/** Badge coloré de la priorité d'un ordre de travail. */
export function PriorityBadge({ priority, label }: { priority: WorkOrderPriority | string; label?: string }) {
  return <Badge tone={PRIORITY_TONE[priority as WorkOrderPriority] ?? 'neutral'}>{label ?? priority}</Badge>;
}

// =========================================================================
// BADGES ITIL DSI — Auteur : Martial Zinsou
// =========================================================================

export function IncidentPriorityBadge({ priority }: { priority: IncidentPriority | string }) {
  const tones: Record<string, string> = {
    P1: 'red',
    P2: 'amber',
    P3: 'blue',
    P4: 'gray',
  };
  const label = INCIDENT_PRIORITY_LABELS[priority as IncidentPriority] ?? priority;
  return <Badge tone={tones[priority] ?? 'neutral'}>{label.split('—')[0].trim()}</Badge>;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus | string }) {
  const tones: Record<string, string> = {
    nouveau: 'blue',
    qualifie: 'amber',
    en_cours: 'amber',
    en_attente: 'gray',
    resolu: 'green',
    clos: 'gray',
  };
  const label = INCIDENT_STATUS_LABELS[status as IncidentStatus] ?? status;
  return <Badge tone={tones[status] ?? 'neutral'}>{label}</Badge>;
}

export function CiStatusBadge({ status }: { status: CiStatus | string }) {
  const tones: Record<string, string> = {
    en_service: 'green',
    en_maintenance: 'amber',
    en_stock: 'blue',
    commande: 'blue',
    reforme: 'red',
    retire: 'gray',
  };
  const label = CI_STATUS_LABELS[status as CiStatus] ?? status;
  return <Badge tone={tones[status] ?? 'neutral'}>{label}</Badge>;
}

export function CiCriticalityBadge({ criticality }: { criticality: CiCriticality | string }) {
  const tones: Record<string, string> = {
    vitale: 'red',
    critique: 'amber',
    importante: 'blue',
    standard: 'gray',
  };
  const label = CI_CRITICALITY_LABELS[criticality as CiCriticality] ?? criticality;
  return <Badge tone={tones[criticality] ?? 'neutral'}>{label.split('(')[0].trim()}</Badge>;
}

export function ChangeStatusBadge({ status }: { status: ChangeStatus | string }) {
  const tones: Record<string, string> = {
    brouillon: 'gray',
    soumis: 'blue',
    analyse_impact: 'amber',
    en_attente_cab: 'amber',
    approuve: 'green',
    rejete: 'red',
    en_cours_deploiement: 'blue',
    applique: 'green',
    revue_post_changement: 'blue',
    clos: 'gray',
    echec: 'red',
  };
  const label = CHANGE_STATUS_LABELS[status as ChangeStatus] ?? status;
  return <Badge tone={tones[status] ?? 'neutral'}>{label}</Badge>;
}

export function ChangeRiskBadge({ risk }: { risk: ChangeRisk | string }) {
  const tones: Record<string, string> = {
    faible: 'green',
    modere: 'blue',
    eleve: 'amber',
    critique: 'red',
  };
  const label = CHANGE_RISK_LABELS[risk as ChangeRisk] ?? risk;
  return <Badge tone={tones[risk] ?? 'neutral'}>{label}</Badge>;
}