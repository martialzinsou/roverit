/**
 * Hooks React partagés du front web.
 * Gestion du temps réel (WebSocket + rafraîchissement), de la visibilité
 * en ligne/hors-ligne et du chargement des données métier (machines, OT,
 * KPIs du tableau de bord, benchmarks).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, readOutbox } from '../lib/api';
import type {
  BenchmarkRun,
  DashboardKpis,
  Machine,
  WorkOrder,
} from '@roverit/shared';

/** Abonne un rechargement personnalisé à l'événement global de synchronisation. */
export function useRealtimeRefresh(reload: () => void): void {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener('roverit:sync', handler);
    return () => window.removeEventListener('roverit:sync', handler);
  }, []);
}

/** Ouvre un WebSocket et émet 'roverit:sync' à chaque message reçu. */
export function useWsSync(): void {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry = 1000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${window.location.host}/ws`);
      ws.onopen = () => {
        retry = 1000;
      };
      ws.onmessage = () => {
        window.dispatchEvent(new CustomEvent('roverit:sync'));
      };
      ws.onclose = () => {
        ws = null;
        if (!stopped) setTimeout(connect, Math.min(retry, 15000));
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      stopped = true;
      ws?.close();
    };
  }, []);
}

/** Suit l'état en ligne/hors-ligne et le nombre de requêtes en attente. */
export function useOnlineStatus(): { online: boolean; pending: number } {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(() => readOutbox().length);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    const changed = () => setPending(readOutbox().length);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    window.addEventListener('roverit:offline-changed', changed);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      window.removeEventListener('roverit:offline-changed', changed);
    };
  }, []);
  return { online, pending };
}

/** Charge la liste des machines avec rechargement à la demande et temps réel. */
export function useMachines(): {
  data: Machine[];
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    api<Machine[]>('/machines')
      .then((d) => setData(d))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);
  useRealtimeRefresh(reload);
  useEffect(reload, [reload]);
  return { data, loading, reload };
}

/** Charge la liste des ordres de travail avec rechargement à la demande et temps réel. */
export function useWorkOrders(): { data: WorkOrder[]; loading: boolean; reload: () => void } {
  const [data, setData] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    api<WorkOrder[]>('/work-orders')
      .then((d) => setData(d))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);
  useRealtimeRefresh(reload);
  useEffect(reload, [reload]);
  return { data, loading, reload };
}

/** Charge les KPIs agrégés du tableau de bord avec rechargement à la demande. */
export function useDashboardKpis(): { data: DashboardKpis | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    api<DashboardKpis>('/dashboard/kpis')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);
  useRealtimeRefresh(reload);
  useEffect(reload, [reload]);
  return { data, loading, reload };
}

/** Charge l'historique des benchmarks avec rechargement à la demande et temps réel. */
export function useBenchmarks(): { data: BenchmarkRun[]; loading: boolean; reload: () => void } {
  const [data, setData] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    api<BenchmarkRun[]>('/benchmarks')
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);
  useRealtimeRefresh(reload);
  useEffect(reload, [reload]);
  return { data, loading, reload };
}