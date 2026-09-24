# Wiki · 07. Guide de Déploiement & Exploitation

> **Auteur : Martial Zinsou**  
> **Projet : RoverIt — Workstation OS Hub**

---

## 1. Prérequis Système

- **Node.js** : version 20.x ou 22.x LTS.
- **npm** : version 10+.
- **Rust & Cargo** : version 1.75+ (uniquement pour compiler l'application de bureau Tauri).
- **SQLite3** : intégré nativement via `better-sqlite3` et `rusqlite`.

---

## 2. Variables d'Environnement

| Variable | Défaut | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Port d'écoute du serveur Fastify |
| `HOST` | `0.0.0.0` | Adresse IP d'écoute réseau |
| `ROVERIT_DB_PATH` | `./data/roverit.db` | Chemin du fichier de base de données SQLite |
| `ROVERIT_JWT_SECRET` | *(généré par défaut)* | Clé secrète de signature des jetons de session |
| `ROVERIT_TOKEN_TTL` | `12h` | Durée de validité des sessions |
| `ROVERIT_NO_WS` | *(vide)* | Si défini à `1`, désactive la passerelle WebSocket |

---

## 3. Commandes d'Exploitation

```bash
# 1. Installation des dépendances
npm install

# 2. Vérification statique des types
npm run typecheck

# 3. Lancement des tests unitaires et d'intégration (14/14 tests)
npm test

# 4. Compilation de production de l'ensemble des packages
npm run build

# 5. Démarrage du serveur en production
npm start
```

---

> Document Wiki rédigé par **Martial Zinsou**.
