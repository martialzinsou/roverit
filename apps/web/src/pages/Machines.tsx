/**
 * RoverIt — Machines.tsx
 * Auteur : Martial Zinsou
 */
/**
 * Page d'inventaire (CMDB) : liste filtrable des machines, création via
 * modal et détection matérielle locale en mode desktop.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_STATUSES,
  newId,
  type LifecycleStatus,
  type Machine,
} from '@roverit/shared';
import { api } from '../lib/api';
import { canEdit, useAuth } from '../lib/auth';
import { useMachines } from '../lib/hooks';
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui';
import { MachineStatusBadge } from '../components/StatusBadge';
import { fmtDate } from '../lib/format';
import { isDesktop, hardwareProfile, saveLocalMachine } from '../lib/desktop';

/** Liste et création des machines de la CMDB, avec filtrage par statut. */
export default function Machines() {
  const { user } = useAuth();
  const { data, loading, reload } = useMachines();
  const [filter, setFilter] = useState<LifecycleStatus | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    id: '',
    name: '',
    serial: '',
    manufacturer: '',
    model: '',
    cpu: '',
    ram_gb: '',
    storage_tb: '',
    gpu: '',
    status: 'en_attente_diagnostic' as LifecycleStatus,
  });

  const detected = useMemo(() => {
    const local = JSON.parse(localStorage.getItem('roverit.localprofile') ?? 'null');
    return local as Awaited<ReturnType<typeof hardwareProfile>> | null;
  }, [open]);

  const filtered = useMemo(() => {
    const list = [...data].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return filter === 'all' ? list : list.filter((m) => m.status === filter);
  }, [data, filter]);

  const detectHardware = async () => {
    try {
      const profile = await hardwareProfile();
      const prev = JSON.parse(localStorage.getItem('roverit.localprofile') ?? 'null');
      const prevInfo = prev as { cpu?: string; cpu_brand?: string; ram_total_gb?: number } | null;
      setForm((f) => ({
        ...f,
        manufacturer: f.manufacturer || 'Local',
        model: f.model || profile.hostname,
        cpu: f.cpu || profile.cpu_brand,
        ram_gb: f.ram_gb || String(Math.round(profile.ram_total_gb)) || String(prevInfo?.ram_total_gb ?? ''),
        storage_tb: f.storage_tb || String(profile.disks.reduce((a, d) => a + d.total_gb, 0) / 1024 || 0),
      }));
      localStorage.setItem('roverit.localprofile', JSON.stringify(profile));
    } catch {
      setError('Détection matérielle indisponible (mode web — utilisez le desktop).');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const id = form.id || newId();
    const payload: Machine = {
      id,
      name: form.name.trim(),
      client: null,
      serial: form.serial.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      cpu: form.cpu.trim() || null,
      ram_gb: form.ram_gb ? Number(form.ram_gb) : null,
      storage_tb: form.storage_tb ? Number(form.storage_tb) : null,
      gpu: form.gpu.trim() || null,
      status: form.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await api('/machines', { method: 'POST', body: payload, queueOffline: true });
      if (isDesktop()) {
        await saveLocalMachine({
          id,
          name: payload.name,
          cpu: payload.cpu,
          ram_gb: payload.ram_gb,
          gpu: payload.gpu,
        });
      }
      setOpen(false);
      setForm({
        id: '',
        name: '',
        serial: '',
        manufacturer: '',
        model: '',
        cpu: '',
        ram_gb: '',
        storage_tb: '',
        gpu: '',
        status: 'en_attente_diagnostic',
      });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">Inventaire & CMDB</h1>
          <p className="text-sm text-ink-400">Gestion des équipements, composants et compatibilité.</p>
        </div>
        {canEdit(user?.role) ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            + Nouvelle machine
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            filter === 'all' ? 'border-brand-600 bg-brand-600/15 text-brand-300' : 'border-ink-700 text-ink-300 hover:bg-ink-800'
          }`}
          onClick={() => setFilter('all')}
        >
          Toutes ({data.length})
        </button>
        {LIFECYCLE_STATUSES.map((s) => (
          <button
            key={s}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === s ? 'border-brand-600 bg-brand-600/15 text-brand-300' : 'border-ink-700 text-ink-300 hover:bg-ink-800'
            }`}
            onClick={() => setFilter(s)}
          >
            {LIFECYCLE_LABELS[s]} ({data.filter((m) => m.status === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Aucune machine dans cette catégorie." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-ink-800 bg-ink-950/60">
                <tr>
                  <th className="th">Machine</th>
                  <th className="th">CPU / GPU</th>
                  <th className="th">RAM</th>
                  <th className="th">Stockage</th>
                  <th className="th">Statut</th>
                  <th className="th">Mis à jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-ink-800/30">
                    <td className="td">
                      <Link to={`/machines/${m.id}`} className="font-semibold text-brand-300 hover:underline">
                        {m.name}
                      </Link>
                      <div className="text-xs text-ink-500">
                        {m.manufacturer ?? '—'} {m.model ?? ''} · {m.serial ?? 'sans série'}
                      </div>
                    </td>
                    <td className="td">
                      <div>{m.cpu ?? '—'}</div>
                      <div className="text-xs text-ink-500">{m.gpu ?? ''}</div>
                    </td>
                    <td className="td">{m.ram_gb != null ? `${m.ram_gb} Go` : '—'}</td>
                    <td className="td">{m.storage_tb != null ? `${m.storage_tb} To` : '—'}</td>
                    <td className="td">
                      <MachineStatusBadge status={m.status} label={LIFECYCLE_LABELS[m.status]} />
                    </td>
                    <td className="td text-ink-500">{fmtDate(m.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle machine">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div> : null}
          <div className="border-b border-ink-800 pb-3">
            <Button type="button" onClick={detectHardware} className="w-full" disabled={!isDesktop()}>
              {isDesktop() ? '🖥 Détection automatique du matériel' : 'Détection matérielle (mode desktop)'}
            </Button>
            {detected ? <p className="mt-2 text-xs text-ink-500">Profil local détecté : {detected.cpu_brand} · {Math.round(detected.ram_total_gb)} Go</p> : null}
          </div>
          <Field label="Nom">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Workstation Omega WS-05" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° de série">
              <Input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
            </Field>
            <Field label="Constructeur">
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </Field>
          </div>
          <Field label="Modèle">
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CPU">
              <Input value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} />
            </Field>
            <Field label="GPU">
              <Input value={form.gpu} onChange={(e) => setForm({ ...form, gpu: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="RAM (Go)">
              <Input type="number" min={0} value={form.ram_gb} onChange={(e) => setForm({ ...form, ram_gb: e.target.value })} />
            </Field>
            <Field label="Stockage (To)">
              <Input type="number" min={0} step="0.5" value={form.storage_tb} onChange={(e) => setForm({ ...form, storage_tb: e.target.value })} />
            </Field>
            <Field label="Statut">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LifecycleStatus })}>
                {LIFECYCLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{LIFECYCLE_LABELS[s]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Création…' : 'Créer la machine'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}