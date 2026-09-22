/**
 * Pont vers le backend natif Tauri (mode desktop).
 * Fournit le profil matériel, les statistiques temps réel, la santé de la
 * batterie et l'exécution de stress tests sur la machine locale.
 */
import type { User } from '@roverit/shared';

/** Détecte si l'application tourne dans l'environnement Tauri (desktop). */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Profil complet du matériel détecté sur la machine locale. */
export interface HardwareProfile {
  hostname: string;
  os: string;
  os_version: string;
  cpu_brand: string;
  cpu_cores: number;
  cpu_freq_mhz: number[];
  ram_total_gb: number;
  disks: { name: string; total_gb: number }[];
}

/** Indicateurs temps réel (CPU, mémoire, température, fréquences, uptime). */
export interface LiveStats {
  cpu_pct: number;
  mem_used_gb: number;
  mem_total_gb: number;
  cpu_temp_c: number | null;
  cpu_freq_mhz: number;
  uptime_secs: number;
}

/** Résultat d'un stress test local (durée, charge CPU, température max). */
export interface StressResult {
  duration_s: number;
  avg_cpu_pct: number;
  max_cpu_pct: number;
  max_temp_c: number | null;
  started_at: string;
}

/** État de santé de la batterie (cycles, capacité restante, message). */
export interface BatteryHealth {
  cycles: number | null;
  capacity_pct: number | null;
  message: string;
}

/** Appelle une commande Tauri de façon asynchrone (import dynamique). */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const mod = await import('@tauri-apps/api/core');
  return mod.invoke<T>(cmd, args);
}

/** Récupère le profil matériel complet via 'hardware_profile'. */
export async function hardwareProfile(): Promise<HardwareProfile> {
  return invoke<HardwareProfile>('hardware_profile');
}

/** Récupère les statistiques temps réel via 'live_stats'. */
export async function liveStats(): Promise<LiveStats> {
  return invoke<LiveStats>('live_stats');
}

/** Récupère l'état de santé de la batterie via 'battery_health'. */
export async function batteryHealth(): Promise<BatteryHealth> {
  return invoke<BatteryHealth>('battery_health');
}

/** Lance un stress test local d'une durée donnée via 'run_stress_test'. */
export async function runStressTest(durationS: number): Promise<StressResult> {
  return invoke<StressResult>('run_stress_test', { durationSecs: durationS });
}

/** Enregistre une machine localement dans Tauri via 'save_local_machine'. */
export async function saveLocalMachine(payload: {
  id: string;
  name: string;
  cpu?: string | null;
  ram_gb?: number | null;
  gpu?: string | null;
  hardware?: HardwareProfile | null;
}): Promise<{ ok: boolean; count: number }> {
  return invoke<{ ok: boolean; count: number }>('save_local_machine', { payload });
}

/** Liste les machines enregistrées localement via 'list_local_machines'. */
export async function listLocalMachines(): Promise<unknown[]> {
  return invoke<unknown[]>('list_local_machines');
}

/** Hook : renvoie si l'application tourne en mode desktop. */
export function useIsDesktop(): boolean {
  return isDesktop();
}

export { invoke };