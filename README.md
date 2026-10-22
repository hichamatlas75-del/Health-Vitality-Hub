# Health & Vitality Cockpit (PWA)

Application PWA unifiée de **pilotage exécutif, lecture passive et analyse croisée métabolique** connectée en direct aux backends des 3 applications mères :
1. **Gluco-Carb Maroc** : Backend Supabase Cloud REST (`app_accounts`), lecture des macronutriments, glucides nets, protéines, charge glycémique et horodatage des repas.
2. **Workout Home** : Backend Firebase Realtime Database chiffré de bout en bout en AES-256-GCM Zero-Knowledge (`workout_profiles`), lecture de l'historique des séances (Full Body 17), des calories et de la série d'assiduité.
3. **Fast Master** : Moteur de jeûne intermittent 18/6 automatique (15h00 - 09h00), calcul en temps réel des étapes métaboliques (Chute Insuline, Cétose, Autophagie) et respect de la fenêtre alimentaire.

---

## 🎯 Rôle Exécutif : Lecture, Croisement & Objectifs Journaliers

Conformément à la stratégie d'architecture, cette application est un **Tableau de Bord Exécutif (Cockpit)** qui :
- **Lit en continu les données et performances du profil partagé (`hicham`)** sans modifier les applications mères.
- **Croise les données (Cross-Analytics)** :
  - **Timing Repas vs Fenêtre 18/6** : Vérification chronobiologique que chaque repas pris dans *Gluco-Carb Maroc* se situe bien à l'intérieur de la fenêtre autorisée (09h00 - 15h00), avec la répartition idéale :
    - **Repas 1 (10h00) - Rupture du Jeûne [40%]** : ~770 kcal • 60g Protéines • 60g Glucides • 32g Lipides.
    - **Repas 2 (15h00) - Clôture du Jeûne [60%]** : ~1150 kcal • 90g Protéines • 90g Glucides • 48g Lipides.
  - **Synergie Anabolique (Sport ↔ Protéines)** : Corrélation entre le stimulus musculaire issu de *Workout Home* et le quota de protéines absorbé dans *Gluco-Carb Maroc* (cible 150g).
  - **Recharge Glycogénique & Énergie (85 kg)** : Équilibre global : ~1920-2000 kcal, Glucides nets ≤ 150g, Protéines 150g, Lipides 80g.
- **Définit 3 Objectifs Journaliers et vérifie leur accomplissement en temps réel** :
  1. ⚡ **Pilier 1 : Jeûne 18/6** (15h00 - 09h00, validé dès démarrage du chrono à 15h00).
  2. 🥗 **Pilier 2 : Protocole Nutrition 85 kg (18-6)** (~1920-2000 kcal, 150g Protéines, Glucides nets ≤ 150g, 80g Lipides).
  3. 🏋️ **Pilier 3 : Entraînement Quotidien Full Body 17** (1 séance validée le jour même).
  - **Score global d'accomplissement** en temps réel (ex: 3/3 Validés, 100%).

---

## 🔒 Intégrité & Sécurité Absolue des Sources

Les 3 répertoires d'origine sont restés **100% intacts et en lecture seule stricte** :
- `calculateur glucides` : aucun fichier modifié, déplacé ou écrasé.
- `FAST-MASTER` : aucun fichier modifié, déplacé ou écrasé.
- `WORK OUT` : aucun fichier modifié, déplacé ou écrasé.

Tout le code source du projet unifié est situé exclusivement dans ce dossier autonome :
`C:\Users\mplp000\OneDrive\Dokumente\GitHub\unified-health-pwa`

---

## 🧭 Navigation SPA (5 Sections Principales)

- **Cockpit (`#dashboard`)** : Vue de synthèse exécutive, jauge globale d'accomplissement des 3 piliers, conseil métabolique en direct et 3 widgets de flux en continu.
- **Objectifs (`#objectifs`)** : Fiches détaillées des 3 objectifs journaliers avec règles strictes, état en direct, preuves de vérification et jauges de progression.
- **Historique (`#history`)** : Visualisation évolutive complète des 3 applications avec bascule instantanée :
  - **Mode Courbes** : Graphiques vectoriels interactifs (Glucides nets vs plafond 120g/150g & protéines, Calories brûlées sur les 37 séances, Constance du jeûne 18h).
  - **Mode Diaporama** : Carrousel interactif avec défilement automatique / manuel (Fiches repas Gluco-Carb, Fiches séances Workout Home, Cycles de jeûne Fast Master, Tableau croisé jour par jour).
- **Croisement (`#cross`)** : Analyse croisée avec frise chronologique 24h des repas vs jeûne 18/6, indice anabolique de récupération et bilan glycogénique.
- **Sources (`#sources`)** : Console technique de transparence affichant l'état des serveurs Supabase REST et Firebase RTDB, les payloads JSON bruts et le sélecteur de profil.

---

## 🛠️ Stack Technique

- **Bundler & Dev Server** : [Vite](https://vitejs.dev/) v5 (Ultra-rapide, HMR, zéro configuration superflue).
- **Architecture** : Vanilla JavaScript ES Modules (modulaire, sans framework lourd, zéro dépendance superflue).
- **Sécurité & Chiffrement** : Web Crypto API (SubtleCrypto) avec dérivation PBKDF2 (10 000 itérations) et déchiffrement AES-256-GCM Zero-Knowledge identique à Workout Home.
- **Backends connectés** :
  - Supabase REST API (`plrqzuwbnuryxtsmimyt.supabase.co`)
  - Firebase Realtime Database (`workout-homefb17-default-rtdb.europe-west1.firebasedatabase.app`)
- **PWA & Offline** : Service Worker (`sw.js`) avec stratégie de mise en cache locale et manifeste PWA standard (`manifest.webmanifest`).

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
Les fichiers statiques finaux sont générés dans le dossier `/dist`, prêts à être déployés sur Cloudflare Pages, Vercel ou Firebase Hosting.
