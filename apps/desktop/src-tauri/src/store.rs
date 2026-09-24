//! Couche de persistance SQLite locale de RoverIt.
//! Stocke les machines (et à terme les bons de travail) collectées sur la machine hôte,
//! en attendant leur synchronisation avec le backend distant.
//! Auteur : Martial Zinsou.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Ligne d'une machine locale telle que persistée dans la table `local_machines`.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct LocalMachineRow {
    pub id: String,
    pub name: String,
    pub cpu: Option<String>,
    pub ram_gb: Option<i64>,
    pub gpu: Option<String>,
    pub hardware_json: Option<String>,
    pub synced: i64,
    pub created_at: String,
}

/// Accès à la base SQLite locale. Chaque commande manipule le store via un `Mutex`.
pub struct Store {
    conn: Connection,
}

impl Store {
    /// Ouvre (ou crée) la base au chemin donné et applique le schéma initial.
    pub fn init(path: PathBuf) -> Self {
        let conn = Connection::open(&path).expect("ouverture sqlite locale");
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS local_machines (
               id TEXT PRIMARY KEY,
               name TEXT NOT NULL,
               cpu TEXT,
               ram_gb INTEGER,
               gpu TEXT,
               hardware_json TEXT,
               synced INTEGER NOT NULL DEFAULT 0,
               created_at TEXT NOT NULL DEFAULT (datetime('now'))
             );
             CREATE TABLE IF NOT EXISTS local_work_orders (
               id TEXT PRIMARY KEY,
               machine_id TEXT NOT NULL,
               title TEXT NOT NULL,
               synced INTEGER NOT NULL DEFAULT 0,
               created_at TEXT NOT NULL DEFAULT (datetime('now'))
             );",
        )
        .expect("init schéma sqlite local");
        Store { conn }
    }

    /// Construit un store à partir d'une connexion rusqlite existante (utile pour les tests).
    pub fn from_connection(conn: Connection) -> Self {
        Store { conn }
    }

    /// Insère une machine ou met à jour ses informations si l'identifiant existe déjà.
    pub fn upsert_machine(
        &self,
        id: &str,
        name: &str,
        cpu: Option<&str>,
        ram_gb: Option<i64>,
        gpu: Option<&str>,
        hardware_json: Option<&str>,
    ) -> rusqlite::Result<()> {
        self.conn.execute(
            "INSERT INTO local_machines (id, name, cpu, ram_gb, gpu, hardware_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, cpu=excluded.cpu, ram_gb=excluded.ram_gb,
               gpu=excluded.gpu, hardware_json=excluded.hardware_json, synced=0",
            params![id, name, cpu, ram_gb, gpu, hardware_json],
        )?;
        Ok(())
    }

    /// Liste toutes les machines locales, triées de la plus récente à la plus ancienne.
    pub fn list_machines(&self) -> rusqlite::Result<Vec<LocalMachineRow>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, cpu, ram_gb, gpu, hardware_json, synced, created_at FROM local_machines ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(LocalMachineRow {
                id: row.get(0)?,
                name: row.get(1)?,
                cpu: row.get(2)?,
                ram_gb: row.get(3)?,
                gpu: row.get(4)?,
                hardware_json: row.get(5)?,
                synced: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        let mut out = Vec::new();
        for r in rows {
            if let Ok(r) = r {
                out.push(r);
            }
        }
        Ok(out)
    }

    /// Supprime une machine locale à partir de son identifiant.
    pub fn delete_machine(&self, id: &str) -> rusqlite::Result<()> {
        self.conn
            .execute("DELETE FROM local_machines WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Marque toutes les machines encore non synchronisées comme synchronisées.
    pub fn mark_synced(&self) -> rusqlite::Result<()> {
        self.conn
            .execute("UPDATE local_machines SET synced = 1 WHERE synced = 0", [])?;
        Ok(())
    }
}