/**
 * AIOS Dashboard - Tableau de bord principal AIOS
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, StatTile, Spinner, Badge } from '../../components/ui';

interface AiosDashboardKpis {
  activeModels: number;
  totalModels: number;
  activeAgents: number;
  totalAgents: number;
  activeWorkflows: number;
  totalWorkflows: number;
  requests24h: number;
  estimatedCost: number;
}

interface AIModel {
  id: string;
  name: string;
  type: string;
  provider: string;
  parameters: number;
  status: string;
}

interface AIAgent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: string;
  capabilities?: string[];
}

export default function AiosDashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [recentModels, setRecentModels] = useState<any[]>([]);
  const [recentAgents, setRecentAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kpiRes, modelsRes, agentsRes] = await Promise.all([
        api<any>('/aios/dashboard'),
        api<any[]>('/aios/models?limit=4'),
        api<any[]>('/aios/agents?limit=4'),
      ]);
      setKpis(kpiRes);
      setRecentModels(modelsRes);
      setRecentAgents(agentsRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading && !kpis) {
    return <Spinner label="Chargement AIOS…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              AIOS. <span className="imac-gradient-text">Intelligence.</span>
            </h1>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-white/70 border border-white/[0.08]">
              AI Operating System
            </span>
          </div>
          <p className="mt-1 text-sm text-white/60">
            Système d'exploitation IA — Agents, Modèles, Workflows, Analytics
          </p>
          <div className="mt-1 text-xs text-white/40 font-medium">
            Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/aios/models">
            <button className="btn-secondary">+ Nouveau Modèle</button>
          </Link>
          <Link to="/aios/agents">
            <button className="btn-primary">+ Nouvel Agent</button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile
          label="Modèles Actifs"
          value={kpis?.activeModels ?? 0}
          sub={`${kpis?.totalModels ?? 0} au total`}
          accent="text-sky-400"
        />
        <StatTile
          label="Agents Déployés"
          value={kpis?.activeAgents ?? 0}
          sub={`${kpis?.totalAgents ?? 0} disponibles`}
          accent="text-purple-400"
        />
        <StatTile
          label="Workflows Actifs"
          value={kpis?.activeWorkflows ?? 0}
          sub={`${kpis?.totalWorkflows ?? 0} créés`}
          accent="text-emerald-400"
        />
        <StatTile
          label="Requêtes/24h"
          value={kpis?.requests24h ?? 0}
          sub="Trafic API IA"
          accent="text-amber-400"
        />
        <StatTile
          label="Coût Estimé"
          value={`$${kpis?.estimatedCost ?? 0}`}
          sub="Budget mensuel"
          accent="text-rose-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Derniers Modèles</h2>
            <a href="/aios/models" className="text-xs text-sky-400 hover:underline">Tout voir</a>
          </div>
          <div className="space-y-3">
            {recentModels.map((model) => (
              <a key={model.id} href={`/aios/models/${model.id}`} className="card flex items-center gap-4 p-3 hover:border-sky-500/50 transition">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0,113,227,0.2), rgba(168,85,247,0.2))' }}>
                  <span className="text-xl">🧠</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{model.name}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium backdrop-blur-xl bg-sky-500/15 text-sky-300 border-sky-500/20">{model.type}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium backdrop-blur-xl ${model.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-white/[0.05] text-white/40 border-white/[0.08]'}`}>{model.status}</span>
                  </div>
                  <div className="text-xs text-white/40">{model.provider} • {model.parameters}B params</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Agents Récents</h2>
            <a href="/aios/agents" className="text-xs text-purple-400 hover:underline">Tout voir</a>
          </div>
          <div className="space-y-3">
            {recentAgents.map((agent) => (
              <a key={agent.id} href={`/aios/agents/${agent.id}`} className="card flex items-center gap-4 p-3 hover:border-purple-500/50 transition">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(244,63,94,0.2))' }}>
                  <span className="text-xl">🤖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{agent.name}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium backdrop-blur-xl bg-purple-500/15 text-purple-300 border-purple-500/20">{agent.type}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium backdrop-blur-xl ${agent.status === 'running' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : agent.status === 'idle' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-white/[0.05] text-white/40 border-white/[0.08]'}`}>{agent.status}</span>
                  </div>
                  <div className="text-xs text-white/40">{agent.model} • {agent.capabilities?.join(', ') || 'Aucune capacité'}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <a href="/aios/workflows" className="group">
          <div className="card h-full border-white/[0.06] transition hover:border-sky-500/50 hover:bg-white/[0.04]">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-bold text-white group-hover:text-sky-300">Workflows IA</div>
            <div className="text-xs text-white/40 mt-1">Créer, orchestrer, automatiser</div>
          </div>
        </a>
        <a href="/aios/analytics" className="group">
          <div className="card h-full border-white/[0.06] transition hover:border-emerald-500/50 hover:bg-white/[0.04]">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-bold text-white group-hover:text-emerald-300">Analytics IA</div>
            <div className="text-xs text-white/40 mt-1">Métriques, coûts, performance</div>
          </div>
        </a>
        <a href="/aios/settings" className="group">
          <div className="card h-full border-white/[0.06] transition hover:border-rose-500/50 hover:bg-white/[0.04]">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-bold text-white group-hover:text-rose-300">Paramètres AIOS</div>
            <div className="text-xs text-white/40 mt-1">Modèles, agents, sécurité, coûts</div>
          </div>
        </a>
      </div>
    </div>
  );
}