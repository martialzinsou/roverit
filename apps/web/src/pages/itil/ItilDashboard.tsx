/**
 * Tableau de bord DSI (ITIL v4) : supervision globale, respect des SLA,
 * gestion de crise (P1/P2), changements en attente CAB et métriques CMDB.
 * Auteur : Martial Zinsou
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, StatTile, Spinner, Button } from '../../components/ui';
import { IncidentPriorityBadge, IncidentStatusBadge, ChangeStatusBadge } from '../../components/StatusBadge';
import type { ItilDashboardKpis, Incident, ChangeRequest } from '@roverit/shared';

export default function ItilDashboard() {
  const [kpis, setKpis] = useState<ItilDashboardKpis | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentChanges, setRecentChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kpiRes, incRes, changeRes] = await Promise.all([
        api<ItilDashboardKpis>('/itil/dashboard'),
        api<Incident[]>('/itil/incidents'),
        api<ChangeRequest[]>('/itil/changes'),
      ]);
      setKpis(kpiRes);
      setRecentIncidents(incRes.slice(0, 4));
      setRecentChanges(changeRes.slice(0, 4));
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
    return <Spinner label="Chargement du tableau de bord DSI…" />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-ink-100">Supervision DSI · Gouvernance ITIL v4</h1>
            <span className="rounded-md bg-brand-900/40 px-2 py-0.5 text-xs font-semibold text-brand-300 border border-brand-700">
              ITSM Suite
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-400">
            Pilotage des services informatiques, gestion des incidents majeurs, comités de changement et conformité SLA.
          </p>
          <div className="mt-1 text-xs text-brand-400/90 font-medium">
            Conception & Architecture ITIL : <span className="font-semibold text-ink-200">Martial Zinsou</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void loadData()} className="text-xs">
            ↻ Actualiser
          </Button>
          <Link to="/itil/incidents">
            <Button variant="primary" className="text-xs">
              + Déclarer un Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          label="Incidents P1 / P2"
          value={kpis?.incidentsP1P2 ?? 0}
          sub={`${kpis?.activeIncidents ?? 0} incidents actifs au total`}
          accent={kpis && kpis.incidentsP1P2 > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <StatTile
          label="Taux de respect SLA"
          value={`${kpis?.slaComplianceRate ?? 100}%`}
          sub="Objectifs de résolution P1..P4"
          accent="text-emerald-400"
        />
        <StatTile
          label="MTTR Moyen (Résolution)"
          value={`${kpis?.mttrHours ?? 0} h`}
          sub="Temps moyen avant rétablissement"
          accent="text-sky-400"
        />
        <StatTile
          label="Changements CAB en attente"
          value={kpis?.pendingChangesCab ?? 0}
          sub="Revue de comité requise"
          accent="text-amber-400"
        />
      </div>

      {/* Raccourcis Modules ITIL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link to="/itil/incidents" className="group">
          <Card className="h-full border-ink-800 transition hover:border-brand-500 hover:bg-ink-850">
            <div className="text-2xl mb-2">🚨</div>
            <div className="font-bold text-ink-100 group-hover:text-brand-300">Gestion des Incidents</div>
            <div className="text-xs text-ink-400 mt-1">Escalade P1-P4, suivi SLA et rétablissement de service.</div>
          </Card>
        </Link>
        <Link to="/itil/cmdb" className="group">
          <Card className="h-full border-ink-800 transition hover:border-brand-500 hover:bg-ink-850">
            <div className="text-2xl mb-2">🏛️</div>
            <div className="font-bold text-ink-100 group-hover:text-brand-300">CMDB & CIs</div>
            <div className="text-xs text-ink-400 mt-1">{kpis?.totalCis ?? 0} CIs répertoriés avec cartographie des dépendances.</div>
          </Card>
        </Link>
        <Link to="/itil/changes" className="group">
          <Card className="h-full border-ink-800 transition hover:border-brand-500 hover:bg-ink-850">
            <div className="text-2xl mb-2">🔄</div>
            <div className="font-bold text-ink-100 group-hover:text-brand-300">Changements & CAB</div>
            <div className="text-xs text-ink-400 mt-1">Demandes de changement (RFC), analyse d’impact et plans de rollback.</div>
          </Card>
        </Link>
        <Link to="/itil/problems" className="group">
          <Card className="h-full border-ink-800 transition hover:border-brand-500 hover:bg-ink-850">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-bold text-ink-100 group-hover:text-brand-300">Problèmes & KEDB</div>
            <div className="text-xs text-ink-400 mt-1">Analyse cause racine (RCA) et base d’erreurs connues ({kpis?.kedbArticlesCount ?? 0} articles).</div>
          </Card>
        </Link>
        <Link to="/itil/services" className="group">
          <Card className="h-full border-ink-800 transition hover:border-brand-500 hover:bg-ink-850">
            <div className="text-2xl mb-2">📦</div>
            <div className="font-bold text-ink-100 group-hover:text-brand-300">Catalogue DSI</div>
            <div className="text-xs text-ink-400 mt-1">{kpis?.openServiceRequests ?? 0} demandes usagers en cours de traitement.</div>
          </Card>
        </Link>
      </div>

      {/* Listes récapitulatives */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Incidents récents */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-ink-800 pb-3">
            <h2 className="text-base font-bold text-ink-100">Derniers Incidents Déclarés</h2>
            <Link to="/itil/incidents" className="text-xs text-brand-400 hover:underline">
              Tout afficher →
            </Link>
          </div>
          <div className="space-y-2">
            {recentIncidents.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/40 p-3"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-400">{inc.number}</span>
                    <IncidentPriorityBadge priority={inc.priority} />
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                  <div className="truncate text-sm font-medium text-ink-100 mt-1">{inc.title}</div>
                  <div className="text-xs text-ink-400">
                    Déclaré par {inc.reporter} · SLA {inc.sla_resolution_hours}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Changements RFC récents */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-ink-800 pb-3">
            <h2 className="text-base font-bold text-ink-100">Dernières Demandes de Changement (RFC)</h2>
            <Link to="/itil/changes" className="text-xs text-brand-400 hover:underline">
              Comité CAB →
            </Link>
          </div>
          <div className="space-y-2">
            {recentChanges.map((rfc) => (
              <div
                key={rfc.id}
                className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/40 p-3"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-400">{rfc.number}</span>
                    <ChangeStatusBadge status={rfc.status} />
                  </div>
                  <div className="truncate text-sm font-medium text-ink-100 mt-1">{rfc.title}</div>
                  <div className="text-xs text-ink-400">Demandé par {rfc.requester}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
