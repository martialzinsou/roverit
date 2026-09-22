# RoverIt — Architecture technique & diagrammes UML

Ce document décrit l'architecture de l'application **RoverIt (Workstation OS Hub)** et ses principaux flux, illustrés par des **diagrammes UML (Mermaid)** rendus directement sur GitHub.

## 1. Vue d'ensemble des briques

```mermaid
flowchart LR
    subgraph Desktop["apps/desktop — Tauri 2 (Rust)"]
        TAPI["Commandes matérielles<br/>hardware_profile / live_stats<br/>run_stress_test / battery_health"]
        TSTORE["Store SQLite local<br/>local_machines"]
        TWEBUI["WebView · apps/web"]
    end

    subgraph Server["apps/server — Fastify (Node.js / TypeScript)"]
        API["REST /api/v1<br/>auth · machines · parts<br/>benchmarks · work-orders<br/>reports · dashboard · sync"]
        WS["WebSocket /ws<br/>événements temps réel"]
        PDF["Génération PDF<br/>fiche technique (pdfkit)"]
        SQL["SQLite serveur<br/>roverit.db"]
    end

    subgraph Shared["packages/shared — @roverit/shared"]
        TYPES["Types métier + helpers<br/>Machine · WorkOrder · BenchmarkRun…"]
    end

    WUI["apps/web — React PWA<br/>(offline-first, outbox)"]

    TWEBUI --> TAPI
    TWEBUI --> TSTORE
    TAPI --> TSTORE
    TWEBUI --> API
    WUI --> API
    WUI --> WS
    TWEBUI --> WS
    API --> SQL
    PDF --> SQL
    TYPES -. types compilés .-> WUI
    TYPES -. types compilés .-> Server
    TYPES -. types compilés .-> Desktop
```

## 2. Diagramme de composants (UML Component)

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        WEB["<b>Web (PWA)</b><br/>React · HashRouter · SW<br/>outbox localStorage"]
        DESK["<b>Desktop (Tauri)</b><br/>Rust backend + WebView"]
    end

    subgraph UI["Couche UI (apps/web)"]
        PAGES["pages/<br/>Login · Dashboard · Machines ·<br/>MachineDetail · Parts · Benchmark ·<br/>WorkOrders · WorkOrderDetail ·<br/>Reports · Settings"]
        LIB["lib/<br/>api.ts (client REST)<br/>auth.tsx (session)<br/>hooks.ts (données)<br/>desktop.ts (invocations Tauri)<br/>format.ts · outbox"]
        COMP["components/<br/>ui.tsx · Layout.tsx<br/>StatusBadge.tsx"]
    end

    subgraph API2["Couche API (apps/server)"]
        AUTH["lib/auth.ts<br/>JWT + RBAC"]
        ROUTES["routes/<br/>auth · machines · parts · benchmarks<br/>workorders · reports · dashboard · sync"]
        EVENTS["lib/events.ts<br/>hub WebSocket"]
        DB["db.ts<br/>schéma + seed + audit"]
    end

    subgraph DATA["Persistance"]
        SQLS["SQLite serveur"]
        SQLL["SQLite locale (desktop)"]
    end

    WEB --> PAGES
    DESK --> PAGES
    PAGES --> LIB
    PAGES --> COMP
    LIB --> API2
    DESK -. invoke .-> TCMD["commands.rs"]
    ROUTES --> AUTH
    ROUTES --> DB
    ROUTES --> EVENTS
    DB --> SQLS
    TCMD --> SQLL
```

## 3. Diagramme de déploiement (UML Deployment)

```mermaid
flowchart LR
    subgraph Prod["Serveur de production"]
        PROXY["Caddy / Nginx<br/>TLS 1.3"]
        API["RoverIt API<br/>Node / Fastify :3001"]
        SQL["SQLite<br/>roverit.db"]
        API --> SQL
    end

    DESK["Desktop — Tauri 2"] --> PROXY
    WEB["Navigateur — PWA"] --> PROXY
    PROXY --> API
    DESK <--> LSQL["SQLite locale<br/>local_machines.db"]
    DESK -. mode hors-ligne .-> LSQL
```

## 4. Flux d'authentification (diagramme de séquence)

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (web/desktop)
    participant A as API Fastify
    participant D as Base SQLite

    U->>F: Saisie identifiant / mot de passe
    F->>A: POST /api/v1/auth/login
    A->>D: SELECT user WHERE username = ?
    D-->>A: user (hash scrypt)
    A->>A: verifyPassword + signToken (HS256, TTL 12h)
    A-->>F: 200 { token, user }
    F->>F: setSession → localStorage
    F->>A: GET /api/v1/auth/me (Authorization: Bearer …)
    A->>A: authenticate (vérif JWT + signature)
    A->>D: SELECT profil complet
    A-->>F: 200 { user }
    Note over A: requireRole(admin/technicien)<br/>imposé sur chaque route d'écriture
    F->>U: Dashboard affiché
```

## 5. Création de machine — mode hors-ligne (outbox)

```mermaid
sequenceDiagram
    autonumber
    participant U as Technicien
    participant F as Frontend (desktop)
    participant L as SQLite locale + outbox
    participant A as API + base centrale

    Note over U,F: Mode hors-ligne (réseau indisponible)
    U->>F: Remplit la fiche machine + détection matérielle
    activate F
    F->>L: save_local_machine (id gen, profil HW)
    F->>L: outbox += POST /machines
    F-->>U: Machine enregistrée localement ✓
    deactivate F

    Note over F,A: Retour du réseau (événement "online")
    F->>A: flushOutbox → POST /api/v1/machines
    A->>A: id UUID client conservé (upsert idempotent)
    A-->>F: 201 { machine }
    F->>L: dropOutbox (entrée retirée)
    F->>L: sync local → statut "synced"
```

## 6. Cycle de vie machine & OT (diagramme d'états)

```mermaid
stateDiagram-v2
    [*] --> en_attente_diagnostic : entrée atelier
    en_attente_diagnostic --> en_cours_upgrade : création OT
    en_cours_upgrade --> en_test_thermique : upgrade terminé
    en_cours_upgrade --> en_test_thermique : intervention ajoutée
    en_test_thermique --> pret_deploiement : OT clôturée (score OK)
    en_test_thermique --> en_cours_upgrade : échec test → correction
    pret_deploiement --> archive : déclassement
    en_attente_diagnostic --> archive : rebut
    archive --> [*]
```

## 7. Diagramme de cas d'utilisation

```mermaid
flowchart LR
    T["Technicien"]
    A["Admin"]
    C["Consultant / Client"]

    UC1["Se connecter (JWT)"]
    UC2["Consulter inventaire & fiche CI"]
    UC3["Créer / modifier une machine"]
    UC4["Détection matérielle (desktop)"]
    UC5["Lancer un stress test / benchmark"]
    UC6["Créer et clôturer un OT"]
    UC7["Ajouter une intervention"]
    UC8["Gérer le catalogue de pièces"]
    UC9["Gérer les utilisateurs"]
    UC10["Générer la fiche PDF"]
    UC11["Consulter le tableau de bord / KPIs"]

    T --> UC1
    A --> UC1
    C --> UC1
    T --> UC2
    A --> UC2
    C --> UC2
    A --> UC3
    T --> UC3
    T --> UC4
    A --> UC4
    T --> UC5
    A --> UC5
    T --> UC6
    A --> UC6
    T --> UC7
    A --> UC7
    A --> UC8
    A --> UC9
    T --> UC10
    A --> UC10
    C --> UC10
    C --> UC11
    T --> UC11
    A --> UC11
```

## 8. Technologies

| Composant | Technologie | Rôle |
| --- | --- | --- |
| Desktop | Tauri 2, Rust, sysinfo, rusqlite | Réflexion sur les coûts de développement en environnement natif. |
| Frontend | React 18, TypeScript, Tailwind, Recharts, Vite | Interface unique desktop + web. |
| API | Fastify 4, @fastify/cors, @fastify/static, @fastify/websocket | REST + WS + statique. |
| Stockage | better-sqlite3 (serveur), rusqlite (desktop) | Persistance locale/centrale. |
| Auth | jsonwebtoken (HS256), scrypt | Sessions JWT + hachage. |
| Reporting | pdfkit | Fiches techniques PDF. |

## 9. Liens

- [Cahier des charges (SFD)](./sfd.md)
- [Modèle de données](./data-model.md)
- [Référence API](./api.md)
- [Guide d'utilisation illustré](./usage-guide.md)