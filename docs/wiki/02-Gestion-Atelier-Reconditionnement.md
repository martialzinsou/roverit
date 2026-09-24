# Wiki · 02. Gestion d'Atelier & Reconditionnement

> **Auteur : Martial Zinsou**

---

## 1. Cycle de vie d'une station

```mermaid
stateDiagram-v2
    [*] --> en_attente_diagnostic : Entrée atelier
    en_attente_diagnostic --> en_cours_upgrade : Diagnostic OK
    en_cours_upgrade --> en_test_thermique : Pièces posées
    en_test_thermique --> pret_deploiement : Score ≥ 85
    en_test_thermique --> en_cours_upgrade : Échec thermique
    pret_deploiement --> archive : Vente / livraison
    archive --> [*]
```

### Captures

| Vue | Aperçu |
| :--- | :--- |
| Inventaire | ![Inventaire](../screenshots/03-inventaire.png) |
| Fiche machine | ![Détail](../screenshots/04-machine-detail.png) |
| Catalogue pièces | ![Pièces](../screenshots/05-catalogue-pieces.png) |

---

## 2. Schéma entité-association — Atelier

```mermaid
erDiagram
    machines ||--o{ components : contient
    machines ||--o{ benchmark_runs : mesurée_par
    machines ||--o{ work_orders : concernée_par
    work_orders ||--o{ interventions : contient
    work_orders ||--o{ checklist_items : contient
    users ||--o{ interventions : auteur
    machines {
        text id PK
        text name
        text status
        text manufacturer
        text model
    }
    work_orders {
        text id PK
        text title
        text priority
        text status
    }
```

---

## 3. Séquence — Création d'un ordre de travail

```mermaid
sequenceDiagram
    actor T as Technicien
    participant W as Web
    participant API as API
    participant DB as SQLite
    T->>W: Crée OT (titre, priorité, checklist)
    W->>API: POST /work-orders
    API->>DB: INSERT work_orders + checklist_items
    API-->>W: 201 OT
    W->>API: POST /work-orders/:id/interventions
    API->>DB: INSERT intervention + décrémente stock parts
```

---

## 4. Checklist technique obligatoire

- Nettoyage / dépoussiérage
- Pâte thermique MX-6
- Ventilateurs / RPM
- Connectique PCIe / alim
- Test stabilité 10 min

![Ordres de travail](../screenshots/07-ot.png)
![Détail OT](../screenshots/08-ot-detail.png)

---

> Rédigé par **Martial Zinsou**.
