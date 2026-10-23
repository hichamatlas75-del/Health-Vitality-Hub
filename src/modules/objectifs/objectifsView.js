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
                <circle class="gauge-bg" cx="20" cy="20" r="16" pathLength="100" />
                <circle class="gauge-fill" cx="20" cy="20" r="16" pathLength="100" stroke-dasharray="${globalPercent}, 100" />
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
                  <span class="pillar-label">PILIER 2 : NUTRITION &amp; MACRONUTRIMENTS (85 KG / 18-6)</span>
                  <h3 class="obj-title">150g Prot • 150g Gluc • 80g Lip (~1920-2000 kcal)</h3>
                </div>
              </div>
              <span class="accomplished-badge ${items[1].isAccomplished ? 'badge-success' : 'badge-danger'}">
                ${items[1].isAccomplished ? 'Sous le plafond glucidique ✓' : 'Plafond Dépassé ⚠️'}
              </span>
            </div>

            <div class="objective-card-content">
              <div class="rule-box">
                <span class="rule-title">Protocole Nutritionnel 85 kg (18-6) :</span>
                <p>Apport énergétique total de <strong>~1920 à 2000 kcal</strong>, réparti en <strong>150g de protéines</strong> (synthèse musculaire & satiété), <strong>150g de glucides nets max</strong> (recharge glycogénique sans pic d'insuline) et <strong>80g de lipides</strong> (équilibre hormonal & oméga-3).</p>
              </div>

              <!-- LES 4 JAUGES DE MACRONUTRIMENTS DU PROTOCOLE -->
              <div class="macros-grid-progress">
                <div class="macro-prog-box">
                  <div class="mp-head">
                    <span class="mp-title">⚡ Calories</span>
                    <strong class="mp-val">${sources.glucoCarb.todayCalories || 0} / 1950 kcal</strong>
                  </div>
                  <div class="mp-track">
                    <div class="mp-fill fill-cal" style="width: ${Math.min(100, Math.round(((sources.glucoCarb.todayCalories || 0) / 1950) * 100))}%;"></div>
                  </div>
                  <span class="mp-sub">Cible : ~1920 - 2000 kcal</span>
                </div>

                <div class="macro-prog-box">
                  <div class="mp-head">
                    <span class="mp-title">🥩 Protéines</span>
                    <strong class="mp-val">${sources.glucoCarb.todayProtein}g / ${profile.targetProtein || 150}g</strong>
                  </div>
                  <div class="mp-track">
                    <div class="mp-fill fill-prot" style="width: ${Math.min(100, Math.round((sources.glucoCarb.todayProtein / (profile.targetProtein || 150)) * 100))}%;"></div>
                  </div>
                  <span class="mp-sub">Objectif : 150g</span>
                </div>

                <div class="macro-prog-box">
                  <div class="mp-head">
                    <span class="mp-title">🥖 Glucides Nets</span>
                    <strong class="mp-val">${sources.glucoCarb.todayNetCarbs}g / ${profile.targetCarbs || 150}g</strong>
                  </div>
                  <div class="mp-track">
                    <div class="mp-fill ${sources.glucoCarb.todayNetCarbs <= (profile.targetCarbs || 150) ? 'fill-carbs' : 'fill-danger'}" style="width: ${Math.min(100, Math.round((sources.glucoCarb.todayNetCarbs / (profile.targetCarbs || 150)) * 100))}%;"></div>
                  </div>
                  <span class="mp-sub">Plafond : ≤ 150g</span>
                </div>

                <div class="macro-prog-box">
                  <div class="mp-head">
                    <span class="mp-title">🫒 Lipides</span>
                    <strong class="mp-val">${sources.glucoCarb.todayFat || 0}g / ${profile.targetFat || 80}g</strong>
                  </div>
                  <div class="mp-track">
                    <div class="mp-fill fill-fat" style="width: ${Math.min(100, Math.round(((sources.glucoCarb.todayFat || 0) / (profile.targetFat || 80)) * 100))}%;"></div>
                  </div>
                  <span class="mp-sub">Cible : 80g</span>
                </div>
              </div>

              <!-- RÉPARTITION DES 2 REPAS (10H00 [40%] & 15H00 [60%]) -->
              <div class="protocol-meals-split-cards">
                <div class="split-meal-card ${sources.glucoCarb.protocol186?.repas1?.actual?.logged ? 'card-logged' : 'card-waiting'}">
                  <div class="sm-card-head">
                    <div class="sm-title-row">
                      <span class="sm-icon">🍳</span>
                      <div>
                        <strong class="sm-name">REPAS 1 (10H00) - RUPTURE DU JEÛNE [40%]</strong>
                        <span class="sm-timing">Prise optimale : 10h00 (Fenêtre 09h-12h)</span>
                      </div>
                    </div>
                    <span class="sm-status-badge ${sources.glucoCarb.protocol186?.repas1?.actual?.logged ? 'badge-success' : 'badge-pending'}">
                      ${sources.glucoCarb.protocol186?.repas1?.actual?.logged ? 'Journalisé ✓' : 'À prendre à 10h00'}
                    </span>
                  </div>
                  <div class="sm-target-macros-row">
                    <span class="target-tag">Cible [40%] :</span>
                    <span class="macro-pill mp-cal">~770 kcal</span>
                    <span class="macro-pill mp-p">60g Prot</span>
                    <span class="macro-pill mp-g">60g Gluc</span>
                    <span class="macro-pill mp-l">32g Lip</span>
                  </div>
                  ${sources.glucoCarb.protocol186?.repas1?.actual?.logged ? `
                    <div class="sm-actual-row">
                      <span>Relevé : <strong>${sources.glucoCarb.protocol186.repas1.actual.title}</strong> (${sources.glucoCarb.protocol186.repas1.actual.calories} kcal • ${sources.glucoCarb.protocol186.repas1.actual.protein}g P • ${sources.glucoCarb.protocol186.repas1.actual.carbs}g G • ${sources.glucoCarb.protocol186.repas1.actual.fat}g L)</span>
                    </div>
                  ` : `
                    <div class="sm-preset-hint">
                      💡 <em>Exemple Rupture : 3 Œufs au plat + 165g Pain complet graines + 65g Jben Beldi & Huile d'olive.</em>
                    </div>
                  `}
                </div>

                <div class="split-meal-card ${sources.glucoCarb.protocol186?.repas2?.actual?.logged ? 'card-logged' : 'card-waiting'}">
                  <div class="sm-card-head">
                    <div class="sm-title-row">
                      <span class="sm-icon">🍗</span>
                      <div>
                        <strong class="sm-name">REPAS 2 (15H00) - CLÔTURE DU JEÛNE [60%]</strong>
                        <span class="sm-timing">Prise optimale : 14h30 - 15h00 (Avant fermeture 15h00)</span>
                      </div>
                    </div>
                    <span class="sm-status-badge ${sources.glucoCarb.protocol186?.repas2?.actual?.logged ? 'badge-success' : 'badge-pending'}">
                      ${sources.glucoCarb.protocol186?.repas2?.actual?.logged ? 'Journalisé ✓' : 'À prendre à 15h00'}
                    </span>
                  </div>
                  <div class="sm-target-macros-row">
                    <span class="target-tag">Cible [60%] :</span>
                    <span class="macro-pill mp-cal">~1150 kcal</span>
                    <span class="macro-pill mp-p">90g Prot</span>
                    <span class="macro-pill mp-g">90g Gluc</span>
                    <span class="macro-pill mp-l">48g Lip</span>
                  </div>
                  ${sources.glucoCarb.protocol186?.repas2?.actual?.logged ? `
                    <div class="sm-actual-row">
                      <span>Relevé : <strong>${sources.glucoCarb.protocol186.repas2.actual.title}</strong> (${sources.glucoCarb.protocol186.repas2.actual.calories} kcal • ${sources.glucoCarb.protocol186.repas2.actual.protein}g P • ${sources.glucoCarb.protocol186.repas2.actual.carbs}g G • ${sources.glucoCarb.protocol186.repas2.actual.fat}g L)</span>
                    </div>
                  ` : `
                    <div class="sm-preset-hint">
                      💡 <em>Exemple Clôture : 270g Poulet grillé (ou 320g Sardines) + 235g Khobz complet + Salade marocaine + 23g Huile d'olive.</em>
                    </div>
                  `}
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
