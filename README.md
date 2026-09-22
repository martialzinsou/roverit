# RoverIt — Workstation OS Hub

Application hybride de **gestion technique de matériel, reconditionnement et supervision d'infrastructures** (nom de code : **Workstation OS Hub**).

![Tableau de bord — aperçu](docs/screenshots/02-dashboard.png)

## Vue d'ensemble

```mermaid
flowchart LR
    DESK["Desktop Tauri (Rust)<br/>matériel local + SQLite"] --> WEBUI["WebView · apps/web (PWA)"]
    WEB["Navigateur · PWA<br/>offline-first (outbox)"] --> SERVER["API Fastify · Node/TS<br/>REST + WebSocket + PDF"]
    WEBUI --> SERVER
    SERVER --> SQL["SQLite serveur"]
    SHARED["@roverit/shared (types)"] -.-> WEB
    SHARED -.-> SERVER
    SHARED -.-> DESK
```

## Documentation

| Document | Contenu |
| --- | --- |
| [Cahier des spécifications (SFD)](docs/sfd.md) | Exigences fonctionnelles & techniques complètes. |
| [Architecture & diagrammes UML](docs/architecture.md) | Composants, déploiement, séquences, états, cas d'utilisation (Mermaid). |
| [Modèle de données](docs/data-model.md) | Schéma entité-association, tables, statuts, modèle hors-ligne. |
| [Référence API](docs/api.md) | Routes REST + événements WebSocket. |
| [Guide d'utilisation illustré](docs/usage-guide.md) | Parcours pas à pas avec captures d'écran (`docs/screenshots/`). |

## Architecture

| Layer | Technologie |
| --- | --- |
| Desktop Framework | **Tauri 2 (Rust + HTML/CSS/JS)** |
| Frontend / UI | **React + TypeScript + TailwindCSS** (PWA, partagé desktop/web) |
| Backend / API | **Node.js / TypeScript (Fastify)** — REST + WebSocket |
| Base de données | **SQLite** (local desktop & serveur) — schéma compatible **PostgreSQL** |
| Authentification | **JWT + RBAC** (rôles : Technicien, Chef d'atelier/Admin, Consultant/Client) |

## Structure du dépôt

```
RoverIt/
├── apps/
│   ├── web/           # UI React (dashboard PWA, utilisée par desktop & web)
│   ├── desktop/       # Application desktop Tauri (Rust : profiling, stress test, SQLite local)
│   └── server/        # API Fastify (REST + WebSocket, PDF, synchronisation)
├── packages/
│   └── shared/        # Types métier partagés (Machine, WorkOrder, BenchmarkRun, …)
└── docs/
    └── sfd.md         # Cahier de spécifications fonctionnelles et techniques
```

## Modules fonctionnels

1. **Gestion des équipements & composants** — inventaire, fiche CI, détection matérielle, catalogue de pièces, alertes de compatibilité.
2. **Supervision & benchmarking** — monitoring thermique/énergétique temps réel, séquenceur de stress test, score de stabilité thermique.
3. **Workflow de reconditionnement & OT** — statuts de cycle de vie, checklists d'intervention, historique de traçabilité.
4. **Reporting & exportation** — fiches techniques PDF, tableau de bord & KPIs.

## Démarrage rapide

### Prérequis
- Node.js ≥ 20
- Rust toolchain (pour le desktop) : https://rustup.rs

### Installation
```bash
npm install
```

### Serveur API + Dashboard web (développement)
```bash
npm run dev:server   # API sur http://localhost:3001
npm run dev:web      # Dashboard sur http://localhost:5173
```

### Application desktop (Tauri)
```bash
npm run dev:desktop
```

### Build de production
```bash
npm run build
npm run build -w @roverit/desktop   # binaire desktop installable
```

### Tests & types
```bash
npm run typecheck
npm test
```

## Accès démo (seedé au démarrage)
| Rôle | Identifiant | Mot de passe |
| --- | --- | --- |
| Admin | `admin` | `admin` |
| Technicien | `tech` | `tech` |
| Consultant | `client` | `client` |

## Sécurité
- Communications TLS 1.3 (reverse proxy de production recommandé : Caddy/Nginx)
- JWT signé (HS256) avec expiration + RBAC (Technicien / Admin / Consultant)
- Mode hors-ligne : SQLite locale sur le desktop + file de synchronisation (outbox) côté web, réplication automatique au retour réseau.