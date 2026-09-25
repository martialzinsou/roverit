/**
 * RoverIt — Reports.tsx
 * Auteur : Martial Zinsou
 */
/**
 * Rapports & export : KPIs de valorisation, export PDF de fiches techniques
 * et liste des machines prêtes au déploiement.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LIFECYCLE_LABELS,
  type Machine,
} from '@roverit/shared';
import { useDashboardKpis, useMachines } from '../lib/hooks';
import { Button, Card, EmptyState, Spinner, StatTile } from '../components/ui';
import { fmtMoney, scoreColor } from '../lib/format';

/** Page de génération de rapports et d'export PDF. */
export default function Reports() {
  const kpis = useDashboardKpis();
  const machines = useMachines();
  const [machineId, setMachineId] = useState('');

  const selected = useMemo(
    () => machines.data.find((m) => m.id === machineId) ?? null,
    [machines.data, machineId],
  );

  const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';

  if (kpis.loading) return <Spinner />;
  const k = kpis.data;

  const deployed = machines.data.filter((m) => m.status === 'pret_deploiement');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Rapports & exportation</h1>
        <p className="text-sm text-ink-400">Fiches techniques PDF, KPIs de valorisation et bilan de reconditionnement.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Références pièces" value={k?.partsTotal ?? 0} />
        <StatTile label="Valeur du stock" value={fmtMoney(k?.partsStockValue)} />
        <StatTile label="Score stabilité moyen" value={k?.avgStabilityScore != null ? `${k.avgStabilityScore}/100` : '—'} accent={k && k.avgStabilityScore != null ? scoreColor(k.avgStabilityScore) : undefined} />
        <StatTile label="Taux machines prêtes" value={k?.machinesTotal ? `${Math.round((k.byStatus.pret_deploiement / k.machinesTotal) * 100)}%` : '—'} sub={`${k?.byStatus.pret_deploiement ?? 0}/${k?.machinesTotal ?? 0} machines`} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Export PDF — fiche technique</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-400">Machine</label>
            <select
              className="input"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
            >
              <option value="">— Sélectionner une machine —</option>
              {machines.data.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          {selected ? (
            <a href={`${apiBase}/reports/${selected.id}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="primary">⤓ Télécharger la fiche PDF</Button>
            </a>
          ) : (
            <Button disabled>⤓ Télécharger la fiche PDF</Button>
          )}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Le rapport inclut : spécifications, composants, état de santé, benchmarks thermiques et historique des interventions.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Machines prêtes pour déploiement / vente</h2>
        {deployed.length === 0 ? (
          <EmptyState message="Aucune machine prête actuellement." />
        ) : (
          <ul className="divide-y divide-ink-800">
            {deployed.map((m: Machine) => (
              <li key={m.id}>
                <Link to={`/machines/${m.id}`} className="flex items-center justify-between py-2 hover:bg-ink-800/50">
                  <div>
                    <div className="text-sm font-medium text-ink-100">{m.name}</div>
                    <div className="text-xs text-ink-400">{m.cpu} · {m.ram_gb ?? '—'} Go · {LIFECYCLE_LABELS[m.status]}</div>
                  </div>
                  <a href={`${apiBase}/reports/${m.id}/pdf`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Button className="!py-1 text-xs">PDF</Button>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-300">Bilan GPU upgrade vs performances</h2>
        <p className="text-xs text-ink-500">
          Coût des pièces engagées vs gains de score de stabilité — données agrégées depuis le catalogue et les benchmarks.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-ink-950/60 p-3">
            <div className="text-xs text-ink-400">Score avant révision (moyenne)</div>
            <div className="text-lg font-bold text-ink-100">{k?.avgStabilityScore != null ? `${k.avgStabilityScore}/100` : '—'}</div>
          </div>
          <div className="rounded-lg bg-ink-950/60 p-3">
            <div className="text-xs text-ink-400">Machines livrées (30 j)</div>
            <div className="text-lg font-bold text-emerald-400">{k?.machinesDeployed30d ?? 0}</div>
          </div>
          <div className="rounded-lg bg-ink-950/60 p-3">
            <div className="text-xs text-ink-400">Interventions tracées (30 j)</div>
            <div className="text-lg font-bold text-brand-400">{k?.interventions30d ?? 0}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}