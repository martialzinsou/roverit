# RoverIt — Référence API REST/WebSocket

Base de l'API : **`/api/v1`** — serveur : **`http://localhost:3001`** (défaut).

Sauf mention contraire, toute route est protégée par un **JWT Bearer** :

```
Authorization: Bearer <token>
```

## 1. Authentification

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | — | Connexion → `{ token, user }` (durée : 12 h). |
| `GET` | `/auth/me` | tout | Profil de l'utilisateur connecté. |
| `GET` | `/users` | admin | Liste des utilisateurs (sans hash). |
| `POST` | `/auth/logout` | tout | Déconnexion (broadcast WS). |

**Corps de login** : `{ "username": "admin", "password": "admin" }`

## 2. Machines & composants (Module 1)

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `GET` | `/machines` | tout | Liste (filtre `?status=pret_deploiement`). |
| `POST` | `/machines` | technicien, admin | Créer une machine (id UUID client conservé → upsert idempotent). |
| `GET` | `/machines/:id` | tout | Fiche complète : `components`, `benchmarks`, `work_orders`. |
| `PATCH` | `/machines/:id` | technicien, admin | Mettre à jour (statuts travaillés). |
| `DELETE` | `/machines/:id` | admin | Supprimer (cascade). |
| `GET` | `/machines/:id/components` | tout | Composants de la machine. |
| `POST` | `/machines/:id/components` | technicien, admin | Ajouter un composant. |

**Flux d'état machine déclenché automatiquement** :
- création d'un OT → machine `en_cours_upgrade` ;
- clôture d'un OT → machine `pret_deploiement`.

## 3. Catalogue de pièces (Module 1)

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `GET` | `/parts` | tout | Catalogue complet. |
| `POST` | `/parts` | admin | Ajouter une pièce (catégorie, prix, stock, compatibilité). |
| `PATCH` | `/parts/:id` | admin | Mettre à jour la pièce. |
| `GET` | `/parts/compatibility-check?machine_id=&part_id=` | technicien, admin | Contrôle de compatibilité → `{ ok, warnings }`. |

## 4. Benchmarks & supervision (Module 2)

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `GET` | `/benchmarks` | tout | Historique global (filtre `?machine_id=`). |
| `GET` | `/machines/:id/benchmarks` | tout | Runs d'une machine. |
| `POST` | `/benchmarks/run` | technicien, admin | Lancer un but de stress (serveur, simulé). Corps : `{ machine_id, kind, duration_s, notes }`. |
| `POST` | `/benchmarks` | technicien, admin | Enregistrer un résultat manuel (~desktop réel). |

## 5. Ordres de travail (Module 3)

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `GET` | `/work-orders` | tout | Liste (filtres `?machine_id=&status=`). Inclut `machine_name`. |
| `POST` | `/work-orders` | technicien, admin | Créer un OT + checklist automatique (6 items). |
| `GET` | `/work-orders/:id` | tout | Détail : `checklist`, `interventions` (avec `user_name`), `machine_name`. |
| `PATCH` | `/work-orders/:id` | technicien, admin | Mettre à jour (statut, priorité…). |
| `POST` | `/work-orders/:id/interventions` | technicien, admin | Ajouter une intervention (passe l'OT `en_cours`). |
| `PATCH` | `/work-orders/:id/checklist/:itemId` | technicien, admin | Cocher un élément (`{ done: true }`). |

## 6. Rapports & KPIs (Module 4)

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `GET` | `/reports/:id/pdf` | tout | Fiche technique PDF (A4, pdfkit). |
| `GET` | `/dashboard/kpis` | tout | KPIs : parc, score stabilité, OT, interventions 30 j, stock, déploiements 30 j. |

## 7. Synchronisation hors-ligne

| Méthode | Route | Rôle requis | Description |
| --- | --- | --- | --- |
| `POST` | `/sync` | technicien, admin | Push de données répliquées hors-ligne : `{ machines?, work_orders? }` → **upsert** `ON CONFLICT(id)`. |
| `GET` | `/sync/changes?since=ISO` | tout | Récupération incrémentale (`updated_at > since`) → `{ machines, work_orders, server_time }`. |

## 8. Divers

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Santé du serveur + nombre de clients WebSocket connectés. |
| `GET` | `/api/v1/health` | Version de l'API. |
| `WS` | `/ws` | Canal temps réel (voir ci-dessous). |

## 9. WebSocket `/ws`

Connexion : `ws://localhost:3001/ws` (même origine en production).

**Événements reçus** après connexion : `hello` (`{ server_time }`).

**Événements poussés** (en temps réel, sur toute écriture) :

| Événement | Payload |
| --- | --- |
| `machines` | `{ action: create|update|delete, machine?, id? }` |
| `components` | `{ action: create, component, machine_id }` |
| `parts` | `{ action: create|update, part }` |
| `benchmarks` | `{ action: run|create, run }` |
| `work_orders` | `{ action: create|update, work_order }` |
| `interventions` | `{ action: create, intervention, work_order_id }` |
| `checklist` | `{ action: update, work_order_id, itemId, done }` |
| `sync` | `{ action: push, machines, work_orders }` |
| `auth` | `{ action: logout }` |

Chaque message est enveloppé : `{ event, payload, ts }`. L'application peut aussi envoyer `{ event: "ping" }` et reçoit `pong`.

## 10. Codes d'erreur

| Code | Sens |
| --- | --- |
| `400` | Requête invalide (champ requis, format). |
| `401` | Token absent / invalide / expiré. |
| `403` | Rôle insuffisant (RBAC). |
| `404` | Ressource introuvable. |
| `503` | Mode hors-ligne (côté frontend). |

Exemple de réponse d'erreur : `{ "error": "Authentification requise" }`