# RoverIt — Modèle de données

Schéma de la base **SQLite** du serveur (identique dans son esprit à la base locale desktop pour les machines hors-ligne). Conçu pour rester migrable vers **PostgreSQL**.

## 1. Diagramme entité-association (UML ER)

```mermaid
erDiagram
    users ||--o{ interventions : "auteur"
    users ||--o{ audit_events : "trace"

    machines ||--o{ components : "contient"
    machines ||--o{ benchmark_runs : "mesurée par"
    machines ||--o{ work_orders : "concernée par"

    work_orders ||--o{ interventions : "contient"
    work_orders ||--o{ checklist_items : "contient"

    machines {
        text id PK
        text name UK
        text client
        text serial
        text manufacturer
        text model
        text cpu
        int ram_gb
        real storage_tb
        text gpu
        text status "en_attente_diagnostic | en_cours_upgrade | en_test_thermique | pret_deploiement | archive"
        text created_at
        text updated_at
    }

    users {
        text id PK
        text username UK
        text email
        text password_hash "scrypt"
        text role "technicien | admin | consultant"
        text created_at
    }

    components {
        text id PK
        text machine_id FK
        text kind "cpu | gpu | ram | storage | battery | motherboard | cooling | other"
        text name
        text model
        text health
        text notes
        text installed_at
    }

    parts {
        text id PK
        text name
        text category
        real price_eur
        int stock
        text compatibility "règles séparées par des virgules"
    }

    benchmark_runs {
        text id PK
        text machine_id FK
        text kind "stability | cpu | gpu | memory | thermal"
        real score
        real avg_temp_c
        real max_temp_c
        real avg_cpu_pct
        real max_cpu_pct
        int duration_s
        text started_at
        text notes
    }

    work_orders {
        text id PK
        text machine_id FK
        text title
        text priority "basse | normale | haute | critique"
        text status "ouverte | en_cours | terminee | annulee"
        text assignee
        text created_at
        text updated_at
    }

    interventions {
        text id PK
        text work_order_id FK
        text user_id FK
        text action
        text part_ids "JSON array"
        text notes
        text created_at
    }

    checklist_items {
        text id PK
        text work_order_id FK
        text label
        int done "0 | 1"
    }

    audit_events {
        text id PK
        text entity
        text entity_id
        text action
        text user_id
        text payload
        text created_at
    }
```

## 2. Définition des tables

| Table | Description |
| --- | --- |
| `users` | Utilisateurs (RBAC `role`), mot de passe haché en scrypt. |
| `machines` | Fiche CI : équipement + `status` de cycle de vie. |
| `components` | Composants installés sur une machine (avec état de santé). |
| `parts` | Catalogue de pièces (prix, stock, règles de compatibilité). |
| `benchmark_runs` | Runs de stress/stabilité par machine (`score` 0-100). |
| `work_orders` | Ordres de travail liés à une machine. |
| `interventions` | Actions tracées sur un OT (auteur = `user_id`). |
| `checklist_items` | Éléments de checklist générés à la création d'un OT. |
| `audit_events` | Journal de traçabilité (who / what / when). |

## 3. Statuts possibles

### Cycle de vie machine (`machines.status`)
```mermaid
flowchart LR
    D["en_attente_diagnostic"] --> U["en_cours_upgrade"]
    U --> T["en_test_thermique"]
    T --> P["pret_deploiement"]
    D --> A["archive"]
    P --> A
```

### Statuts d'OT (`work_orders.status`)
```mermaid
flowchart LR
    O["ouverte"] --> C["en_cours"]
    C --> F["terminee"]
    O --> X["annulee"]
    C --> X
```

## 4. Index & contraintes

- `PRAGMA foreign_keys = ON` (cascade de suppression sur machines/work_orders).
- `PRAGMA journal_mode = WAL` (lectures/écritures concurrentes Fluides).
- Identifiants : `TEXT` UUID (`newId()` = `crypto.randomUUID()`) pour faciliter les **upserts idempotents** hors-ligne/online.
- Compatibilité le jour où l'on migre vers PostgreSQL : les colonnes `TEXT` pour toutes les clés et horodatages ISO 8601 simplifient la conversion.

## 5. Modèle local desktop (hors-ligne)

```mermaid
erDiagram
    local_machines {
        text id PK
        text name
        text cpu
        int ram_gb
        text gpu
        text hardware_json "profil syinfo sérialisé"
        int synced
        text created_at
    }
```

- Écrit par `commands.rs::save_local_machine` au moment de la création hors-ligne.
- Synchronisé vers le serveur via `POST /api/v1/sync` (upsert) au retour du réseau.
- Le champ `hardware_json` conserve le profil matériel complet détecté.