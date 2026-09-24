# Wiki · 04. Gouvernance DSI & Pratiques ITIL v4

> **Auteur : Martial Zinsou**

---

## 1. Les 5 pratiques ITIL

```mermaid
flowchart TD
    U["Usagers"] --> INC["Incidents P1..P4<br/>SLA"]
    U --> CAT["Catalogue DSI<br/>demandes"]
    INC --> CMDB["CMDB / CIs<br/>dépendances"]
    INC --> PRB["Problèmes<br/>RCA"]
    PRB --> KEDB["KEDB<br/>erreurs connues"]
    PRB --> RFC["Changements RFC<br/>CAB + rollback"]
    RFC --> CMDB
    CAT --> CMDB
```

---

## 2. Incidents — Matrice Impact × Urgence

| Impact \ Urgence | Critique | Haute | Moyenne | Faible |
| :--- | :---: | :---: | :---: | :---: |
| **Critique** | P1 | P1 | P2 | P2 |
| **Élevé** | P1 | P2 | P2 | P3 |
| **Moyen** | P2 | P2 | P3 | P4 |
| **Faible** | P2 | P3 | P4 | P4 |

SLA : P1 **2h**, P2 **8h**, P3 **24h**, P4 **72h**.

```mermaid
stateDiagram-v2
    [*] --> nouveau
    nouveau --> qualifie
    qualifie --> en_cours
    en_cours --> en_attente
    en_attente --> en_cours
    en_cours --> resolu
    resolu --> clos
    clos --> [*]
```

Captures DSI :

| Vue | Fichier |
| :--- | :--- |
| Supervision DSI | ![DSI](../screenshots/11-itil-dashboard.png) |
| Incidents & SLA | ![Incidents](../screenshots/12-itil-incidents.png) |

---

## 3. CMDB — Modèle et dépendances

```mermaid
erDiagram
    configuration_items ||--o{ ci_relations : source
    configuration_items ||--o{ ci_relations : cible
    configuration_items ||--o{ incidents : impacté
    configuration_items {
        text id PK
        text type
        text status
        text criticality
        text ip_address
    }
    ci_relations {
        text id PK
        text relation_type
    }
```

Types de relation : `depend_de`, `heberge`, `connecte_a`, `utilise_par`, `redondance_de`.

![CMDB](../screenshots/13-itil-cmdb.png)

---

## 4. Changements — Workflow CAB

```mermaid
sequenceDiagram
    actor D as Demandeur
    participant API as API
    actor CAB as Comité CAB
    D->>API: POST /itil/changes (RFC)
    API->>CAB: Notification
    CAB->>API: POST /itil/changes/:id/cab-vote
    API->>API: Agrège votes
    alt Approuvé
        D->>API: PATCH status=approuve → déploiement
    else Rejeté
        API-->>D: Rejet motivé
    end
```

Niveaux : `standard` (pré-approuvé), `normal` (CAB), `urgent` (ECAB). Risque : `faible`→`critique`. Rollback plan obligatoire.

![Changements](../screenshots/14-itil-changes.png)

---

## 5. Problèmes & KEDB — RCA

```mermaid
flowchart LR
    INC1["Incidents récurrents"] --> PRB["Problème<br/>analyse 5 pourquoi"]
    PRB --> RC["Cause racine"]
    RC --> WA["Workaround"]
    RC --> FIX["Correctif définitif"]
    WA --> KEDB2["Article KEDB"]
    FIX --> RFC2["RFC correctif"]
```

Chaque article KEDB documente : symptômes, cause racine, workaround, fix, compteur `views_count`.

![Problèmes & KEDB](../screenshots/15-itil-problems-kedb.png)

---

## 6. Catalogue de services

Prestations : station 3D, PC nomade, compte ERP, VPN MFA, upgrade RAM, diagnostic atelier. Délai estimé + prix + SLA livraison. Workflow : `soumise` → `approuvee` → `en_traitement` → `livree`.

![Catalogue](../screenshots/16-itil-catalogue.png)

---

> Rédigé par **Martial Zinsou**.
