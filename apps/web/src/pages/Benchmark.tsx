/**
 * Benchmark & supervision thermique : lancement de stress tests (local ou
 * serveur), monitoring temps réel et historique des runs.
 * Thème Apple iMac (Performances & Stabilité).
 * Auteur : Martial Zinsou
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BENCHMARK_KIND_LABELS,
  type BenchmarkKind,
  type BenchmarkRun,
  type Machine,
} from '@roverit/shared';
import { api } from '../lib/api';
import { canEdit, useAuth } from '../lib/auth';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Select,
  Spinner,
  StatTile,
} from '../components/ui';
import { fmtDateTime, fmtPct, scoreColor, tempColor } from '../lib/format';
import { isDesktop, liveStats, runStressTest, type LiveStats } from '../lib/desktop';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Types de tests de benchmark proposés au lancement. */
const KINDS: BenchmarkKind[] = ['stability', 'cpu', 'gpu', 'memory', 'thermal'];

/** Page de lancement des stress tests et de visualisation des résultats. */
export default function Benchmark() {
  const { user } = useAuth();
  const editable = canEdit(user?.role);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState('');
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [kind, setKind] = useState<BenchmarkKind>('stability');
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<LiveStats | null>(null);

  const desktop = isDesktop();

  const loadBasics = () => {
    api<Machine[]>('/machines').then((m) => {
      setMachines(m);
      if (!machineId && m.length) setMachineId(m[0].id);
    });
  };
  useEffect(loadBasics, []);

  useEffect(() => {
    if (!machineId) return;
    api<BenchmarkRun[]>(`/machines/${machineId}/benchmarks`)
      .then(setRuns)
      .finally(() => setLoading(false));
  }, [machineId]);

  useEffect(() => {
    if (!desktop) return;
    let timer: ReturnType<typeof setInterval>;
    const tick = async () => {
      try {
        setStats(await liveStats());
      } catch {
        /* stats indisponibles */
      }
    };
    tick();
    timer = setInterval(tick, 2000);
    return () => clearInterval(timer);
  }, [desktop]);

  const run = async () => {
    if (!machineId) return;
    setRunning(true);
    setError('');
    try {
      if (desktop) {
        const result = await runStressTest(duration);
        const payload: BenchmarkRun = {
          id: crypto.randomUUID(),
          machine_id: machineId,
          kind,
          score: result.max_temp_c != null && result.max_temp_c > 90 ? Math.max(0, 100 - (result.max_temp_c - 90) * 2) : 92,
          avg_temp_c: result.max_temp_c != null ? result.max_temp_c - 9 : null,
          max_temp_c: result.max_temp_c,
          avg_cpu_pct: result.avg_cpu_pct,
          max_cpu_pct: result.max_cpu_pct,
          duration_s: result.duration_s,
          started_at: result.started_at,
          notes: 'Stress test local (processeur)',
        };
        await api('/benchmarks', { method: 'POST', body: payload, queueOffline: true });
      } else {
        await api('/benchmarks/run', {
          method: 'POST',
          body: { machine_id: machineId, kind, duration_s: duration },
          queueOffline: false,
        });
      }
      const fresh = await api<BenchmarkRun[]>(`/machines/${machineId}/benchmarks`);
      setRuns(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du benchmark');
    } finally {
      setRunning(false);
    }
  };

  const chartData = useMemo(
    () =>
      [...runs]
        .sort((a, b) => a.started_at.localeCompare(b.started_at))
        .map((b) => ({ name: b.started_at.slice(0, 10) + ' ' + b.started_at.slice(11, 16), t: b.avg_temp_c, score: b.score })),
    [runs],
  );

  if (loading && !machineId) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Performances. <span className="imac-gradient-text">Stabilité & Thermique.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          Séquenceur de stress test, télémétrie en temps réel et dissipation thermique.
          {desktop ? ' Le desktop exécute les charges réelles sur le processeur local.' : ' Mode démo serveur (desktop requis pour le matériel).'}
        </p>
        <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
      </div>

      {desktop && stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatTile label="CPU" value={fmtPct(stats.cpu_pct)} accent={stats.cpu_pct > 85 ? 'text-red-400' : 'text-emerald-400'} />
          <StatTile label="Mémoire" value={`${stats.mem_used_gb.toFixed(1)}/${stats.mem_total_gb.toFixed(1)} Go`} />
          <StatTile label="Temp CPU" value={stats.cpu_temp_c != null ? `${stats.cpu_temp_c} °C` : 'N/A'} accent={tempColor(stats.cpu_temp_c)} />
          <StatTile label="Fréquence" value={`${stats.cpu_freq_mhz} MHz`} />
          <StatTile label="Uptime" value={`${Math.floor(stats.uptime_secs / 3600)} h`} />
        </div>
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-300">Lancer un test</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <Field label="Machine">
              <Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-40">
            <Field label="Type de test">
              <Select value={kind} onChange={(e) => setKind(e.target.value as BenchmarkKind)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{BENCHMARK_KIND_LABELS[k]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-40">
            <Field label="Durée (s)">
              <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[10, 30, 60, 300, 600].map((d) => (
                  <option key={d} value={d}>{d} s</option>
                ))}
              </Select>
            </Field>
          </div>
          <Button variant="primary" onClick={() => void run()} disabled={running || !editable || !machineId}>
            {running ? 'Test en cours…' : desktop ? '▶ Stress test local' : '▶ Lancer (démo)'}
          </Button>
        </div>
        {error ? <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div> : null}
        {running && desktop ? (
          <div className="flex items-center gap-3 text-sm text-brand-300">
            <div className="h-2 w-2 animate-ping rounded-full bg-brand-500" />
            Analyse de stabilité en cours — charge processeur…
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">
            Historique des tests — {machines.find((m) => m.id === machineId)?.name ?? ''}
          </h2>
          {runs.length === 0 ? (
            <EmptyState message="Aucun test enregistré pour cette machine." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="t" name="Temp. moy. °C" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="score" name="Score" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Détail des runs</h2>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {runs.map((b) => (
              <div key={b.id} className="rounded-lg bg-ink-950/60 px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-100">{BENCHMARK_KIND_LABELS[b.kind]}</span>
                  <span className={`font-bold ${scoreColor(b.score)}`}>{b.score != null ? `Score ${b.score}` : 'En cours'}</span>
                </div>
                <div className="text-xs text-ink-400">
                  {fmtDateTime(b.started_at)} · {b.duration_s}s · Temp moy. <span className={tempColor(b.avg_temp_c)}>{b.avg_temp_c ?? '—'}°C</span> · max{' '}
                  <span className={tempColor(b.max_temp_c)}>{b.max_temp_c ?? '—'}°C</span> · CPU {fmtPct(b.avg_cpu_pct)}
                </div>
                {b.notes ? <div className="mt-1 text-xs text-ink-500">{b.notes}</div> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}