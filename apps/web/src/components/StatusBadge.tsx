/**
 * Badges de statut métier colorés (cycle de vie machine, OT, priorités).
 * Mappe chaque statut à un ton de la palette et affiche un libellé par défaut.
 */
import type { LifecycleStatus, WorkOrderStatus, WorkOrderPriority } from '@roverit/shared';
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