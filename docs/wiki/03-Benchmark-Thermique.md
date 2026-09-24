# Wiki · 03. Benchmark & Supervision Thermique

> **Auteur : Martial Zinsou**  
> **Projet : RoverIt — Workstation OS Hub**

---

## 1. Moteur de Test & Métriques

Le module de benchmark assure la qualification thermique et la détection précoce du *thermal throttling* (étranglement thermique) :

- **Types d'épreuves** :
  - `stability` : Charge combinée CPU + GPU simulant un rendu 3D prolongé.
  - `cpu` : Calcul intensif d'éléments finis et stress multi-cœurs.
  - `gpu` : Test de mémoire vidéo et rendu shaders OpenGL/DirectX.
  - `memory` : Test d'intégrité de la RAM (recherche d'erreurs mémoire ECC/non-ECC).
  - `thermal` : Courbe de montée en température et vitesse de dissipation après coupure de charge.

---

## 2. Détection Matérielle Native (Rust)

Sur l'application de bureau Tauri, le backend Rust interroge le système d'exploitation via la bibliothèque `sysinfo` :
- Fréquence actuelle par cœur (MHz).
- Températures capteurs CPU / GPU (°C).
- Taux d'utilisation processeur et mémoire vive en temps réel.
- Cycles et santé de la batterie (pour les stations de travail nomades).

Le score de stabilité est normalisé sur une échelle de 0 à 100 : un score supérieur ou égal à 85 valide la station pour son déploiement.

---

> Document Wiki rédigé par **Martial Zinsou**.
