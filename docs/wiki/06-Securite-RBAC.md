# Wiki · 06. Sécurité, Authentification & RBAC

> **Auteur : Martial Zinsou**

---

## 1. Authentification JWT

- HS256, secret `JWT_SECRET`, TTL 12h, header `Authorization: Bearer <token>`.
- Mots de passe : `scrypt` + sel aléatoire (`salt:hash`).

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    C->>A: POST /auth/login {username, password}
    A->>A: scrypt verify
    A-->>C: JWT {userId, username, role}
    C->>A: GET /machines + Bearer JWT
    A->>A: verifyToken → req.user
```

---

## 2. Matrice RBAC

| Fonction | technicien | admin | consultant |
| :--- | :---: | :---: | :---: |
| Lecture dashboard/rapports | ✅ | ✅ | ✅ |
| CRUD machines/benchmarks | ✅ | ✅ | ❌ |
| Incidents / RFC / KEDB | ✅ | ✅ | ❌ |
| Catalogue commande | ✅ | ✅ | ✅ |
| Gestion users / suppression | ❌ | ✅ | ❌ |

```mermaid
flowchart LR
    REQ["Requête"] --> AUTH{"authenticate"}
    AUTH -->|401| ERR1["401 Unauthorized"]
    AUTH --> ROLE{"requireRole(...)"}
    ROLE -->|403| ERR2["403 Forbidden"]
    ROLE --> OK["Handler"]
```

---

## 3. Audit

Table `audit_events` : `entity`, `entity_id`, `action`, `user_id`, `payload`, `created_at`. Tracé sur chaque écriture sensible.

![Réglages](../screenshots/10-reglages.png)

---

> Rédigé par **Martial Zinsou**.
