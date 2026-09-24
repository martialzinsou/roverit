/**
 * Tableau de bord : Thème Apple iMac (https://www.apple.com/fr/imac/)
 * KPIs de supervision, répartition du parc aux 7 couleurs iMac, priorités des
 * OT et listes des dernières machines et interventions.
 * Auteur : Martial Zinsou
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_STATUSES,
  WORK_ORDER_PRIORITY_LABELS,
  type WorkOrderPriority,
} from '@roverit/shared';
import { useDashboardKpis, useMachines, useWorkOrders } from '../lib/hooks';
import { canEdit, useAuth } from '../lib/auth';
import { Card, Spinner, StatTile } from '../components/ui';

/** Couleurs inspirées de la palette iMac pour les statuts du parc. */
const PIE_COLORS: Record<string, string> = {
  en_attente_diagnostic: '#f97316', // Orange iMac
  en_cours_upgrade: '#0071e3',      // Bleu iMac
  en_test_thermique: '#eab308',     // Jaune iMac
  pret_deploiement: '#10b981',      // Vert iMac
  archive: '#86868b',              // Argent / Gris iMac
};

/** Vue d'ensemble du parc : stats, graphiques et listes récentes. */
export default function Dashboard() {
  const { user } = useAuth();
  const kpis = useDashboardKpis();
  const machines = useMachines();
  const orders = useWorkOrders();

  const pieData = useMemo(() => {
    const data = kpis.data;
    if (!data) return [];
    return LIFECYCLE_STATUSES.map((s) => ({
      name: LIFECYCLE_LABELS[s],
      value: data.byStatus[s],
      color: PIE_COLORS[s],
    })).filter((d) => d.value > 0);
  }, [kpis.data]);

  const recentOrders = useMemo(
    () => [...orders.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    [orders.data],
  );

  const priorityCounts = useMemo(() => {
    const counters: Record<string, number> = { basse: 0, normale: 0, haute: 0, critique: 0 };
    for (const o of orders.data) counters[o.priority]++;
    return Object.entries(counters).map(([k, v]) => ({
      name: WORK_ORDER_PRIORITY_LABELS[k as WorkOrderPriority],
      value: v,
    }));
  }, [orders.data]);

  if (kpis.loading) return <Spinner />;

  const k = kpis.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Tableau de bord. <span className="imac-gradient-text">Vue d'ensemble.</span>
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Supervision du parc de stations, benchmarks thermiques et KPIs de reconditionnement.
          </p>
          <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
        </div>
        {canEdit(user?.role) ? (
          <Link to="/machines" className="btn-primary">
            + Nouvelle machine
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Machines (CMDB)" value={k?.machinesTotal ?? 0} sub={`${k?.machinesDeployed30d ?? 0} livrées en 30 j`} />
        <StatTile
          label="Score stabilité moyen"
          value={k?.avgStabilityScore != null ? `${k.avgStabilityScore}/100` : '—'}
          accent={k && k.avgStabilityScore != null && k.avgStabilityScore >= 85 ? 'text-emerald-400' : 'text-brand-400'}
        />
        <StatTile label="OT ouverts" value={k?.workOrdersOpen ?? 0} sub={`${k?.workOrdersTotal ?? 0} au total`} />
        <StatTile label="Interventions (30 j)" value={k?.interventions30d ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Répartition du parc</h2>
          {pieData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-500">Aucune machine.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Priorités des OT</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priorityCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#353535" />
              <XAxis dataKey="name" stroke="#888888" />
              <YAxis allowDecimals={false} stroke="#888888" />
              <Tooltip />
              <Bar dataKey="value" name="OT" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Dernières machines</h2>
          <ul className="divide-y divide-ink-800">
            {machines.data.slice(0, 5).map((m) => {
              const tone = PIE_COLORS[m.status] ?? '#6d6d6d';
              return (
                <li key={m.id}>
                  <Link to={`/machines/${m.id}`} className="flex items-center justify-between py-2 hover:bg-ink-800/50">
                    <div>
                      <div className="text-sm font-medium text-ink-100">{m.name}</div>
                      <div className="text-xs text-ink-400">
                        {m.cpu} · {m.ram_gb ?? '—'} Go · {m.storage_tb ?? '—'} To
                      </div>
                    </div>
                    <span className="flex items-center gap-2 text-xs text-ink-400">
                      <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
                      {LIFECYCLE_LABELS[m.status]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Ordres de travail récents</h2>
          <ul className="divide-y divide-ink-800">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link to={`/work-orders/${o.id}`} className="flex items-center justify-between py-2 hover:bg-ink-800/50">
                  <div>
                    <div className="text-sm font-medium text-ink-100">{o.title}</div>
                    <div className="text-xs text-ink-400">
                      {o.machine_id} · {WORK_ORDER_PRIORITY_LABELS[o.priority]}
                    </div>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-ink-500">{o.status}</span>
                </Link>
              </li>
            ))}
            {recentOrders.length === 0 ? <li className="py-6 text-center text-sm text-ink-500">Aucun OT.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}