# Wiki · 03. Benchmark & Supervision Thermique

> **Auteur : Martial Zinsou**

---

## 1. Types d'épreuve

| Kind | Objectif | Durée |
| :--- | :--- | :--- |
| `stability` | Charge CPU+GPU combinée | 600 s |
| `cpu` | Stress multi-cœurs | 300 s |
| `gpu` | Shaders / VRAM | 300 s |
| `memory` | Intégrité RAM | 300 s |
| `thermal` | Courbe montée/dissipation | 600 s |

![Benchmark](../screenshots/06-benchmark.png)

---

## 2. Score de stabilité

Normalisé 0–100. Seuil de validation : **≥ 85** → passage en `pret_deploiement`. En dessous, repaste thermique recommandé.

```mermaid
flowchart LR
    START["Lancer run"] --> LOAD["Charge CPU/GPU"]
    LOAD --> SAMPLE["Échantillon temp / CPU%"]
    SAMPLE --> SCORE["score = f(temp_max, throttling, erreurs)"]
    SCORE --> DECIDE{"score ≥ 85 ?"}
    DECIDE -->|oui| OK["Prêt déploiement"]
    DECIDE -->|non| RETRY["Repaste + retest"]
```

---

## 3. Télémétrie native (Tauri Rust)

`sysinfo 0.32` expose via commandes Tauri :

- `hardware_profile` → CPU, RAM, disques, batterie
- `live_stats` → `cpu_pct`, `mem_used`, `cpu_temp_c`, `freq_mhz`
- `run_stress_test(duration)` → boucle CPU bound + mesures

```mermaid
sequenceDiagram
    participant W as WebView
    participant R as Rust commands.rs
    participant OS as sysinfo
    W->>R: invoke live_stats
    R->>OS: System::new_all + refresh
    OS-->>R: cpu, mem, temp
    R-->>W: LiveStats JSON
```

---

## 4. Modèle de données

```mermaid
erDiagram
    benchmark_runs {
        text id PK
        text machine_id FK
        text kind
        real score
        real avg_temp_c
        real max_temp_c
        int duration_s
    }
    machines ||--o{ benchmark_runs : mesurée_par
```

---

> Rédigé par **Martial Zinsou**.
