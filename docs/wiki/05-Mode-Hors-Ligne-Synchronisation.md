# Wiki · 05. Mode Hors-Ligne & Protocole de Synchronisation

> **Auteur : Martial Zinsou**  
> **Projet : RoverIt — Workstation OS Hub**

---

## 1. Philosophie Offline-First

Un atelier ou un site d'intervention peut être temporairement privé de connexion Internet. RoverIt garantit une continuité opérationnelle totale hors-ligne grâce à une stratégie hybride :

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Technicien
    participant Web as Client Web (Outbox)
    participant LocalDB as SQLite Locale (Desktop)
    participant API as Serveur Central RoverIt

    Note over Tech,Web: Déconnexion Réseau (Offline)
    Tech->>Web: Crée une machine ou un ordre de travail
    Web->>Web: Enregistrement dans localStorage (Outbox)
    Web->>LocalDB: Écriture locale persistée (rusqlite)
    Note over Tech,Web: Retour de la connectivité (Online)
    Web->>API: Événement "online" → Déclenchement flushOutbox()
    API->>API: Exécution idempotente (Upsert par UUID)
    API-->>Web: Confirmation 200 OK
    Web->>Web: Suppression de l'entrée dans l'Outbox
```

---

## 2. Idempotence des Écritures

Chaque entité créée (machine, composant, intervention, incident) dispose d'un identifiant universellement unique généré côté client (`crypto.randomUUID()`). Les requêtes rejouées sur le serveur utilisent l'opération SQLite `INSERT INTO ... ON CONFLICT(id) DO UPDATE ...`, éliminant tout risque de doublon.

---

> Document Wiki rédigé par **Martial Zinsou**.
