/**
 * AIOS Analytics - Tableau de bord analytics IA
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Card, StatTile, Spinner, Button, Select, EmptyState } from '../../components/ui';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

interface AnalyticsData {
  requests_over_time: { date: string; count: number; cost: number; tokens: number }[];
  model_usage: { model: string; requests: number; cost: number }[];
  agent_usage: { agent: string; executions: number; success_rate: number }[];
  cost_breakdown: { period: string; inference: number; training: number; hosting: number }[];
  total_requests: number;
  total_cost: number;
  avg_latency: number;
  success_rate: number;
}

export default function AiosAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api<any>(`/aios/analytics?period=${period}`);
      setData(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [period]);

  const COLORS = ['#0071e3', '#a855f7', '#f43f5e', '#f97316', '#eab308', '#10b981', '#e5e5ea'];

  if (loading && !data) {
    return <Spinner label="Chargement des analytics IA…" />;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Analytics IA. <span className="imac-gradient-text">Insights.</span>
            </h1>
            <p className="mt-1 text-sm text-white/60">Métriques, coûts et performance de votre écosystème IA</p>
            <div className="mt-1 text-xs text-white/40 font-medium">Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span></div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="1d">24h</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
            </Select>
          </div>
        </div>
        <Card className="flex items-center justify-center h-64">
          <EmptyState message="Aucune donnée analytics disponible" />
        </Card>
      </div>
    );
  }

  const k = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Analytics IA. <span className="imac-gradient-text">Insights.</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">Métriques, coûts et performance de votre écosystème IA</p>
          <div className="mt-1 text-xs text-white/40 font-medium">Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span></div>
        </div>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40">
          <option value="1d">24h</option>
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="90d">90 jours</option>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Requêtes Totales" value={k.total_requests?.toLocaleString() ?? 0} sub={`+${((k.requests_change || 0) * 100).toFixed(1)}%`} accent="text-sky-400" />
        <StatTile label="Coût Total" value={`$${k.total_cost?.toFixed(2) ?? 0}`} sub={`+${((k.cost_change || 0) * 100).toFixed(1)}%`} accent="text-rose-400" />
        <StatTile label="Latence Moyenne" value={`${k.avg_latency?.toFixed(0) ?? 0}ms`} sub="P95 < 2s" accent="text-emerald-400" />
        <StatTile label="Taux de Succès" value={`${(k.success_rate * 100).toFixed(1)}%`} sub="Objectif > 99%" accent="text-amber-400" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Requêtes dans le temps */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-white">Requêtes & Coûts dans le temps</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={k.requests_over_time || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)' }} />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#0071e3" strokeWidth={2} dot={false} name="Requêtes" yAxisId="left" />
              <Line type="monotone" dataKey="cost" stroke="#f43f5e" strokeWidth={2} dot={false} name="Coût ($)" yAxisId="right" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition par modèle */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-white">Utilisation par Modèle</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={k.model_usage || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="requests" nameKey="model" label={({ model, percent }) => `${model} ${(percent * 100).toFixed(1)}%`} labelLine={false}>
                {(k.model_usage || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coûts par période */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-white">Évolution des Coûts</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={k.cost_breakdown || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis dataKey="period" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)' }} />
              <Legend />
              <Bar dataKey="inference" fill="#0071e3" name="Inférence" radius={[0, 4, 4, 0]} />
              <Bar dataKey="training" fill="#a855f7" name="Entraînement" radius={[0, 4, 4, 0]} />
              <Bar dataKey="hosting" fill="#f97316" name="Hébergement" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Agents */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-white">Top Agents par Exécutions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={k.agent_usage || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis dataKey="agent" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} width={100} />
              <Tooltip contentStyle={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)' }} />
              <Legend />
              <Bar dataKey="executions" fill="#a855f7" name="Exécutions" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tableau récap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-bold text-white mb-3">Utilisation par Modèle</h2>
          <div className="space-y-3">
            {(k.model_usage || []).map((m: any, i: number) => (
              <div key={m.model} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <div>
                    <div className="font-medium text-white">{m.model}</div>
                    <div className="text-xs text-white/40">{m.requests.toLocaleString()} requêtes • ${m.cost.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{((m.requests / (k.total_requests || 1)) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-white/40">{m.requests.toLocaleString()} req</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-white mb-3">Performance Agents</h2>
          <div className="space-y-3">
            {(k.agent_usage || []).map((a: any, i: number) => (
              <div key={a.agent} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <div>
                    <div className="font-medium text-white">{a.agent}</div>
                    <div className="text-xs text-white/40">{a.executions.toLocaleString()} exécutions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{a.success_rate * 100}%</div>
                  <div className="text-xs text-white/40">Taux de succès</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}