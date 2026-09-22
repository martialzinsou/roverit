/**
 * Détail d'un ordre de travail : checklist d'intervention, enregistrement
 * d'interventions et changement de statut.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  type ChecklistItem,
  type Intervention,
  type WorkOrder,
  type WorkOrderStatus,
} from '@roverit/shared';
import { api } from '../lib/api';
import { canEdit, useAuth } from '../lib/auth';
import { Button, Card, Field, Input, Select, Spinner } from '../components/ui';
import { PriorityBadge, WoStatusBadge } from '../components/StatusBadge';
import { fmtDateTime } from '../lib/format';
import { Link as RouterLink } from 'react-router-dom';

/** Détail d'un OT enrichi : nom de machine, interventions et checklist. */
interface WorkOrderDetail extends WorkOrder {
  machine_name: string;
  interventions: (Intervention & { user_name?: string })[];
  checklist: ChecklistItem[];
}

/** Checklist, historique d'interventions et statut d'un OT. */
export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const editable = canEdit(user?.role);
  const [wo, setWo] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api<WorkOrderDetail>(`/work-orders/${id}`)
      .then(setWo)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const setStatus = async (status: WorkOrderStatus) => {
    if (!wo) return;
    const updated = await api<WorkOrderDetail>(`/work-orders/${wo.id}`, {
      method: 'PATCH',
      body: { status },
      queueOffline: true,
    });
    setWo((w) => (w ? { ...w, status } : w));
    void updated;
  };

  const addIntervention = async (e: FormEvent) => {
    e.preventDefault();
    if (!wo || !action.trim()) return;
    setSaving(true);
    try {
      await api(`/work-orders/${wo.id}/interventions`, {
        method: 'POST',
        body: { action: action.trim(), notes: notes.trim() || null },
        queueOffline: true,
      });
      setAction('');
      setNotes('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = async (item: ChecklistItem) => {
    if (!wo) return;
    await api(`/work-orders/${wo.id}/checklist/${item.id}`, {
      method: 'PATCH',
      body: { done: !item.done },
      queueOffline: true,
    });
    load();
  };

  if (loading || !wo) return <Spinner />;

  const doneCount = wo.checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/work-orders" className="text-xs text-brand-400 hover:underline">← Ordres de travail</Link>
          <h1 className="text-2xl font-bold text-ink-100">{wo.title}</h1>
          <p className="text-sm text-ink-400">
            <RouterLink to={`/machines/${wo.machine_id}`} className="text-brand-300 hover:underline">{wo.machine_name}</RouterLink>
            {' · '}Assigné : {wo.assignee ?? 'Non assigné'} · Créé le {fmtDateTime(wo.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={wo.priority} label={WORK_ORDER_PRIORITY_LABELS[wo.priority]} />
          <WoStatusBadge status={wo.status} label={WORK_ORDER_STATUS_LABELS[wo.status]} />
          {editable ? (
            <Select value={wo.status} onChange={(e) => void setStatus(e.target.value as WorkOrderStatus)} className="w-40">
              {WORK_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{WORK_ORDER_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">
            Checklist d'intervention ({doneCount}/{wo.checklist.length})
          </h2>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${wo.checklist.length ? (doneCount / wo.checklist.length) * 100 : 0}%` }}
            />
          </div>
          <ul className="space-y-2">
            {wo.checklist.map((item) => (
              <li key={item.id}>
                <button
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    item.done ? 'bg-emerald-950/40 text-ink-400 line-through' : 'bg-ink-950/60 text-ink-100 hover:bg-ink-800'
                  }`}
                  onClick={() => editable && void toggleChecklist(item)}
                  disabled={!editable}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                      item.done ? 'border-emerald-600 bg-emerald-600 text-ink-950' : 'border-ink-600'
                    }`}
                  >
                    {item.done ? '✓' : ''}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">
            Enregistrer une intervention
          </h2>
          <form onSubmit={addIntervention} className="space-y-3">
            <Field label="Action">
              <Input value={action} onChange={(e) => setAction(e.target.value)} required placeholder="Remplacement pâte thermique MX-6" />
            </Field>
            <Field label="Notes / pièces utilisées">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="CPU + GPU · pièce ref besoin" />
            </Field>
            <Button type="submit" variant="primary" disabled={saving || !editable}>
              {saving ? 'Enregistrement…' : "+ Ajouter l'intervention"}
            </Button>
          </form>

          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-ink-300">Historique ({wo.interventions.length})</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {wo.interventions.map((i) => (
              <div key={i.id} className="border-l-2 border-brand-700 pl-3">
                <div className="text-sm font-medium text-ink-100">{i.action}</div>
                <div className="text-xs text-ink-400">
                  {i.user_name ?? '? '} · {fmtDateTime(i.created_at)}
                </div>
                {i.notes ? <div className="mt-1 text-xs text-ink-500">💬 {i.notes}</div> : null}
              </div>
            ))}
            {wo.interventions.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-500">Aucune intervention enregistrée.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}