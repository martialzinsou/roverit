//! Bibliothèque principale du binaire Tauri de RoverIt (desktop).
//! Initialise le backend Tauri, le store SQLite local et enregistre
//! les commandes natives exposées au frontend web.

mod commands;
mod store;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
/// Point d'entrée du binaire : construit et lance l'application Tauri.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("répertoire de données");
            std::fs::create_dir_all(&data_dir).ok();
            let store = store::Store::init(data_dir.join("roverit-local.db"));
            app.manage(Mutex::new(store));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::hardware_profile,
            commands::live_stats,
            commands::battery_health,
            commands::run_stress_test,
            commands::save_local_machine,
            commands::list_local_machines,
            commands::delete_local_machine,
        ])
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de RoverIt");
}