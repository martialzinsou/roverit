# Wiki · 05. Mode Hors-Ligne & Synchronisation

> **Auteur : Martial Zinsou**

---

## 1. Philosophie offline-first

```mermaid
sequenceDiagram
    actor T as Technicien
    participant W as Web (outbox)
    participant L as SQLite desktop
    participant A as API centrale
    Note over T,W: Offline
    T->>W: Crée machine / OT
    W->>W: push outbox localStorage
    W->>L: INSERT local_machines (synced=0)
    Note over T,W: Online
    W->>A: flushOutbox → POST /sync
    A->>A: upsert idempotent (UUID)
    A-->>W: 200
    W->>W: drop outbox
    W->>L: mark_synced
```

---

## 2. Idempotence

UUID `crypto.randomUUID()` côté client + `INSERT ... ON CONFLICT(id) DO UPDATE` côté serveur. Rejeu sans doublon.

```mermaid
erDiagram
    local_machines {
        text id PK
        text name
        text hardware_json
        int synced
    }
    outbox {
        text id
        text method
        text url
        json payload
    }
```

---

## 3. Cache et résilience

GET mis en cache 60 s (`roverit.cache`). Si fetch échoue et hors-ligne, lecture du cache. WebSocket reconnexion automatique.

---

> Rédigé par **Martial Zinsou**.
