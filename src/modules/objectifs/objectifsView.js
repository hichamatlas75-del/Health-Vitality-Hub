/**
 * Daily Objectives & Accomplishment View - Health & Vitality Hub
 * Affichage des 3 objectifs journaliers et vérification en temps réel de leur accomplissement
 * via la lecture des données des 3 applications mères (Supabase, Firebase, Fast Master).
 */

import { healthAggregator } from '../../core/healthAggregator.js';

export class ObjectifsView {
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
        <p>Vérification des objectifs journaliers auprès des backends...</p>
      </div>
    `;

    this.unsubscribeAggregator = healthAggregator.subscribe((data) => {
      this.data = data;
      this.render();
    });

    healthAggregator.refresh().catch(err => {
      console.warn('[Objectifs] Refresh error:', err);
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

    const { dailyObjectives, profile, sources, refreshedAt } = this.data;
    const { items, accomplishedCount, totalObjectives, globalPercent, isFullSuccess } = dailyObjectives;

    const todayFormatted = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.container.innerHTML = `
      <div class="objectifs-container">

        <!-- EN-TÊTE OBJECTIFS -->
        <div class="objectifs-header">
          <div class="header-left">
            <span class="view-kicker">🎯 TABLEAU DE BORD D'ACCOMPLISSEMENT</span>
            <h1 class="view-title">Objectifs du Jour</h1>
            <span class="view-date">${todayFormatted}</span>
          </div>

          <button id="btnRefreshObjectifs" class="btn-cockpit-refresh" title="Actualiser la vérification des objectifs">
            <svg class="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
            </svg>
            <span>Vérifier</span>
          </button>
        </div>

        <!-- BANNIÈRE DE STATUT GLOBAL D'ACCOMPLISSEMENT -->
        <div class="global-accomplishment-banner ${isFullSuccess ? 'banner-all-done' : 'banner-partial'}">
          <div class="banner-gauge-side">
            <div class="gauge-ring-box">
              <svg class="gauge-ring-svg" viewBox="0 0 40 40">
                <circle class="gauge-bg" cx="20" cy="20" r="16" />
                <circle class="gauge-fill" cx="20" cy="20" r="16" stroke-dasharray="${globalPercent}, 100" />
              </svg>
              <span class="gauge-inner-txt">${accomplishedCount}/${totalObjectives}</span>
            </div>
          </div>

          <div class="banner-text-side">
            <h2 class="banner-title">
              ${accomplishedCount} sur ${totalObjectives} Objectifs Validés (${globalPercent}%)
            </h2>
            <p class="banner-desc">
              ${isFullSuccess
                ? 'Mission accomplie ! Vos 3 piliers métaboliques (Jeûne, Glucides, Sport) sont respectés à 100% aujourd\'hui.'
                : (accomplishedCount === 2
                  ? 'Excellent score : 2 piliers sur 3 sont déjà accomplis. Complétez le dernier pilier pour réussir votre journée !'
                  : '1 pilier validé pour le moment. Poursuivez vos efforts pour atteindre l\'objectif complet.')
              }
            </p>
            <div class="sync-time-stamp">Dernière vérification directe : ${refreshedAt}</div>
          </div>
        </div>

        <!-- LES 3 FICHES DÉTAILLÉES DES OBJECTIFS -->
        <div class="objectives-list-stack">

          <!-- 1. OBJECTIF JEÛNE INTERMITTENT 18/6 -->
          <div class="objective-card ${items[0].isAccomplished ? 'card-accomplished' : 'card-pending'}">
            <div class="objective-card-top">
              <div class="obj-header-meta">
                <span class="obj-badge-icon">⚡</span>
                <div>
                  <span class="pillar-label">PILIER 1 : JEÛNE INTERMITTENT</span>
                  <h3 class="obj-title">Protocole 18/6 (15h00 - 09h00)</h3>
                </div>
              </div>
              <span class="accomplished-badge ${items[0].isAccomplished ? 'badge-success' : 'badge-pending'}">
                ${items[0].isAccomplished ? 'Accompli / Respecté ✓' : 'À démarrer'}
              </span>
            </div>

            <div class="objective-card-content">
              <div class="rule-box">
                <span class="rule-title">Règle d'accomplissement :</span>
                <p>18 heures de jeûne consécutives (15h00 à 09h00 le lendemain). Fenêtre de repas autorisée de 09h00 à 15h00. Aucun repas calorique en dehors.</p>
              </div>

              <div class="live-progress-section">
                <div class="progress-labels-row">
                  <span>État en direct : <strong>${items[0].current}</strong></span>
                  <span>Conformité : <strong>${items[0].percent}%</strong></span>
                </div>
                <div class="progress-track-lg">
                  <div class="progress-bar-lg bar-fasting" style="width: ${items[0].percent}%;"></div>
                </div>
                <div class="obj-details-note">${items[0].details}</div>
              </div>

              <div class="verification-proof-box">
                <span class="proof-label">Preuve de validation :</span>
                <span>Moteur 18/6 Fast Master actif. ${sources.glucoCarb.mealsCountToday} repas analysé(s) aujourd'hui, pris dans la fenêtre autorisée.</span>
              </div>
            </div>
          </div>

          <!-- 2. OBJECTIF GLUCIDES & NUTRITION -->
          <div class="objective-card ${items[1].isAccomplished ? 'card-accomplished' : 'card-pending'}">
            <div class="objective-card-top">
              <div class="obj-header-meta">
                <span class="obj-badge-icon">🥗</span>
                <div>
                  <span class="pillar-label">PILIER 2 : NUTRITION &amp; GLYCÉMIE</span>
                  <h3 class="obj-title">Glucides Nets ≤ ${profile.targetCarbs}g &amp; Protéines ≥ ${profile.targetProtein}g</h3>
                </div>
              </div>
              <span class="accomplished-badge ${items[1].isAccomplished ? 'badge-success' : 'badge-danger'}">
                ${items[1].isAccomplished ? 'Accompli (Sous le plafond) ✓' : 'Plafond Dépassé ⚠️'}
              </span>
            </div>

            <div class="objective-card-content">
              <div class="rule-box">
                <span class="rule-title">Règle d'accomplissement :</span>
                <p>Ne pas dépasser le plafond de ${profile.targetCarbs}g de glucides nets sur la journée pour préserver la sensibilité à l'insuline, tout en visant ${profile.targetProtein}g de protéines pour le maintien musculaire.</p>
              </div>

              <div class="live-progress-section">
                <div class="progress-labels-row">
                  <span>Consommé aujourd'hui : <strong>${sources.glucoCarb.todayNetCarbs}g</strong> / ${profile.targetCarbs}g</span>
                  <span>Consommation : <strong>${Math.round((sources.glucoCarb.todayNetCarbs / profile.targetCarbs) * 100)}%</strong></span>
                </div>
                <div class="progress-track-lg">
                  <div class="progress-bar-lg ${sources.glucoCarb.todayNetCarbs <= profile.targetCarbs ? 'bar-nutrition' : 'bar-danger'}" style="width: ${Math.min(100, Math.round((sources.glucoCarb.todayNetCarbs / profile.targetCarbs) * 100))}%;"></div>
                </div>
                <div class="obj-details-note">
                  ${sources.glucoCarb.todayNetCarbs <= profile.targetCarbs
                    ? `Il vous reste encore <strong>${Math.round(profile.targetCarbs - sources.glucoCarb.todayNetCarbs)}g</strong> de marge glucidique pour aujourd'hui.`
                    : `Dépassement de <strong>${Math.round(sources.glucoCarb.todayNetCarbs - profile.targetCarbs)}g</strong>.`
                  }
                  Protéines absorbées : <strong>${sources.glucoCarb.todayProtein}g</strong> / ${profile.targetProtein}g.
                </div>
              </div>

              <div class="verification-proof-box">
                <span class="proof-label">Preuve de validation :</span>
                <span>Lu depuis Supabase (table app_accounts) : ${sources.glucoCarb.mealsCountToday} repas synchronisé(s) le ${todayFormatted}. Charge glycémique totale : ${sources.glucoCarb.todayGL}.</span>
              </div>
            </div>
          </div>

          <!-- 3. OBJECTIF SPORT & ENTRAÎNEMENT -->
          <div class="objective-card ${items[2].isAccomplished ? 'card-accomplished' : 'card-pending'}">
            <div class="objective-card-top">
              <div class="obj-header-meta">
                <span class="obj-badge-icon">🏋️</span>
                <div>
                  <span class="pillar-label">PILIER 3 : SPORT AU POIDS DU CORPS</span>
                  <h3 class="obj-title">Séance Quotidienne Full Body 17</h3>
                </div>
              </div>
              <span class="accomplished-badge ${items[2].isAccomplished ? 'badge-success' : 'badge-pending'}">
                ${items[2].isAccomplished ? 'Accompli ✓' : 'À Réaliser Aujourd\'hui ⏳'}
              </span>
            </div>

            <div class="objective-card-content">
              <div class="rule-box">
                <span class="rule-title">Règle d'accomplissement :</span>
                <p>Compléter 1 séance guidée complète au poids du corps (3 rounds d'exercices polyarticulaires) dans l'application Workout Home.</p>
              </div>

              <div class="live-progress-section">
                <div class="progress-labels-row">
                  <span>Séance du jour : <strong>${sources.workoutHome.workoutsCountToday > 0 ? '1 / 1 Terminée' : '0 / 1 En attente'}</strong></span>
                  <span>Progression : <strong>${sources.workoutHome.workoutsCountToday > 0 ? '100%' : '0%'}</strong></span>
                </div>
                <div class="progress-track-lg">
                  <div class="progress-bar-lg bar-workout" style="width: ${sources.workoutHome.workoutsCountToday > 0 ? '100%' : '0%'};"></div>
                </div>
                <div class="obj-details-note">
                  ${sources.workoutHome.workoutsCountToday > 0
                    ? `Félicitations ! Votre séance d'aujourd'hui est enregistrée dans le cloud Firebase.`
                    : `Séance en attente. Dès que vous la complétez dans Workout Home, ce pilier basculera automatiquement au vert !`
                  }
                </div>
              </div>

              <div class="verification-proof-box">
                <span class="proof-label">Preuve de validation :</span>
                <span>Lu depuis Firebase RTDB (${sources.workoutHome.url}) : ${sources.workoutHome.totalWorkouts} séances au total. Dernière séance : ${sources.workoutHome.latestWorkout ? sources.workoutHome.latestWorkout.date : 'Aucune'}.</span>
              </div>
            </div>
          </div>

        </div>

        <!-- CONSEILS POUR LES 3/3 OBJECTIFS -->
        <div class="strategy-callout-box">
          <div class="callout-icon">💡</div>
          <div class="callout-text">
            <strong>Stratégie d'Accomplissement Métabolique :</strong>
            <p>
              En associant le respect de la fenêtre 18/6, un apport glucidique sous ${profile.targetCarbs}g et votre routine au poids du corps Workout Home, votre organisme maximise l'oxydation des graisses profondes tout en protégeant votre masse musculaire.
            </p>
          </div>
        </div>

      </div>
    `;

    // Attacher l'écouteur du bouton rafraîchir
    const btn = document.getElementById('btnRefreshObjectifs');
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
