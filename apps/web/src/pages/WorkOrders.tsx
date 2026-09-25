/**
 * RoverIt — WorkOrders.tsx
 * Auteur : Martial Zinsou
 */
/**
 * Liste des ordres de travail : filtres par statut, création d'un OT
 * et affichage des priorités/statuts sous forme de cartes.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  newId,
  type Machine,
  type WorkOrder,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '@roverit/shared';
import { api } from '../lib/api';
import { canEdit, useAuth } from '../lib/auth';
import { useMachines, useWorkOrders } from '../lib/hooks';
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui';
import { PriorityBadge, WoStatusBadge } from '../components/StatusBadge';
import { fmtDate } from '../lib/format';

/** Liste filtrable des OT et formulaire de création. */
export default function WorkOrders() {
  const { user } = useAuth();
  const editable = canEdit(user?.role);
  const orders = useWorkOrders();
  const machines = useMachines();
  const [status, setStatus] = useState<WorkOrderStatus | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    machine_id: '',
    title: '',
    priority: 'normale' as WorkOrderPriority,
    assignee: '',
  });

  const filtered = useMemo(() => {
    const all = (orders.data as (WorkOrder & { machine_name?: string })[]).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    return status === 'all' ? all : all.filter((o) => o.status === status);
  }, [orders.data, status]);

  const machineName = (id: string) => machines.data.find((m) => m.id === id)?.name ?? id;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/work-orders', {
        method: 'POST',
        body: {
          id: newId(),
          machine_id: form.machine_id,
          title: form.title.trim(),
          priority: form.priority,
          assignee: form.assignee.trim() || null,
        },
        queueOffline: true,
      });
      setOpen(false);
      setForm({ machine_id: '', title: '', priority: 'normale', assignee: '' });
      orders.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (orders.loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">Ordres de travail</h1>
          <p className="text-sm text-ink-400">Workflow de reconditionnement, checklists et traçabilité des interventions.</p>
        </div>
        {editable ? (
          <Button variant="primary" onClick={() => setOpen(true)}>+ Nouvel OT</Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${status === 'all' ? 'border-brand-600 bg-brand-600/15 text-brand-300' : 'border-ink-700 text-ink-300 hover:bg-ink-800'}`}
          onClick={() => setStatus('all')}
        >
          Tous ({orders.data.length})
        </button>
        {WORK_ORDER_STATUSES.map((s) => (
          <button
            key={s}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${status === s ? 'border-brand-600 bg-brand-600/15 text-brand-300' : 'border-ink-700 text-ink-300 hover:bg-ink-800'}`}
            onClick={() => setStatus(s)}
          >
            {WORK_ORDER_STATUS_LABELS[s]} ({orders.data.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Aucun ordre de travail." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <Link key={o.id} to={`/work-orders/${o.id}`}>
              <Card className="h-full transition-colors hover:border-brand-700">
                <div className="flex items-center justify-between gap-2">
                  <PriorityBadge priority={o.priority} label={WORK_ORDER_PRIORITY_LABELS[o.priority]} />
                  <WoStatusBadge status={o.status} label={WORK_ORDER_STATUS_LABELS[o.status]} />
                </div>
                <h3 className="mt-3 font-semibold text-ink-100">{o.title}</h3>
                <p className="mt-1 text-xs text-ink-400">{machineName(o.machine_id)}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                  <span>{o.assignee ? `👤 ${o.assignee}` : 'Non assigné'}</span>
                  <span>{fmtDate(o.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvel ordre de travail">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div> : null}
          <Field label="Machine">
            <Select value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })} required>
              <option value="">— Sélectionner —</option>
              {machines.data.map((m: Machine) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Titre">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Remplacement pâte thermique + test" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priorité">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrderPriority })}>
                {WORK_ORDER_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{WORK_ORDER_PRIORITY_LABELS[p]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Assigné à">
              <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Karim T." />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Création…' : 'Créer l‘OT'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}