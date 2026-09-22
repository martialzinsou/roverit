# RoverIt — Cahier de spécifications fonctionnelles et techniques (SFD)

> Nom de code : **Workstation OS Hub**
> Version : 0.1.0 — Document de référence des exigences de l'application RoverIt.

---

## 1. Contexte et objectif

L'application **RoverIt** répond au besoin d'une plateforme de **gestion technique de matériel, de reconditionnement et de supervision d'infrastructures** (stations de travail, serveurs lourds, machines spécialisées).

Elle couvre l'intégralité du cycle de vie d'une machine :

1. **Entrée en atelier / diagnostic** → détection du matériel, état de santé des composants.
2. **Reconditionnement / upgrade** → remplacement de pièces, ordres de travail, checklists.
3. **Validation thermique** → test de stabilité, benchmarking, supervision temps réel.
4. **Déploiement / vente** → fiche technique PDF, KPIs de valorisation, traçabilité complète.

## 2. Utilisateurs et rôles

| Rôle | Code | Droits |
| --- | --- | --- |
| Technicien | `technicien` | Lecture + création/édition des machines, composants, OT, interventions, benchmarks. |
| Chef d'atelier / Admin | `admin` | Tous les droits technicien + gestion des utilisateurs, du catalogue de pièces, suppression, réglages. |
| Consultant / Client | `consultant` | Lecture seule : tableau de bord, fiches machines, rapports et exports PDF. |

L'authentification repose sur **JWT (HS256)** ; chaque requête d'écriture vérifie le rôle via un contrôle **RBAC** côté serveur (`authenticate` + `requireRole`).

## 3. Plateformes cibles

- **Desktop natif** : application installable **Tauri 2** (socle Rust) — santé à l'arrivée du matériel : démarrage **< 1,5 s**, mémoire **< 120 Mo**, lecture matérielle locale (CPU, RAM, disques, température), stress test réel sur le processeur.
- **Web** : **PWA** (Service Worker) — même interface, mode **offline-first** (file d'attente « outbox » dans le navigateur, cache local, re-synchronisation automatique au retour réseau).
- **API** : serveur **Node.js / TypeScript (Fastify)**, REST + WebSocket, servent les deux interfaces.

## 4. Architecture technique

| Couche | Choix | Rôle |
| --- | --- | --- |
| Desktop framework | **Tauri 2 (Rust)** | Conteneur natif + commandes matériel (`commands.rs`) et base locale (`store.rs`). |
| Frontend / UI | **React + TypeScript + TailwindCSS** | Interface unique partagée desktop & web (PWA), `apps/web`. |
| Backend API | **Node.js / Fastify (TypeScript)** | REST + WebSocket + génération PDF, `apps/server`. |
| Base de données | **SQLite** (serveur + locale desktop) | Schéma conçu pour rester compatible avec **PostgreSQL**. |
| Types partagés | **`@roverit/shared`** | Types métier (Machine, WorkOrder, BenchmarkRun…) consommés par les 3 apps. |
| Sécurité | **JWT HS256 + RBAC + TLS 1.3** | Reverse proxy TLS 1.3 recommandé en production (Caddy/Nginx). |

## 5. Modules fonctionnels

### Module 1 — Gestion des équipements & composants
- Inventaire / **CMDB** des machines avec fiche CI complète, numéro de série, constructeur, modèle, CPU/GPU/RAM/stockage.
- **Détection matérielle** automatique dans le desktop (profil local transmis lors de la création).
- **Catalogue de pièces** avec prix, stock, et **alertes de compatibilité** (règles `ram<=N`, `tbp<=N`, mots-clés CPU/GPU).
- Ajout de composants par machine (CPU, GPU, RAM, stockage, batterie, carte mère, refroidissement…).

### Module 2 — Supervision & benchmarking
- **Monitoring temps réel** (desktop uniquement) : CPU, mémoire, température, fréquence, uptime.
- **Séquenceur de stress test** : types `stability`, `cpu`, `gpu`, `memory`, `thermal`, durée sélectionnable (10 s → 600 s).
- **Score de stabilité thermique** (0-100) calculé depuis les températures moyenne/maximale et la charge CPU.
- Historique des runs par machine + graphique températures/score.

### Module 3 — Workflow de reconditionnement & OT
- **Ordres de travail** (OT) : priorité, statut, technicien assigné.
- **Checklist d'intervention** générée automatiquement (dépoussiérage, pâte thermique, ventilateurs, connectique, test de stabilité, firmware).
- **Interventions tracées** : action, notes, pièces utilisées, horodatage et auteur.
- **Cycle de vie** : les statuts machine suivent automatiquement les OT (`ouverte` → `en cours` → `terminee` → machine `pret_deploiement`).

### Module 4 — Reporting & exportation
- **Fiches techniques PDF** (pdfkit) : renseignements, composants, benchmarks, ordres de travail.
- **Tableau de bord & KPIs** : machines par statut, score de stabilité moyen, OT ouverts, interventions 30 jours, valeur de stock, machines prêtes.
- Bilan « GPU upgrade vs performances » et taux de machines prêtes au déploiement.

## 6. Exigences non fonctionnelles

| Exigence | Seuil |
| --- | --- |
| Démarrage desktop | **< 1,5 s** |
| Empreinte mémoire desktop | **< 120 Mo** |
| Mode hors-ligne | Fonctionnel (outbox web + SQLite locale desktop) |
| Temps de réponse API | < 200 ms en local (requêtes SQL indexées) |
| Sécurité | TLS 1.3, JWT signé + expiration, RBAC, mots de passe hachés (scrypt) |
| Traçabilité | Table `audit_events` : qui a fait quoi, sur quoi, quand |

## 7. Données de démonstration (seed)

Fournies au démarrage si le serveur est vide : 3 utilisateurs (`admin/admin`, `tech/tech`, `client/client`), 4 stations de travail (Alpha WS-01 → Delta WS-04) dans des états de cycle de vie variés, composants, 8 pièces au catalogue, 5 runs de benchmark et 4 ordres de travail avec interventions et checklist.

## 8. Hors périmètre (v0.1)
- Multi-tenant / organisation (client renseigné en attribut simple).
- Supervision à distance multi-sites (WS temps réel extensible via `/ws`).
- Migration automatique vers PostgreSQL en production (schéma déjà compatible).