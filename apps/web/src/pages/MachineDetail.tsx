/**
 * Page de détail d'une machine : caractéristiques, benchmarks thermiques,
 * composants et ordres de travail associés.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  COMPONENT_KIND_LABELS,
  LIFECYCLE_LABELS,
  LIFECYCLE_STATUSES,
  newId,
  type Component,
  type ComponentKind,
  type LifecycleStatus,
  type MachineDetail,
} from '@roverit/shared';
import { api } from '../lib/api';
import { canEdit, useAuth } from '../lib/auth';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
} from '../components/ui';
import { MachineStatusBadge } from '../components/StatusBadge';
import { fmtDate, fmtPct, scoreColor, tempColor } from '../lib/format';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Types de composants proposés lors de l'ajout d'un composant. */
const KIND_OPTIONS: ComponentKind[] = ['cpu', 'gpu', 'ram', 'storage', 'battery', 'motherboard', 'cooling', 'other'];

/** Détail complet d'une machine : specs, graphique thermique et composants. */
export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const editable = canEdit(user?.role);
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [compOpen, setCompOpen] = useState(false);
  const [compForm, setCompForm] = useState({ kind: 'storage' as ComponentKind, name: '', model: '', health: 'OK', notes: '' });

  const load = () => {
    if (!id) return;
    setLoading(true);
    api<MachineDetail>(`/machines/${id}`)
      .then(setMachine)
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const setStatus = async (status: LifecycleStatus) => {
    if (!machine) return;
    const updated = await api<MachineDetail>(`/machines/${machine.id}`, {
      method: 'PATCH',
      body: { ...machine, status },
      queueOffline: true,
    });
    setMachine(updated);
  };

  const addComponent = async (e: FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    const component: Component = {
      id: newId(),
      machine_id: machine.id,
      kind: compForm.kind,
      name: compForm.name.trim(),
      model: compForm.model.trim() || null,
      health: compForm.health || null,
      notes: compForm.notes.trim() || null,
      installed_at: new Date().toISOString(),
    };
    await api(`/machines/${machine.id}/components`, {
      method: 'POST',
      body: component,
      queueOffline: true,
    });
    setCompOpen(false);
    setCompForm({ kind: 'storage', name: '', model: '', health: 'OK', notes: '' });
    load();
  };

  if (loading || !machine) return <Spinner />;

  const chartData = [...machine.benchmarks]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .map((b) => ({
      name: b.started_at.slice(0, 10),
      avg_temp: b.avg_temp_c,
      max_temp: b.max_temp_c,
      score: b.score,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/machines" className="text-xs text-brand-400 hover:underline">← Inventaire</Link>
          <h1 className="text-2xl font-bold text-ink-100">{machine.name}</h1>
          <p className="text-sm text-ink-400">
            {machine.manufacturer ?? '—'} {machine.model ?? ''} · {machine.serial ?? 'sans série'}
            {machine.client ? ` · Client : ${machine.client}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MachineStatusBadge status={machine.status} label={LIFECYCLE_LABELS[machine.status]} />
          {editable ? (
            <Select
              value={machine.status}
              onChange={(e) => void setStatus(e.target.value as LifecycleStatus)}
              className="w-56"
            >
              {LIFECYCLE_STATUSES.map((s) => (
                <option key={s} value={s}>{LIFECYCLE_LABELS[s]}</option>
              ))}
            </Select>
          ) : null}
          <a href={`${import.meta.env.VITE_API_URL ?? '/api/v1'}/reports/${machine.id}/pdf`} target="_blank" rel="noreferrer">
            <Button>PDF</Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="text-xs text-ink-400">CPU</div>
          <div className="mt-1 text-sm font-semibold text-ink-100">{machine.cpu ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-400">GPU</div>
          <div className="mt-1 text-sm font-semibold text-ink-100">{machine.gpu ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-400">RAM</div>
          <div className="mt-1 text-sm font-semibold text-ink-100">{machine.ram_gb != null ? `${machine.ram_gb} Go` : '—'}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-400">Stockage</div>
          <div className="mt-1 text-sm font-semibold text-ink-100">{machine.storage_tb != null ? `${machine.storage_tb} To` : '—'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-300">Évolution thermique (benchmarks)</h2>
            <Link to="/benchmark" className="text-xs text-brand-400 hover:underline">Lancer un test →</Link>
          </div>
          {chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-500">Aucun benchmark enregistré.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} yAxisId="left" unit="°C" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f59e0b"
                  fontSize={11}
                  domain={[0, 100]}
                  unit=""
                />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="avg_temp" name="Temp. moyenne °C" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="max_temp" name="Temp. max °C" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="score" name="Score" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {machine.benchmarks.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-ink-950/60 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-ink-100">{b.kind}</span>
                  <span className="ml-2 text-xs text-ink-500">{fmtDate(b.started_at)} · {b.duration_s}s</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`font-bold ${scoreColor(b.score)}`}>Score {b.score ?? '—'}</span>
                  <span className={tempColor(b.avg_temp_c)}>{b.avg_temp_c ?? '—'}°C moy.</span>
                  <span className={tempColor(b.max_temp_c)}>{b.max_temp_c ?? '—'}°C max</span>
                  <span className="text-ink-400">{fmtPct(b.avg_cpu_pct)} CPU</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-300">Composants ({machine.components.length})</h2>
            {editable ? (
              <Button onClick={() => setCompOpen(true)}>+ Ajouter</Button>
            ) : null}
          </div>
          <ul className="space-y-3">
            {machine.components.map((c) => (
              <li key={c.id} className="border-b border-ink-800 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-100">{COMPONENT_KIND_LABELS[c.kind]}</span>
                  <span className={`text-xs ${c.health === 'OK' ? 'text-emerald-400' : 'text-amber-400'}`}>{c.health ?? '—'}</span>
                </div>
                <div className="text-sm text-ink-300">{c.name}</div>
                {c.model ? <div className="text-xs text-ink-500">{c.model}</div> : null}
                {c.notes ? <div className="text-xs text-ink-400">💬 {c.notes}</div> : null}
                <div className="text-[11px] text-ink-600">{fmtDate(c.installed_at)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Ordres de travail</h2>
        {machine.work_orders.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-500">Aucun OT.</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {machine.work_orders.map((wo) => (
              <li key={wo.id}>
                <Link to={`/work-orders/${wo.id}`} className="flex items-center justify-between py-2 hover:bg-ink-800/50">
                  <span className="text-sm font-medium text-ink-100">{wo.title}</span>
                  <span className="text-xs uppercase text-ink-500">{wo.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={compOpen} onClose={() => setCompOpen(false)} title="Ajouter un composant">
        <form onSubmit={addComponent} className="space-y-4">
          <Field label="Type">
            <Select value={compForm.kind} onChange={(e) => setCompForm({ ...compForm, kind: e.target.value as ComponentKind })}>
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{COMPONENT_KIND_LABELS[k]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nom">
            <Input value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} required placeholder="Pâte thermique MX-6" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modèle">
              <Input value={compForm.model} onChange={(e) => setCompForm({ ...compForm, model: e.target.value })} />
            </Field>
            <Field label="État de santé">
              <Select value={compForm.health} onChange={(e) => setCompForm({ ...compForm, health: e.target.value })}>
                <option>OK</option>
                <option>À surveiller</option>
                <option>Remplacé</option>
                <option>En test</option>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Input value={compForm.notes} onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setCompOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary">Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}