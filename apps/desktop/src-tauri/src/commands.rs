//! Commande Tauri exposées au frontend web de RoverIt.
//! Rassemble la collecte de l'état matériel (CPU, RAM, disques, batterie),
//! le test de stress et la gestion locale des machines.
//! Toute logique est déléguée au store SQLite local pour la persistance.
//! Auteur : Martial Zinsou.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{Disks, System};
use tauri::State;

use crate::store::Store;

/// Profil matériel complet d'une machine : identité (hostname, OS) et ressources (CPU, RAM, disques).
#[derive(Debug, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub hostname: String,
    pub os: Option<String>,
    pub os_version: Option<String>,
    pub cpu_brand: String,
    pub cpu_core_count: usize,
    pub cpu_cores_physical: Option<usize>,
    pub cpu_freq_mhz: Vec<u64>,
    pub ram_total_gb: f64,
    pub disks: Vec<DiskInfo>,
}

/// Description d'un disque de stockage (taille, espace disponible, point de montage, amovibilité).
#[derive(Debug, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub total_gb: f64,
    pub available_gb: f64,
    pub mount_point: String,
    pub removable: bool,
}

/// Statistiques en temps réel de la machine : charge CPU, mémoire, température et fréquence.
#[derive(Debug, Serialize, Deserialize)]
pub struct LiveStats {
    pub cpu_pct: f32,
    pub mem_used_gb: f64,
    pub mem_total_gb: f64,
    pub cpu_temp_c: Option<f32>,
    pub cpu_freq_mhz: u64,
    pub uptime_secs: u64,
}

/// État de santé de la batterie : nombre de cycles, capacité restante et message d'information.
#[derive(Debug, Serialize, Deserialize)]
pub struct BatteryHealth {
    pub cycles: Option<i64>,
    pub capacity_pct: Option<i64>,
    pub message: String,
}

/// Résultat d'un test de stress : durée, charge CPU moyenne/maximale et température maximale.
#[derive(Debug, Serialize, Deserialize)]
pub struct StressResult {
    pub duration_s: u64,
    pub avg_cpu_pct: f32,
    pub max_cpu_pct: f32,
    pub max_temp_c: Option<f32>,
    pub started_at: String,
}

/// Payload envoyé par le frontend pour sauvegarder une machine locale.
#[derive(Debug, Deserialize)]
pub struct LocalMachinePayload {
    pub id: String,
    pub name: String,
    pub cpu: Option<String>,
    pub ram_gb: Option<i64>,
    pub gpu: Option<String>,
    pub hardware: Option<HardwareProfile>,
}

/// Résultat d'une opération de sauvegarde/suppression : statut et nombre de machines en local.
#[derive(Debug, Serialize)]
pub struct LocalMachineResult {
    pub ok: bool,
    pub count: usize,
}

/// Convertit un nombre d'octets en gigaoctets (binaire, base 1024).
fn bytes_to_gb(bytes: u64) -> f64 {
    bytes as f64 / (1024.0 * 1024.0 * 1024.0)
}

/// Récupère la température CPU sur Linux via les composants sysinfo.
#[cfg(target_os = "linux")]
fn cpu_temp() -> Option<f32> {
    let mut components = sysinfo::Components::new_with_refreshed_list();
    components.refresh(true);
    for component in &components {
        let label = component.label().to_lowercase();
        if label.contains("cpu") || label.contains("core") || label.contains("package") {
            if let Some(t) = component.temperature() {
                if t > 0.0 {
                    return Some(t);
                }
            }
        }
    }
    None
}

/// Température CPU non disponible hors de Linux : retourne `None`.
#[cfg(not(target_os = "linux"))]
fn cpu_temp() -> Option<f32> {
    None
}

/// Formate l'horodatage courant en pseudo-ISO 8601 (base du jour 0001).
fn iso_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let secs = now as i64;
    let days = secs / 86400;
    let rem = secs % 86400;
    let h = rem / 3600;
    let m = (rem % 3600) / 60;
    let s = rem % 60;
    format!("{days:04}-01-01T{h:02}:{m:02}:{s:02}.000Z")
}

/// Commande Tauri : renvoie le profil matériel complet de la machine locale.
#[tauri::command]
pub fn hardware_profile() -> HardwareProfile {
    let mut sys = System::new_all();
    sys.refresh_all();
    let mut disks = Disks::new_with_refreshed_list();
    disks.refresh();
    let mut disk_list = Vec::new();
    for disk in disks.list() {
        disk_list.push(DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            total_gb: bytes_to_gb(disk.total_space()),
            available_gb: bytes_to_gb(disk.available_space()),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            removable: disk.is_removable(),
        });
    }
    let cpu = sys.cpus().first();
    let freqs = sys.cpus().iter().map(|c| c.frequency()).collect();
    HardwareProfile {
        hostname: System::host_name().unwrap_or_else(|| "inconnu".to_string()),
        os: System::name(),
        os_version: System::os_version(),
        cpu_brand: cpu.map(|c| c.brand().to_string()).unwrap_or_else(|| "inconnu".to_string()),
        cpu_core_count: sys.cpus().len(),
        cpu_cores_physical: thread::available_parallelism().map(|n| n.get()).ok(),
        cpu_freq_mhz: freqs,
        ram_total_gb: bytes_to_gb(sys.total_memory()),
        disks: disk_list,
    }
}

/// Commande Tauri : renvoie les statistiques temps réel (CPU, mémoire, batterie).
#[tauri::command]
pub fn live_stats() -> LiveStats {
    let mut sys = System::new();
    sys.refresh_memory();
    sys.refresh_cpu_usage();
    thread::sleep(Duration::from_millis(120));
    sys.refresh_cpu_usage();
    let list = sys.cpus();
    let freq = list.first().map(|c| c.frequency()).unwrap_or(0);
    LiveStats {
        cpu_pct: sys.global_cpu_usage(),
        mem_used_gb: bytes_to_gb(sys.used_memory()),
        mem_total_gb: bytes_to_gb(sys.total_memory()),
        cpu_temp_c: cpu_temp(),
        cpu_freq_mhz: freq,
        uptime_secs: System::uptime(),
    }
}

/// Commande Tauri : analyse la batterie via `system_profiler` sur macOS, sinon message d'indisponibilité.
#[tauri::command]
pub fn battery_health() -> BatteryHealth {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("system_profiler")
            .arg("SPPowerDataType")
            .output();
        if let Ok(out) = output {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
                let cycles = extract_number(&text, "cycle count");
                let capacity = extract_number(&text, "maximum capacity");
                return BatteryHealth {
                    cycles,
                    capacity_pct: capacity,
                    message: "Batterie analysée via system_profiler".to_string(),
                };
            }
        }
        BatteryHealth {
            cycles: None,
            capacity_pct: None,
            message: "Impossible de lire la batterie".to_string(),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        BatteryHealth {
            cycles: None,
            capacity_pct: None,
            message: "Lecture de batterie disponible sur macOS".to_string(),
        }
    }
}

/// Extrait la valeur numérique associée à un libellé dans la sortie textuelle (macOS).
#[cfg(target_os = "macos")]
fn extract_number(text: &str, label: &str) -> Option<i64> {
    let lines: Vec<&str> = text.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        if line.contains(label) {
            if let Some(next) = lines.get(i + 1) {
                let n = next
                    .split(':')
                    .nth(1)
                    .unwrap_or("")
                    .trim()
                    .chars()
                    .filter(|c| c.is_ascii_digit())
                    .collect::<String>();
                if !n.is_empty() {
                    return n.parse().ok();
                }
            }
        }
    }
    None
}

/// Commande Tauri : charge tous les cœurs CPU pendant `duration_secs` et mesure la charge résultante.
#[tauri::command]
pub fn run_stress_test(duration_secs: u64) -> StressResult {
    let started_at = iso_now();
    let cores = thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    let stop = Arc::new(AtomicBool::new(false));
    let mut handles = Vec::new();
    for _ in 0..cores {
        let stop = Arc::clone(&stop);
        handles.push(thread::spawn(move || {
            let mut x = 1.0f64;
            while !stop.load(Ordering::Relaxed) {
                for _ in 0..20000 {
                    x = (x * 1.000001 + 0.7).sin();
                    std::hint::black_box(x);
                }
            }
        }));
    }

    let mut sys = System::new();
    sys.refresh_cpu_usage();
    let mut samples: Vec<f32> = Vec::new();
    let mut max_temp: Option<f32> = None;
    let start = Instant::now();
    while start.elapsed().as_secs() < duration_secs {
        thread::sleep(Duration::from_millis(400));
        sys.refresh_cpu_usage();
        let usage = sys.global_cpu_usage();
        samples.push(usage);
        if let Some(temp) = cpu_temp() {
            max_temp = Some(max_temp.map_or(temp, |m: f32| m.max(temp)));
        }
    }

    stop.store(true, Ordering::Relaxed);
    for handle in handles {
        let _ = handle.join();
    }

    let avg = if samples.is_empty() {
        0.0
    } else {
        samples.iter().sum::<f32>() / samples.len() as f32
    };
    let max = samples.iter().cloned().fold(0.0f32, f32::max);

    StressResult {
        duration_s: duration_secs,
        avg_cpu_pct: (avg * 10.0).round() / 10.0,
        max_cpu_pct: (max * 10.0).round() / 10.0,
        max_temp_c: max_temp,
        started_at,
    }
}

/// Commande Tauri : enregistre ou met à jour une machine locale dans le store SQLite.
#[tauri::command]
pub fn save_local_machine(
    payload: LocalMachinePayload,
    state: State<'_, Mutex<Store>>,
) -> LocalMachineResult {
    let guard = state.lock().expect("store verrouillé");
    let hardware_json = payload
        .hardware
        .as_ref()
        .map(|h| serde_json::to_string(h).unwrap_or_default());
    guard
        .upsert_machine(
            &payload.id,
            &payload.name,
            payload.cpu.as_deref(),
            payload.ram_gb,
            payload.gpu.as_deref(),
            hardware_json.as_deref(),
        )
        .expect("échec sqlite local");
    let count = guard.list_machines().map(|l| l.len()).unwrap_or(0);
    LocalMachineResult { ok: true, count }
}

/// Commande Tauri : liste toutes les machines locales enregistrées.
#[tauri::command]
pub fn list_local_machines(state: State<'_, Mutex<Store>>) -> Vec<crate::store::LocalMachineRow> {
    let guard = state.lock().expect("store verrouillé");
    guard.list_machines().unwrap_or_default()
}

/// Commande Tauri : supprime une machine locale à partir de son identifiant.
#[tauri::command]
pub fn delete_local_machine(id: String, state: State<'_, Mutex<Store>>) -> LocalMachineResult {
    let guard = state.lock().expect("store verrouillé");
    guard.delete_machine(&id).expect("échec suppression locale");
    let count = guard.list_machines().map(|l| l.len()).unwrap_or(0);
    LocalMachineResult { ok: true, count }
}