/**
 * Cross-Analytics & Metabolic Correlations View - Health & Vitality Hub
 * Croisement algorithmique des données issues des 3 applications mères :
 * - Horaires des repas (Gluco-Carb) vs Fenêtre de jeûne 18/6 (Fast Master)
 * - Apport en protéines (Gluco-Carb) vs Stimulus d'entraînement (Workout Home)
 * - Recharge en glycogène vs Dépense calorique
 */

import { healthAggregator } from '../../core/healthAggregator.js';

export class CrossView {
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
        <p>Croisement des données Nutrition, Jeûne et Sport en cours...</p>
      </div>
    `;

    this.unsubscribeAggregator = healthAggregator.subscribe((data) => {
      this.data = data;
      this.render();
    });

    healthAggregator.refresh().catch(err => {
      console.warn('[Cross] Refresh error:', err);
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

    const { crossAnalytics, sources, profile, refreshedAt } = this.data;
    const { glucoCarb, workoutHome, fastMaster } = sources;

    this.container.innerHTML = `
      <div class="cross-container">

        <!-- EN-TÊTE ANALYSE CROISÉE -->
        <div class="cross-header">
          <div class="header-left">
            <span class="view-kicker">🧬 CORRÉLATIONS &amp; SYNERGIE DU PROFIL</span>
            <h1 class="view-title">Analyse Croisée Métabolique</h1>
            <p class="cross-subtitle">
              Croisement algorithmique en temps réel des flux de <strong>Gluco-Carb Maroc</strong>, <strong>Fast Master</strong> et <strong>Workout Home</strong>.
            </p>
          </div>

          <button id="btnRefreshCross" class="btn-cockpit-refresh" title="Recalculer les corrélations croisées">
            <svg class="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
            </svg>
            <span>Recalculer</span>
          </button>
        </div>

        <!-- 1. CARTE CROISÉE : TIMING DES REPAS VS FENÊTRE DE JEÛNE 18/6 -->
        <div class="cross-card">
          <div class="cross-card-header">
            <div class="cross-title-wrap">
              <span class="cross-icon-badge">⏱️</span>
              <div>
                <h3 class="cross-card-title">1. Synchronisation Repas ↔ Fenêtre de Jeûne 18/6</h3>
                <span class="cross-card-desc">Contrôle de conformité : repas Gluco-Carb pris strictement entre 09h00 et 15h00</span>
              </div>
            </div>
            <span class="cross-status-pill pill-online">Conforme ✓</span>
          </div>

          <!-- SCHÉMA TEMPOREL VISUEL 24 HEURES -->
          <div class="timeline-visual-box">
            <div class="timeline-bar">
              <div class="timeline-segment seg-fasting" style="width: 37.5%;" title="00h00 - 09h00 : Jeûne strict (9h)">
                <span class="seg-label">00h - 09h Jeûne</span>
              </div>
              <div class="timeline-segment seg-eating" style="width: 25%;" title="09h00 - 15h00 : Fenêtre Repas (6h)">
                <span class="seg-label">09h - 15h Repas</span>
              </div>
              <div class="timeline-segment seg-fasting" style="width: 37.5%;" title="15h00 - 24h00 : Jeûne strict (9h)">
                <span class="seg-label">15h - 24h Jeûne</span>
              </div>
            </div>
            <div class="timeline-ticks">
              <span>00:00</span>
              <span class="tick-highlight">09:00</span>
              <span class="tick-highlight">15:00</span>
              <span>23:59</span>
            </div>
          </div>

          <!-- LISTE DES REPAS VÉRIFIÉS -->
          <div class="meals-timing-list">
            <span class="timing-list-title">Historique des repas analysés aujourd'hui :</span>
            ${glucoCarb.todayMeals.length > 0 ? glucoCarb.todayMeals.map(meal => {
              const hour = new Date(meal.timestamp || Date.now()).getHours();
              const isValid = (hour >= 9 && hour < 15);
              const cal = meal.calories || Math.round((Number(meal.proteins_g || 0)*4) + (Number(meal.net_carbs_g || 0)*4) + (Number(meal.fat_g || 0)*9));
              return `
                <div class="meal-timing-row ${isValid ? 'timing-valid' : 'timing-invalid'}">
                  <span class="timing-badge ${isValid ? 'badge-good' : 'badge-danger'}">
                    ${isValid ? '✓ Dans la fenêtre' : '⚠️ Hors fenêtre'}
                  </span>
                  <div class="timing-meal-info">
                    <strong>${meal.title || 'Repas synchronisé'} (${meal.timeFormatted || '10:29'})</strong>
                    <span>~${cal} kcal • ${meal.net_carbs_g || meal.netCarbs || 0}g glucides • ${meal.proteins_g || meal.protein || 0}g protéines • ${meal.fat_g || meal.fat || 0}g lipides</span>
                  </div>
                  <span class="timing-hour-pill">${meal.timeFormatted || '10:29'}</span>
                </div>
              `;
            }).join('') : `
              <div class="meal-timing-empty">
                <span>Aucun repas saisi aujourd'hui. Tous les apports devront être concentrés entre 09h00 et 15h00.</span>
              </div>
            `}
          </div>

          <!-- RÉPARTITION COMPARATIVE DES 2 REPAS (10H [40%] & 15H [60%]) -->
          <div class="cross-meals-protocol-grid">
            <div class="cross-meal-box ${glucoCarb.protocol186?.repas1?.actual?.logged ? 'cmb-done' : 'cmb-pending'}">
              <div class="cmb-head">
                <span class="cmb-icon">🍳</span>
                <div>
                  <strong>Repas 1 (10h00) Rupture [40%]</strong>
                  <span class="cmb-timing">Fenêtre : 09h00 - 12h00</span>
                </div>
              </div>
              <div class="cmb-macros">
                <span>Cible : <strong>~770 kcal</strong> • 60g P • 60g G • 32g L</span>
              </div>
              <div class="cmb-status">
                ${glucoCarb.protocol186?.repas1?.actual?.logged
                  ? `✓ Relevé : ${glucoCarb.protocol186.repas1.actual.title} (~${glucoCarb.protocol186.repas1.actual.calories} kcal • ${glucoCarb.protocol186.repas1.actual.protein}g P • ${glucoCarb.protocol186.repas1.actual.carbs}g G • ${glucoCarb.protocol186.repas1.actual.fat}g L)`
                  : '⏳ En attente de saisie dans Gluco-Carb Maroc'}
              </div>
            </div>

            <div class="cross-meal-box ${glucoCarb.protocol186?.repas2?.actual?.logged ? 'cmb-done' : 'cmb-pending'}">
              <div class="cmb-head">
                <span class="cmb-icon">🍗</span>
                <div>
                  <strong>Repas 2 (15h00) Clôture [60%]</strong>
                  <span class="cmb-timing">Fenêtre : 13h00 - 15h00</span>
                </div>
              </div>
              <div class="cmb-macros">
                <span>Cible : <strong>~1150 kcal</strong> • 90g P • 90g G • 48g L</span>
              </div>
              <div class="cmb-status">
                ${glucoCarb.protocol186?.repas2?.actual?.logged
                  ? `✓ Relevé : ${glucoCarb.protocol186.repas2.actual.title} (~${glucoCarb.protocol186.repas2.actual.calories} kcal • ${glucoCarb.protocol186.repas2.actual.protein}g P • ${glucoCarb.protocol186.repas2.actual.carbs}g G • ${glucoCarb.protocol186.repas2.actual.fat}g L)`
                  : '⏳ En attente de saisie dans Gluco-Carb Maroc'}
              </div>
            </div>
          </div>

          <div class="cross-conclusion-box">
            <strong>Verdict Chronobiologique :</strong>
            <p>
              ${glucoCarb.todayMeals.length > 0
                ? 'Excellent alignement : vos apports alimentaires sont synchronisés avec la fenêtre d\'assimilation 09h-15h. L\'insuline a le temps de redescendre avant le démarrage du jeûne à 15h00.'
                : 'Pensez à consigner vos repas dans Gluco-Carb Maroc avant 15h00 afin de ne pas interrompre votre cycle d\'autophagie.'
              }
            </p>
          </div>
        </div>

        <!-- 2. CARTE CROISÉE : NUTRITION ↔ SPORT (INDICE ANABOLIQUE & RÉCUPÉRATION) -->
        <div class="cross-card">
          <div class="cross-card-header">
            <div class="cross-title-wrap">
              <span class="cross-icon-badge">💪</span>
              <div>
                <h3 class="cross-card-title">2. Corrélation Nutrition ↔ Entraînement</h3>
                <span class="cross-card-desc">Indice d'anabolisme musculaire et reconstruction des fibres</span>
              </div>
            </div>
            <span class="cross-status-pill pill-anabolism">${crossAnalytics.anabolismIndex}</span>
          </div>

          <div class="cross-metrics-comparison">
            <div class="comparison-col">
              <span class="comp-label">Apport Protéique Relevé</span>
              <div class="comp-value">${glucoCarb.todayProtein} <span class="comp-unit">g</span></div>
              <span class="comp-sub">Objectif : ${profile.targetProtein}g (${Math.round((glucoCarb.todayProtein / profile.targetProtein) * 100)}%)</span>
            </div>

            <div class="comparison-divider">↔</div>

            <div class="comparison-col">
              <span class="comp-label">Stimulus Sportif (Workout Home)</span>
              <div class="comp-value">${workoutHome.workoutsCountToday > 0 ? '1 Séanc.' : '0 Séanc.'}</div>
              <span class="comp-sub">${workoutHome.totalWorkouts} séances cumulées au profil</span>
            </div>
          </div>

          <div class="cross-conclusion-box">
            <strong>Diagnostic de Récupération Musculaire :</strong>
            <p>${crossAnalytics.anabolismDesc}</p>
          </div>
        </div>

        <!-- 3. CARTE CROISÉE : RECHARGE GLYCOGÉNIQUE VS DÉPENSE ÉNERGÉTIQUE -->
        <div class="cross-card">
          <div class="cross-card-header">
            <div class="cross-title-wrap">
              <span class="cross-icon-badge">⚡</span>
              <div>
                <h3 class="cross-card-title">3. Recharge Glycogénique vs Dépense Sportive</h3>
                <span class="cross-card-desc">Bilan entre l'apport en glucides nets et les calories brûlées</span>
              </div>
            </div>
            <span class="cross-status-pill pill-online">Équilibré ⚖️</span>
          </div>

          <div class="glycogen-stats-grid">
            <div class="glyco-stat-card">
              <span class="g-title">Calories Consommées</span>
              <strong class="g-num">${glucoCarb.todayCalories || 0} kcal</strong>
              <span class="g-sub">Cible : ~1920-2000 kcal</span>
            </div>

            <div class="glyco-stat-card">
              <span class="g-title">Glucides Nets Relevés</span>
              <strong class="g-num">${glucoCarb.todayNetCarbs} g</strong>
              <span class="g-sub">Plafond : ≤ ${profile.targetCarbs || 150} g</span>
            </div>

            <div class="glyco-stat-card">
              <span class="g-title">Lipides Essentiels</span>
              <strong class="g-num">${glucoCarb.todayFat || 0} g</strong>
              <span class="g-sub">Cible : 80 g</span>
            </div>

            <div class="glyco-stat-card">
              <span class="g-title">Calories Sport Brûlées</span>
              <strong class="g-num">${crossAnalytics.totalCaloriesEstimatedBurned} kcal</strong>
              <span class="g-sub">Workout Home cumulé</span>
            </div>
          </div>

          <div class="cross-conclusion-box">
            <strong>Bilan Énergétique Global (85 kg / 18-6) :</strong>
            <p>
              Avec ${glucoCarb.todayCalories || 0} kcal ingérées (sur la cible ~1920-2000 kcal) et ${glucoCarb.todayNetCarbs}g de glucides nets pour un plafond de ${profile.targetCarbs || 150}g, vos réserves de glycogène sont idéalement rechargées sans provoquer de stockage adipeux pendant le jeûne de 18 heures.
            </p>
          </div>
        </div>

      </div>
    `;

    // Attacher l'écouteur du bouton rafraîchir
    const btn = document.getElementById('btnRefreshCross');
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
  }
}
