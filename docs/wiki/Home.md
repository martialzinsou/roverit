# Wiki Officiel — RoverIt (Workstation OS Hub & DSI ITIL)

> **Auteur et Architecte de la solution : Martial Zinsou**  
> **Version : 0.1.0 — Référence de documentation et d'exploitation**

Bienvenue sur le **Wiki officiel de RoverIt**. Cette base de connaissances regroupe l'ensemble des spécifications d'ingénierie, des guides opérationnels et des procédures d'exploitation du système.

---

## 📚 Sommaire du Wiki

1. **[Architecture Globale & Choix Techniques](01-Architecture-Globale.md)**  
   *Architecture hybride desktop (Tauri 2 / Rust), PWA (React 18 / Vite / Tailwind), backend Fastify (Node.js / TypeScript) et persistance SQLite.*

2. **[Gestion d'Atelier & Reconditionnement Matériel](02-Gestion-Atelier-Reconditionnement.md)**  
   *Processus de prise en charge des machines, cycle de vie, gestion des composants, catalogue des pièces détachées et ordres de travail (OT).*

3. **[Benchmark & Supervision Thermique](03-Benchmark-Thermique.md)**  
   *Moteur de test de contrainte (CPU, GPU, RAM, stabilité), calcul du score de stabilité et télémétrie thermique en temps réel.*

4. **[Gouvernance DSI & Pratiques ITIL v4](04-Gouvernance-DSI-ITIL-v4.md)**  
   *Gestion des Incidents P1..P4 & respect des SLA, Base CMDB & cartographie des dépendances, Gestion des Changements & CAB, Problèmes & KEDB, Catalogue de Services DSI.*

5. **[Fonctionnement Hors-Ligne & Protocole de Synchronisation](05-Mode-Hors-Ligne-Synchronisation.md)**  
   *Architecture offline-first, file d'attente sortante (outbox web), persistance rusqlite locale sur le poste et synchronisation bidirectionnelle idempotente.*

6. **[Sécurité, Authentification & Contrôle d'Accès (RBAC)](06-Securite-RBAC.md)**  
   *Gestion des sessions JWT signées, matrice de permissions par rôle (Admin, Technicien, Consultant) et traçabilité par journal d'audit.*

7. **[Guide de Déploiement & Exploitation](07-Guide-Deploiement-Operations.md)**  
   *Prérequis, configuration d'environnement, build de production, packaging du binaire natif et reverse-proxy de production.*

---

## 🎨 Identité Visuelle & Thème

L'application arbore une interface haut de gamme inspirée de l'esthétique **Apple iMac** (verre dépoli / glassmorphism, palette des 7 couleurs emblématiques iMac, typographie épurée San Francisco et fond noir profond).

---

> Documentation conçue et rédigée par **Martial Zinsou**.
