/**
 * Sources & Mother Backends View - Health & Vitality Hub
 * Console technique de transparence affichant la lecture directe des flux
 * depuis Supabase (Gluco-Carb Maroc), Firebase RTDB AES-256 (Workout Home)
 * et le moteur Fast Master (18/6).
 */

import { healthAggregator } from '../../core/healthAggregator.js';

export class SourcesView {
  constructor(container, navigateToTab) {
    this.container = container;
    this.navigateToTab = navigateToTab;
    this.unsubscribeAggregator = null;
    this.data = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="cockpit-loading-state">
        <div class="loading-spinner"></div>
        <p>Interrogation directe des serveurs Supabase & Firebase...</p>
      </div>
    `;

    this.unsubscribeAggregator = healthAggregator.subscribe((data) => {
      this.data = data;
      this.render();
    });

    healthAggregator.refresh().catch(err => {
      console.warn('[Sources] Refresh error:', err);
    });
  }

  unmount() {
    if (this.unsubscribeAggregator) {
      this.unsubscribeAggregator();
      this.unsubscribeAggregator = null;
    }
  }

  render() {
    if (!this.data) return;

    const { sources, profile, refreshedAt, username } = this.data;
    const { glucoCarb, workoutHome, fastMaster } = sources;

    this.container.innerHTML = `
      <div class="sources-container">

        <!-- EN-TÊTE SOURCES -->
        <div class="sources-header">
          <div class="header-left">
            <span class="view-kicker">📡 PASSERELLES &amp; TRANSPARENCE TECHNIQUE</span>
            <h1 class="view-title">Sources &amp; Backends Mères</h1>
            <p class="sources-subtitle">
              Lecture passive des données du profil partagé (<strong>${username}</strong>) à travers les backends d'origine.
            </p>
          </div>

          <button id="btnRefreshSources" class="btn-cockpit-refresh" title="Relire immédiatement les 3 sources mères">
            <svg class="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
            </svg>
            <span>Interroger</span>
          </button>
        </div>

        <!-- SOURCE 1 : GLUCO-CARB MAROC (SUPABASE REST) -->
        <div class="source-inspect-card">
          <div class="source-card-head">
            <div class="source-info-col">
              <div class="source-title-row">
                <span class="src-icon">🥗</span>
                <h3 class="src-name">Gluco-Carb Maroc — Supabase Cloud REST</h3>
              </div>
              <span class="src-url">https://${glucoCarb.url}/rest/v1/app_accounts</span>
            </div>
            <span class="src-status-pill ${glucoCarb.connected ? 'pill-online' : 'pill-offline'}">
              ${glucoCarb.connected ? 'Actif & Synchronisé 🟢' : `Erreur Connexion 🔴 ${glucoCarb.error ? `(${glucoCarb.error})` : ''}`}
            </span>
          </div>

          <div class="source-card-body">
            ${!glucoCarb.connected && glucoCarb.error ? `
              <div class="source-error-banner" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; color: #fca5a5; font-size: 0.85rem;">
                ⚠️ <strong>Diagnostic Supabase :</strong> ${glucoCarb.error}
              </div>
            ` : ''}
            <div class="src-stats-grid">
              <div class="src-stat-cell">
                <span class="cell-label">Compte Utilisateur</span>
                <strong class="cell-val">${username}</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Cible Glucides</span>
                <strong class="cell-val">${profile.targetCarbs} g / jour</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Cible Protéines</span>
                <strong class="cell-val">${profile.targetProtein} g / jour</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Repas Détectés Aujourd'hui</span>
                <strong class="cell-val">${glucoCarb.mealsCountToday} (${glucoCarb.todayNetCarbs}g glucides)</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Total Repas Historiques</span>
                <strong class="cell-val">${glucoCarb.totalMealsCount} repas stockés</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Dernière Synchronisation</span>
                <strong class="cell-val">${refreshedAt}</strong>
              </div>
            </div>

            <!-- DÉPLIANT JSON DU DERNIER REPAS -->
            <details class="json-payload-details">
              <summary class="json-summary-toggle">Inspecter le payload JSON Supabase (Dernier repas)</summary>
              <pre class="json-raw-block">${glucoCarb.todayMeals.length > 0 ? JSON.stringify(glucoCarb.todayMeals[0], null, 2) : 'Aucun repas aujourd\'hui'}</pre>
            </details>
          </div>
        </div>

        <!-- SOURCE 2 : WORKOUT HOME (FIREBASE RTDB CHIFFRÉ) -->
        <div class="source-inspect-card">
          <div class="source-card-head">
            <div class="source-info-col">
              <div class="source-title-row">
                <span class="src-icon">🏋️</span>
                <h3 class="src-name">Workout Home — Firebase Realtime Database (AES-256)</h3>
              </div>
              <span class="src-url">https://${workoutHome.url}/workout_profiles/</span>
            </div>
            <span class="src-status-pill ${workoutHome.connected ? 'pill-online' : 'pill-offline'}">
              ${workoutHome.connected ? 'Déchiffré AES-256 🟢' : `Chiffré / Non synchronisé 🔴 ${workoutHome.error ? `(${workoutHome.error})` : ''}`}
            </span>
          </div>

          <div class="source-card-body">
            ${!workoutHome.connected && workoutHome.error ? `
              <div class="source-error-banner" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; color: #fca5a5; font-size: 0.85rem;">
                ⚠️ <strong>Diagnostic Firebase :</strong> ${workoutHome.error}
              </div>
            ` : ''}
            <div class="src-stats-grid">
              <div class="src-stat-cell">
                <span class="cell-label">Identifiant Dérivé SHA-256</span>
                <strong class="cell-val hash-truncate">u_4e64dba2ac0a509f...</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Chiffrement Client-Side</span>
                <strong class="cell-val">AES-GCM (PBKDF2 10k iter)</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Séances Totales Validées</span>
                <strong class="cell-val">${workoutHome.totalWorkouts} séances au profil</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Séances Validées Aujourd'hui</span>
                <strong class="cell-val">${workoutHome.workoutsCountToday > 0 ? '1 séance (Validée ✓)' : '0 séance (En attente)'}</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Série d'Assiduité</span>
                <strong class="cell-val">${workoutHome.streak} jour(s) consécutif(s)</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Niveau Sportif</span>
                <strong class="cell-val">${profile.workoutLevel || 'intermediate'}</strong>
              </div>
            </div>

            <!-- DÉPLIANT JSON DE LA DERNIÈRE SÉANCE DÉCHIFFRÉE -->
            <details class="json-payload-details">
              <summary class="json-summary-toggle">Inspecter le payload déchiffré Firebase (Dernière séance)</summary>
              <pre class="json-raw-block">${workoutHome.latestWorkout ? JSON.stringify(workoutHome.latestWorkout, null, 2) : 'Aucune séance'}</pre>
            </details>
          </div>
        </div>

        <!-- SOURCE 3 : FAST MASTER (MOTEUR 18/6 AUTO-SCHEDULE) -->
        <div class="source-inspect-card">
          <div class="source-card-head">
            <div class="source-info-col">
              <div class="source-title-row">
                <span class="src-icon">⚡</span>
                <h3 class="src-name">Fast Master — Moteur Protocole 18/6</h3>
              </div>
              <span class="src-url">Planification Automatique : 15h00 à 09h00</span>
            </div>
            <span class="src-status-pill pill-online">Cycle Actif 🟢</span>
          </div>

          <div class="source-card-body">
            <div class="src-stats-grid">
              <div class="src-stat-cell">
                <span class="cell-label">Protocole Configuré</span>
                <strong class="cell-val">18:6 (18h jeûne / 6h repas)</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Heure Début Jeûne</span>
                <strong class="cell-val">15h00 (Automatique)</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Heure Fin Jeûne</span>
                <strong class="cell-val">09h00 le lendemain</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Phase en Cours</span>
                <strong class="cell-val">${fastMaster.phase === 'fasting' ? 'Jeûne strict en cours' : 'Fenêtre de repas active'}</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Temps Écoulé</span>
                <strong class="cell-val">${fastMaster.elapsedFormatted}</strong>
              </div>
              <div class="src-stat-cell">
                <span class="cell-label">Temps Restant</span>
                <strong class="cell-val">${fastMaster.remainingFormatted}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- GESTIONNAIRE DU PROFIL DE LECTURE -->
        <div class="profile-config-card">
          <div class="cfg-head">
            <span class="cfg-icon">⚙️</span>
            <div>
              <h3 class="cfg-title">Paramètres du Profil Utilisateur Ciblé</h3>
              <p class="cfg-desc">Modifier les identifiants pour interroger un autre profil sur les 3 backends mères :</p>
            </div>
          </div>

          <form id="profileTargetForm" class="cfg-form">
            <div class="cfg-row">
              <div class="cfg-field">
                <label>Pseudo Cloud (Supabase & Firebase) :</label>
                <input type="text" id="targetUsername" value="${username}" required />
              </div>
              <div class="cfg-field">
                <label>Clé / Mot de passe de déchiffrement :</label>
                <input type="password" id="targetPassword" value="1234" required />
              </div>
            </div>
            <button type="submit" class="btn-primary btn-sm mt-3">
              Appliquer &amp; Synchroniser les 3 flux
            </button>
            <span id="targetSuccessMsg" class="target-success-msg"></span>
          </form>
        </div>

      </div>
    `;

    // Attacher les écouteurs
    const btn = document.getElementById('btnRefreshSources');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.classList.add('spinning');
        try {
          await healthAggregator.refresh();
        } finally {
          setTimeout(() => btn.classList.remove('spinning'), 500);
        }
      });
    }

    const form = document.getElementById('profileTargetForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('targetUsername').value.trim();
        const p = document.getElementById('targetPassword').value.trim();
        if (!u) return;

        localStorage.setItem('vitality_active_account_v1', JSON.stringify({ username: u, passwordPlain: p }));
        const msg = document.getElementById('targetSuccessMsg');
        if (msg) msg.textContent = 'Actualisation en cours...';

        await healthAggregator.fetchAllData(u, p);
        if (msg) msg.textContent = '✓ Synchronisé avec succès !';
        setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
      });
    }
  }
}
