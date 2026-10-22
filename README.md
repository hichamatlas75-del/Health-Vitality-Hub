# Health & Vitality Hub (PWA)

Application PWA unifiée de santé métabolique, combinant en une seule interface moderne :
1. **Jeûne Intermittent** (adapté de *Fast Master*) : Protocoles (16:8, 18:6, 20:4, OMAD, Flexible), chrono en temps réel, 6 étapes métaboliques avec conseils et effets physiologiques.
2. **Nutrition & Glucides Marocains** (adapté de *Gluco-Carb Maroc*) : Catalogue de plats et pâtisseries du Maroc (tajines, couscous, khobz, msemen, etc.), calcul des glucides nets, protéines, charge glycémique (CG) et score d'amorti `(P+F)/G`.
3. **Sport Maison** (adapté de *Workout Home*) : 20 exercices guidés au poids du corps, routines par niveau (Débutant, Intermédiaire, Avancé), chrono d'effort/repos synchronisé avec coach vocal (Speech Synthesis) et signaux sonores (Web Audio API).
4. **Tableau de Bord de Synthèse (Dashboard)** : Vue d'ensemble quotidienne synthétisant le Score de Vitalité (0 à 100%), le chrono de jeûne en cours, le cumul des glucides consommés face à la limite journalière, et l'état de la séance de sport du jour.

---

## 🔒 Intégrité & Sécurité des Sources

Les 3 répertoires d'origine sont restés **100% intacts et en lecture seule stricte** :
- `calculateur glucides` : aucun fichier modifié.
- `FAST-MASTER` : aucun fichier modifié.
- `WORK OUT` : aucun fichier modifié.

Tout le code source du projet unifié est situé exclusivement dans ce dossier autonome :
`C:\Users\mplp000\OneDrive\Dokumente\GitHub\unified-health-pwa`

---

## 🛠️ Stack Technique

- **Bundler & Dev Server** : [Vite](https://vitejs.dev/) v5 (Ultra-rapide, HMR, zéro configuration superflue).
- **Architecture** : Vanilla JavaScript ES Modules (modulaire, sans framework lourd, zéro dépendance superflue).
- **Audio & Voix** : Web Audio API (synthèse des signaux et bips hors-ligne) & Web Speech API (coach vocal en français).
- **Maintien de l'écran allumé** : Screen Wake Lock API.
- **PWA & Offline** : Service Worker (`sw.js`) avec stratégie de mise en cache locale et manifeste PWA standard (`manifest.webmanifest`).
- **Persistance** : LocalStorage unifié sous la clé `health_vitality_hub_data_v1` avec fonction d'export/import de sauvegarde JSON.

---

## 📂 Structure du Projet

```text
unified-health-pwa/
├── dist/                          # Compilation prête pour production / Cloudflare Pages
├── public/
│   ├── _headers                   # En-têtes HTTP de sécurité et cache pour Cloudflare Pages
│   ├── favicon.svg                # Favicon vectoriel haute résolution
│   ├── manifest.webmanifest       # Configuration PWA standard
│   ├── sw.js                      # Service Worker offline
│   └── icons/
│       ├── icon-192.svg           # Icône PWA 192x192
│       └── icon-512.svg           # Icône PWA 512x512
├── src/
│   ├── core/
│   │   ├── audio.js               # Signaux sonores et coach vocal hors-ligne
│   │   ├── pwa.js                 # Détection hors-ligne et installation PWA
│   │   ├── router.js              # Routeur SPA sans rechargement
│   │   └── store.js               # Store réactif unifié & persistance locale
│   ├── modules/
│   │   ├── dashboard/
│   │   │   └── dashboard.js       # Vue Dashboard & Score de Vitalité
│   │   ├── fasting/
│   │   │   ├── fastingData.js     # Protocoles & Étapes métaboliques
│   │   │   ├── fastingEngine.js   # Moteur de calcul du jeûne
│   │   │   └── fastingView.js     # Interface interactive du jeûne
│   │   ├── nutrition/
│   │   │   ├── foodsData.js       # Base alimentaire marocaine & presets
│   │   │   ├── nutritionEngine.js # Moteur métabolique & amorti glycémique
│   │   │   └── nutritionView.js   # Interface composeur d'assiette & journal
│   │   └── workout/
│   │       ├── exerciseData.js    # 20 exercices & routines par niveau
│   │       ├── workoutEngine.js   # Machine à états d'effort/repos & WakeLock
│   │       └── workoutView.js     # Interface de séance & player actif
│   ├── styles/
│   │   ├── base.css               # Reset, typographie, design tokens
│   │   ├── components.css         # Bottom Navigation Bar, cartes, boutons
│   │   ├── dashboard.css          # Styles du tableau de bord
│   │   ├── fasting.css            # Styles du chrono et étapes
│   │   ├── nutrition.css          # Styles nutrition & aliments
│   │   └── workout.css            # Styles de séance & player actif
│   ├── ui/
│   │   └── icons.js               # Bibliothèque d'icônes SVG intégrées
│   └── main.js                    # Point d'entrée principal
├── index.html                     # Squelette HTML5 SPA
├── package.json                   # Scripts et dépendances
└── vite.config.js                 # Configuration de build Vite
```

---

## 🚀 Instructions d'Exécution & Compilation

### 1. Prérequis
Node.js (v18+) et npm installés.

### 2. Lancer en local (Mode Développement)
```bash
cd "C:\Users\mplp000\OneDrive\Dokumente\GitHub\unified-health-pwa"
npm install
npm run dev
```
L'application démarre immédiatement sur `http://localhost:3000` (ou le port indiqué par Vite).

### 3. Compiler pour la Production
```bash
npm run build
```
Les fichiers compilés et optimisés sont générés dans le dossier `dist/`.

### 4. Tester la version de Production localement
```bash
npm run preview
```

---

## ☁️ Déploiement sur Cloudflare Pages

Le dossier `dist/` est 100% prêt à être déployé sur Cloudflare Pages :
1. Créez un nouveau projet sur **Cloudflare Pages** (connecté à votre dépôt GitHub ou via Direct Upload / Wrangler).
2. Paramètres de compilation recommandés :
   - **Framework preset** : `Vite` (ou `None`)
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
   - **Root directory** : `unified-health-pwa`
3. Le fichier `public/_headers` est automatiquement copié dans `dist/` pour configurer le cache et les en-têtes de sécurité.
