# Wiki · 06. Sécurité, Authentification & Contrôle d'Accès (RBAC)

> **Auteur : Martial Zinsou**  
> **Projet : RoverIt — Workstation OS Hub**

---

## 1. Modèle d'Authentification

- **Tokens JWT** : Signés en HS256 avec une clé secrète configurée via la variable `ROVERIT_JWT_SECRET`. Expiration par défaut : 12 heures.
- **Hachage des mots de passe** : Chiffrement par fonction de dérivation de clé `scrypt` avec sel aléatoire cryptographique (format `salt:hash`).
- **En-tête de transport** : `Authorization: Bearer <token>`.

---

## 2. Matrice des Rôles (RBAC)

| Fonctionnalité | `technicien` | `admin` | `consultant` |
| :--- | :---: | :---: | :---: |
| Consultation tableaux de bord & rapports | ✅ | ✅ | ✅ |
| Fiches machines & benchmarks | ✅ | ✅ | ❌ |
| Ordres de travail & interventions | ✅ | ✅ | ❌ |
| Déclaration & traitement des Incidents ITIL | ✅ | ✅ | ❌ |
| Proposition de Changement (RFC) & vote CAB | ✅ | ✅ | ❌ |
| Publication dans la base KEDB | ✅ | ✅ | ❌ |
| Gestion des utilisateurs & suppression de machines | ❌ | ✅ | ❌ |
| Modification du catalogue de pièces | ❌ | ✅ | ❌ |

---

## 3. Piste d'Audit (`audit_events`)

Chaque action sensible (création de machine, clôture d'incident, vote CAB, changement de statut, suppression) enregistre un événement immuable comprenant :
- L'identifiant de l'utilisateur acteur.
- L'entité cible et son UUID.
- L'action effectuée.
- La charge utile sérialisée (payload JSON).
- L'horodatage UTC ISO 8601.

---

> Document Wiki rédigé par **Martial Zinsou**.
