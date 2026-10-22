/**
 * Executive Cockpit View - Health & Vitality Hub
 * Tableau de bord de pilotage exécutif qui lit passivement les données et performances
 * des 3 applications mères, évalue l'accomplissement des objectifs et résume les flux.
 */

import { healthAggregator } from '../../core/healthAggregator.js';
import { ICONS } from '../../ui/icons.js';

export class CockpitView {
  constructor(container, navigateToTab) {
    this.container = container;
    this.navigateToTab = navigateToTab;
    this.unsubscribeAggregator = null;
    this.timerInterval = null;
    this.data = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="cockpit-loading-state">
        <div class="loading-spinner"></div>
        <p>Lecture des flux mères Supabase, Firebase & Jeûne 18/6...</p>
      </div>
    `;

    // S'abonner aux données de l'agrégateur
    this.unsubscribeAggregator = healthAggregator.subscribe((data) => {
      this.data = data;
      this.render();
    });

    // Déclencher un rafraîchissement immédiat
    healthAggregator.refresh().catch(err => {
      console.warn('[Cockpit] Refresh error:', err);
    });

    // Horloge temps réel (actualise les timers de jeûne chaque seconde)
    this.timerInterval = setInterval(() => {
      this.updateFastingLiveClock();
    }, 1000);
  }

  unmount() {
    if (this.unsubscribeAggregator) {
      this.unsubscribeAggregator();
      this.unsubscribeAggregator = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateFastingLiveClock() {
    const clockEl = document.getElementById('cockpitFastingTimer');
    const remainingEl = document.getElementById('cockpitFastingRemaining');
    if (!clockEl || !this.data) return;

    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    const curS = now.getSeconds();

    let isFasting = (curH >= 15 || curH < 9);
    let target = new Date(now);

    if (isFasting) {
      if (curH >= 15) {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(9, 0, 0, 0);
    } else {
      target.setHours(15, 0, 0, 0);
    }

    const diffMs = Math.max(0, target - now);
    const diffSec = Math.floor(diffMs / 1000);
    const rh = String(Math.floor(diffSec / 3600)).padStart(2, '0');
    const rm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
    const rs = String(diffSec % 60).padStart(2, '0');

    if (remainingEl) {
      remainingEl.textContent = `${rh}:${rm}:${rs}`;
    }
  }

  render() {
    if (!this.data) return;

    const { profile, sources, dailyObjectives, crossAnalytics, refreshedAt, displayName } = this.data;
    const { glucoCarb, workoutHome, fastMaster } = sources;

    const pct = dailyObjectives.globalPercent;
    const count = dailyObjectives.accomplishedCount;
    const total = dailyObjectives.totalObjectives;

    this.container.innerHTML = `
      <!-- EN-TÊTE COCKPIT EXÉCUTIF -->
      <div class="cockpit-header">
        <div class="cockpit-title-group">
          <div class="backend-badges-row">
            <span class="source-status-pill ${glucoCarb.connected ? 'pill-online' : 'pill-offline'}" title="Backend Gluco-Carb Maroc">
              <span class="pulse-dot"></span> Supabase : ${glucoCarb.connected ? 'Connecté' : 'Erreur'}
            </span>
            <span class="source-status-pill ${workoutHome.connected ? 'pill-online' : 'pill-offline'}" title="Backend Workout Home Chiffré">
              <span class="pulse-dot"></span> Firebase RTDB : ${workoutHome.connected ? 'Déchiffré' : 'Hors-ligne'}
            </span>
            <span class="source-status-pill pill-fasting" title="Protocole Fast Master">
              ⚡ Jeûne 18/6
            </span>
          </div>

          <h1 class="cockpit-main-title">Cockpit Santé &amp; Vitalité</h1>
          <p class="cockpit-subtitle">
            Profil actif : <strong>${displayName || 'Hicham'}</strong> (${profile.weight} kg, ${profile.height} cm)
          </p>
        </div>

        <button id="btnManualRefresh" class="btn-cockpit-refresh" title="Actualiser la lecture des 3 backends mères">
          <svg class="refresh-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
          </svg>
          <span class="refresh-label">Actualiser</span>
        </button>
      </div>

      <!-- CARTE HÉRO : OBJECTIFS JOURNALIERS & SCORE D'ACCOMPLISSEMENT -->
      <div class="executive-summary-card">
        <div class="summary-top">
          <div class="summary-meta">
            <span class="summary-kicker">🎯 BILAN QUOTIDIEN CROISÉ</span>
            <h2 class="summary-score-title">
              ${count} / ${total} <span class="score-label">Objectifs Accomplis</span>
            </h2>
            <p class="summary-verdict">
              ${count === 3 ? '🎉 Félicitations ! Les 3 piliers métaboliques du jour sont 100% accomplis.' : (count >= 1 ? 'En bonne voie : maintenez le cap pour compléter le dernier pilier.' : 'Démarrez votre journée pour valider vos objectifs.')}
            </p>
          </div>

          <div class="summary-gauge-box">
            <div class="gauge-circle-wrap">
              <svg class="gauge-svg" viewBox="0 0 36 36">
                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="circle-progress" stroke-dasharray="${pct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <div class="gauge-center-text">
                <span class="gauge-value">${pct}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LISTE SYNTHÉTIQUE DES 3 OBJECTIFS -->
        <div class="summary-objectives-checklist">
          ${dailyObjectives.items.map(item => `
            <div class="obj-check-pill ${item.isAccomplished ? 'pill-done' : 'pill-pending'}">
              <span class="obj-icon">${item.icon}</span>
              <div class="obj-info">
                <span class="obj-name">${item.title}</span>
                <span class="obj-sub">${item.current}</span>
              </div>
              <span class="obj-badge ${item.isAccomplished ? 'badge-success' : 'badge-warning'}">
                ${item.isAccomplished ? 'Accompli ✓' : 'En attente ⏳'}
              </span>
            </div>
          `).join('')}
        </div>

        <div class="summary-footer-action">
          <button class="btn-summary-link" data-nav="objectifs">
            Voir le détail complet des 3 objectifs & critères →
          </button>
        </div>
      </div>

      <!-- INSIGHT CROISÉ METABOLIQUE DU MOMENT -->
      <div class="cross-insight-banner">
        <div class="insight-icon-box">🧠</div>
        <div class="insight-text-box">
          <span class="insight-tag">SYNTHÈSE CROISÉE DU MOMENT</span>
          <p class="insight-message">${crossAnalytics.smartVerdict}</p>
          <div class="insight-micro-details">
            <span>⏱️ Timing Repas : <strong>${crossAnalytics.mealTimingChecks[0]?.verdict || 'Repas dans la fenêtre autorisée (09h-15h)'}</strong></span>
            <span>💪 Synergie Anabolique : <strong>${crossAnalytics.anabolismIndex}</strong></span>
          </div>
        </div>
      </div>

      <!-- LES 3 FLUX EN DIRECT (LECTURE DES 3 APPLICATIONS MÈRES) -->
      <div class="streams-section-title">
        <h3>Flux Relevés en Direct des 3 Applications Mères</h3>
        <span class="streams-sync-time">Synchronisé à ${refreshedAt}</span>
      </div>

      <div class="live-streams-grid">

        <!-- FLUX 1 : FAST MASTER (JEÛNE 18/6) -->
        <div class="stream-card stream-fasting" data-nav="fasting">
          <div class="stream-card-header">
            <div class="stream-id-wrap">
              <span class="stream-badge-icon icon-bg-fasting">⚡</span>
              <div>
                <h4 class="stream-app-name">Fast Master</h4>
                <span class="stream-protocol">Protocole 18:6 (15h00 - 09h00)</span>
              </div>
            </div>
            <span class="phase-tag ${fastMaster.phase === 'fasting' ? 'tag-done' : 'tag-eating'}">
              ${fastMaster.phase === 'fasting' ? 'Chrono Actif (Accompli ✓)' : 'Fenêtre Repas'}
            </span>
          </div>

          <div class="stream-card-body">
            <div class="timer-digits-row">
              <span id="cockpitFastingTimer" class="live-digits">${fastMaster.elapsedFormatted}</span>
              <span class="digits-label">${fastMaster.phase === 'fasting' ? 'écoulées de jeûne' : 'de fenêtre active'}</span>
            </div>

            <div class="progress-track-sm">
              <div class="progress-bar-fill bar-orange" style="width: ${fastMaster.progressPercent}%;"></div>
            </div>

            <div class="stream-stat-line">
              <span>Bascule dans : <strong id="cockpitFastingRemaining">${fastMaster.remainingFormatted}</strong></span>
              <span>Étape : <strong>${fastMaster.currentStage?.name || 'Métabolisme'}</strong></span>
            </div>
          </div>
        </div>

        <!-- FLUX 2 : GLUCO-CARB MAROC (SUPABASE) -->
        <div class="stream-card stream-nutrition" data-nav="nutrition">
          <div class="stream-card-header">
            <div class="stream-id-wrap">
              <span class="stream-badge-icon icon-bg-nutrition">🥗</span>
              <div>
                <h4 class="stream-app-name">Gluco-Carb Maroc</h4>
                <span class="stream-protocol">Base Supabase Cloud REST</span>
              </div>
            </div>
            <span class="phase-tag tag-meals">
              ${glucoCarb.mealsCountToday} repas saisi(s)
            </span>
          </div>

          <div class="stream-card-body">
            <div class="carbs-highlight-row">
              <div class="big-carbs-val">
                ${glucoCarb.todayNetCarbs} <span class="val-unit">g</span>
              </div>
              <div class="carbs-quota-info">
                <span>Glucides nets du jour</span>
                <span class="quota-badge ${glucoCarb.todayNetCarbs <= profile.targetCarbs ? 'badge-good' : 'badge-alert'}">
                  Plafond : ${profile.targetCarbs}g (${Math.round((glucoCarb.todayNetCarbs / profile.targetCarbs) * 100)}%)
                </span>
              </div>
            </div>

            <div class="macro-chips-row">
              <span class="macro-chip">🍗 Protéines : <strong>${glucoCarb.todayProtein}g</strong> / ${profile.targetProtein}g</span>
              <span class="macro-chip">📈 Charge Glycémique : <strong>${glucoCarb.todayGL}</strong></span>
            </div>

            ${glucoCarb.todayMeals.length > 0 ? `
              <div class="latest-meal-box">
                <span class="meal-time-tag">Dernier repas : ${glucoCarb.todayMeals[0].timeFormatted || '10:29'}</span>
                <p class="meal-desc-text">
                  ${glucoCarb.todayMeals[0].items ? glucoCarb.todayMeals[0].items.map(i => i.name).join(', ') : glucoCarb.todayMeals[0].title}
                </p>
              </div>
            ` : `
              <div class="latest-meal-box empty">
                <span>Aucun repas saisi aujourd'hui dans Gluco-Carb Maroc</span>
              </div>
            `}
          </div>
        </div>

        <!-- FLUX 3 : WORKOUT HOME (FIREBASE RTDB) -->
        <div class="stream-card stream-workout" data-nav="workout">
          <div class="stream-card-header">
            <div class="stream-id-wrap">
              <span class="stream-badge-icon icon-bg-workout">🏋️</span>
              <div>
                <h4 class="stream-app-name">Workout Home</h4>
                <span class="stream-protocol">Firebase RTDB (AES-256)</span>
              </div>
            </div>
            <span class="phase-tag ${workoutHome.workoutsCountToday > 0 ? 'tag-done' : 'tag-pending'}">
              ${workoutHome.workoutsCountToday > 0 ? 'Séance Validée ✓' : 'À Faire Aujourd\'hui'}
            </span>
          </div>

          <div class="stream-card-body">
            <div class="workout-counter-row">
              <div class="big-workout-val">
                ${workoutHome.totalWorkouts} <span class="val-unit">séances</span>
              </div>
              <div class="workout-info-col">
                <span>Historique total enregistré</span>
                <span class="w-streak-pill">🔥 Série : ${workoutHome.streak} jour(s)</span>
              </div>
            </div>

            <div class="latest-workout-details">
              ${workoutHome.latestWorkout ? `
                <div class="lw-row">
                  <span>Dernière session : <strong>${workoutHome.latestWorkout.date || 'Récente'}</strong></span>
                  <span>Rounds : <strong>${workoutHome.latestWorkout.rounds || 3}</strong></span>
                </div>
                <div class="lw-row">
                  <span>Durée : <strong>${Math.round((workoutHome.latestWorkout.durationSeconds || 1200) / 60)} min</strong></span>
                  <span>Calories : <strong>${workoutHome.latestWorkout.caloriesEstimated || 202} kcal</strong></span>
                </div>
              ` : `
                <span>Aucune séance enregistrée dans Firebase</span>
              `}
            </div>
          </div>
        </div>

      </div>

      <!-- BOUTONS DE NAVIGATION BAS DE PAGE -->
      <div class="cockpit-shortcuts-grid">
        <button class="cockpit-shortcut-btn" data-nav="objectifs">
          <span class="shortcut-icon">🎯</span>
          <div class="shortcut-text">
            <strong>Objectifs Journaliers</strong>
            <span>Vérifier le statut d'accomplissement des 3 piliers</span>
          </div>
          <span class="shortcut-arrow">→</span>
        </button>

        <button class="cockpit-shortcut-btn" data-nav="history">
          <span class="shortcut-icon">📈</span>
          <div class="shortcut-text">
            <strong>Historique des 3 Apps (Courbes &amp; Diaporama)</strong>
            <span>Visualiser l'évolution des repas, séances et jeûnes</span>
          </div>
          <span class="shortcut-arrow">→</span>
        </button>

        <button class="cockpit-shortcut-btn" data-nav="cross">
          <span class="shortcut-icon">📊</span>
          <div class="shortcut-text">
            <strong>Analyse Croisée</strong>
            <span>Corrélations jeûne 18/6 vs repas et anabolisme</span>
          </div>
          <span class="shortcut-arrow">→</span>
        </button>

        <button class="cockpit-shortcut-btn" data-nav="sources">
          <span class="shortcut-icon">🔗</span>
          <div class="shortcut-text">
            <strong>Sources &amp; Backends</strong>
            <span>Inspecter les flux bruts Supabase & Firebase</span>
          </div>
          <span class="shortcut-arrow">→</span>
        </button>
      </div>
    `;

    // Attacher les écouteurs d'événements
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Bouton de rafraîchissement manuel
    const btnRefresh = document.getElementById('btnManualRefresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('spinning');
        try {
          await healthAggregator.refresh();
        } finally {
          setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
        }
      });
    }

    // Liens de navigation interne
    const navButtons = this.container.querySelectorAll('[data-nav]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-nav');
        if (target && typeof this.navigateToTab === 'function') {
          this.navigateToTab(target);
        }
      });
    });
  }
}
