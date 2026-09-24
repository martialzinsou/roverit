# Wiki · 01. Architecture Globale & Choix Techniques

> **Auteur : Martial Zinsou**  
> **Projet : RoverIt — Workstation OS Hub & DSI ITIL v4**

---

## 1. Vue d'ensemble du système

RoverIt repose sur une architecture monorepo en trois couches avec un package partagé garantissant l'intégrité des contrats de données.

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        NATIVE["Desktop App<br/>Tauri 2 · Rust · sysinfo"]
        WEB["Navigateur / PWA<br/>React 18 · Offline-first"]
    end
    subgraph Core["Cœur applicatif"]
        SHARED["@roverit/shared<br/>Types · Constantes · Helpers"]
        SERVER["API Fastify · Node/TS<br/>REST + WebSocket + PDFKit"]
    end
    subgraph Storage["Persistance"]
        SQLL["SQLite locale<br/>rusqlite (desktop)"]
        SQLS["SQLite centrale<br/>better-sqlite3"]
    end
    NATIVE --> SHARED
    WEB --> SHARED
    SERVER --> SHARED
    NATIVE --> SQLL
    NATIVE -->|HTTPS / WSS| SERVER
    WEB -->|HTTPS / WSS| SERVER
    SERVER --> SQLS
```

### Capture — Thème Apple iMac

![Connexion](../screenshots/01-login.png)
*Page de connexion — verre dépoli et palette des 7 couleurs iMac.*

---

## 2. Découpage du monorepo

| Répertoire | Rôle | Stack |
| :--- | :--- | :--- |
| `packages/shared` | Types, validateurs, helpers | TypeScript 5.5 |
| `apps/server` | REST + WS + PDF + SQLite | Fastify 4, pdfkit, ws |
| `apps/web` | UI unique (PWA & desktop) | React 18, Vite 5, Tailwind 3, Recharts |
| `apps/desktop` | Enveloppe native + télémétrie | Tauri 2, Rust, sysinfo 0.32 |

---

## 3. Diagramme de composants UML

```mermaid
flowchart LR
    subgraph Desktop["apps/desktop — Tauri 2 (Rust)"]
        TAPI["hardware_profile<br/>live_stats<br/>run_stress_test"]
        TSTORE["Store SQLite<br/>local_machines"]
        TWEB["WebView · apps/web"]
    end
    subgraph Server["apps/server — Fastify"]
        API["REST /api/v1<br/>auth · machines · benchmarks<br/>work-orders · itil"]
        WS["WebSocket /ws"]
        PDF["PDFKit"]
        SQL["SQLite roverit.db"]
    end
    subgraph Shared["packages/shared"]
        TYPES["Types métier"]
    end
    TWEB --> TAPI
    TAPI --> TSTORE
    TWEB --> API
    API --> SQL
    PDF --> SQL
    TYPES -.-> TWEB
    TYPES -.-> API
```

---

## 4. Diagramme de déploiement UML

```mermaid
flowchart TB
    DEV["Poste technicien<br/>Tauri desktop"] -->|HTTPS 3001| SRV["Serveur Fastify<br/>Node 20 + SQLite WAL"]
    BROWSER["Navigateur PWA"] -->|HTTPS 3001| SRV
    SRV --> DISK["Volume roverit.db"]
    SRV --> WS2["WebSocket /ws"]
    BROWSER --> WS2
    DEV --> WS2
```

---

## 5. Diagramme de cas d'utilisation

```mermaid
flowchart LR
    Tech["Technicien"] --> UC1["Gérer inventaire"]
    Tech --> UC2["Lancer benchmark"]
    Tech --> UC3["Traiter OT"]
    Tech --> UC4["Déclarer incident P1..P4"]
    Tech --> UC5["Créer RFC / voter CAB"]
    Admin["Admin"] --> UC6["Gérer utilisateurs<br/>catalogue · CIs"]
    Admin --> UC4
    Admin --> UC5
    Client["Consultant"] --> UC7["Consulter dashboard<br/>rapports PDF"]
    Client --> UC8["Commander au catalogue DSI"]
```

---

## 6. Séquence — Authentification JWT

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant W as Web/PWA
    participant A as API Fastify
    participant DB as SQLite
    U->>W: Saisit identifiants
    W->>A: POST /api/v1/auth/login
    A->>DB: SELECT user + scrypt verify
    DB-->>A: OK
    A-->>W: 200 {token, user}
    W->>W: stocke JWT + ouvre WebSocket
```

---

## 7. Communication temps réel

WebSocket `/ws` diffuse `hello`, `machines`, `work_orders`, `itil_incident_created`, `itil_change_created` à tous les clients connectés.

---

> Rédigé par **Martial Zinsou**.
