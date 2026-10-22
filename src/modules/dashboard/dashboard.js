/**
 * Dashboard View Controller - Health & Vitality Hub
 * Vue de synthèse unifiée : Jeûne en cours, Cumul des Glucides et Séance de Sport.
 */

import { appStore } from '../../core/store.js';
import { FastingEngine } from '../fasting/fastingEngine.js';
import { FASTING_PLANS } from '../fasting/fastingData.js';
import { ICONS } from '../../ui/icons.js';

export class DashboardView {
  constructor(container, navigateToTab) {
    this.container = container;
    this.navigateToTab = navigateToTab;
    this.timerInterval = null;
  }

  mount() {
    this.render();
    this.startLiveUpdate();
  }

  unmount() {
    this.stopLiveUpdate();
  }

  startLiveUpdate() {
    this.stopLiveUpdate();
    this.timerInterval = setInterval(() => {
      if (appStore.state.fasting.isActive) {
        this.updateLiveFastingBadge();
      }
    }, 1000);
  }

  stopLiveUpdate() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  computeVitalityScore() {
    let score = 0;
    const fasting = appStore.state.fasting;
    const workout = appStore.state.workout;
    const todayNetCarbs = appStore.getTodayNetCarbs();
    const carbsTarget = appStore.state.user.carbsDailyTarget || 120;

    // Jeûne (max 35 pts)
    if (fasting.isActive) {
      const status = FastingEngine.getStatus(fasting);
      score += Math.min(35, Math.round((status.progressPercent / 100) * 35));
    } else if (fasting.history.some(h => new Date(h.startTime).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10))) {
      score += 35;
    }

    // Nutrition & Glucides (max 35 pts)
    if (todayNetCarbs > 0 && todayNetCarbs <= carbsTarget) {
      score += 35;
    } else if (todayNetCarbs > carbsTarget) {
      score += Math.max(10, 35 - Math.round(((todayNetCarbs - carbsTarget) / carbsTarget) * 25));
    } else {
      score += 20; // Neutre au réveil
    }

    // Sport (max 30 pts)
    if (workout.todayCompleted) {
      score += 30;
    } else {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  getSmartAdvice(fastingStatus, todayNetCarbs, workoutCompleted) {
    if (fastingStatus.isActive) {
      if (fastingStatus.elapsedHours >= 16) {
        return "✨ Vous êtes en phase d'autophagie avancée : régénération cellulaire active. Hydratez-vous abondamment !";
      }
      if (fastingStatus.elapsedHours >= 12) {
        return "🧠 Vous êtes en cétose : clarté mentale et focus au maximum. Vos cellules brûlent les acides gras.";
      }
      if (fastingStatus.elapsedHours >= 8) {
        return "🔥 Lipolyse active ! C'est le moment idéal pour votre séance de sport ou une marche dynamique.";
      }
      return "💧 Pensez à boire de l'eau tempérée, du thé vert ou des infusions sans sucre pendant la digestion.";
    }

    if (workoutCompleted && todayNetCarbs > 0) {
      return "💪 Superbe régularité ! Vos muscles absorbent les nutriments pour la récupération.";
    }

    return "🎯 Fixez votre routine aujourd'hui : 1 jeûne structuré, des repas à indice glycémique maîtrisé et 15 min de sport !";
  }

  render() {
    const user = appStore.state.user;
    const fasting = appStore.state.fasting;
    const fastingStatus = FastingEngine.getStatus(fasting);
    const workout = appStore.state.workout;

    const todayNetCarbs = appStore.getTodayNetCarbs();
    const todayProtein = appStore.getTodayProtein();
    const carbsTarget = user.carbsDailyTarget || 120;
    const carbsPct = Math.min(100, Math.round((todayNetCarbs / carbsTarget) * 100));

    const vitalityScore = this.computeVitalityScore();
    const smartAdvice = this.getSmartAdvice(fastingStatus, todayNetCarbs, workout.todayCompleted);

    this.container.innerHTML = `
      <!-- EN-TÊTE DASHBOARD -->
      <div class="dashboard-header">
        <div class="user-welcome">
          <span class="user-greeting">SANTÉ & VITALITÉ HUB</span>
          <h1 class="user-name">Bonjour, ${user.name} 👋</h1>
          <span class="dashboard-date">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <button id="btnOpenSettings" class="btn-settings-trigger" title="Réglages & Profil">
          ${ICONS.settings}
        </button>
      </div>

      <!-- VITALITY SCORE BANNER -->
      <div class="vitality-score-card">
        <div class="vitality-left">
          <div class="vitality-badge">
            <span class="vitality-num">${vitalityScore}</span>
            <span class="vitality-max">/100</span>
          </div>
          <div class="vitality-meta">
            <h3 class="vitality-title">Score de Vitalité Métabolique</h3>
            <p class="vitality-desc">
              ${vitalityScore >= 80 ? 'Excellente synergie ! Vous maîtrisez les 3 piliers.' : (vitalityScore >= 50 ? 'Bonne progression aujourd\'hui. Continuez !' : 'Démarrez votre routine pour booster votre vitalité.')}
            </p>
          </div>
        </div>
        <div class="vitality-pillars-dots">
          <span class="dot-pillar ${fasting.isActive || vitalityScore >= 35 ? 'done' : ''}" title="Jeûne">⚡</span>
          <span class="dot-pillar ${todayNetCarbs > 0 ? 'done' : ''}" title="Nutrition">🥗</span>
          <span class="dot-pillar ${workout.todayCompleted ? 'done' : ''}" title="Sport">🏋️</span>
        </div>
      </div>

      <!-- CONSEIL DU MOMENT -->
      <div class="smart-advice-box">
        <span class="advice-icon">${ICONS.sparkles}</span>
        <div class="advice-content">
          <strong>Conseil Métabolique en direct :</strong>
          <p>${smartAdvice}</p>
        </div>
      </div>

      <!-- LES 3 PILIERS EN CARTES WIDGET -->
      <div class="widgets-container">

        <!-- 1. WIDGET JEÛNE INTERMITTENT -->
        <div class="dashboard-widget-card widget-fasting" id="widgetFasting">
          <div class="widget-header">
            <div class="widget-title-wrap">
              <span class="widget-icon icon-fasting">${ICONS.fasting}</span>
              <div>
                <h3 class="widget-title">Jeûne Intermittent</h3>
                <span class="widget-subtitle">${FASTING_PLANS[fasting.planKey]?.name || '16:8 Le Classique'}</span>
              </div>
            </div>
            <span class="widget-status-badge ${fastingStatus.isActive ? 'badge-active' : 'badge-idle'}">
              ${fastingStatus.isActive ? 'En cours' : 'En pause'}
            </span>
          </div>

          <div class="widget-body">
            ${fastingStatus.isActive ? `
              <div class="fasting-widget-active">
                <div class="fasting-digits-row">
                  <span id="dashFastingTimer" class="fasting-digits">${fastingStatus.elapsedFormatted}</span>
                  <span class="stage-tag" style="background: ${fastingStatus.currentStage.color}20; color: ${fastingStatus.currentStage.color}; border: 1px solid ${fastingStatus.currentStage.color}40;">
                    ${fastingStatus.currentStage.emoji} ${fastingStatus.currentStage.name}
                  </span>
                </div>
                <div class="progress-track mt-2">
                  <div class="progress-bar bar-orange" style="width: ${fastingStatus.progressPercent}%;"></div>
                </div>
                <div class="widget-hint-row">
                  <span>Objectif : ${fastingStatus.targetHours}h (${fastingStatus.progressPercent}%)</span>
                  <span>Restant : ${fastingStatus.remainingFormatted}</span>
                </div>
              </div>
            ` : `
              <div class="fasting-widget-idle">
                <p class="idle-text">Aucun jeûne actif pour l'instant. Démarrez votre chrono dès la fin de votre dernier repas.</p>
                <button id="btnDashStartFast" class="btn-primary btn-sm">
                  ${ICONS.play} Démarrer maintenant (${FASTING_PLANS[fasting.planKey]?.name || '16:8'})
                </button>
              </div>
            `}
          </div>

          <div class="widget-footer">
            <button class="widget-nav-btn" data-target="fasting">
              Gérer le jeûne & voir les étapes →
            </button>
          </div>
        </div>

        <!-- 2. WIDGET NUTRITION & GLUCIDES -->
        <div class="dashboard-widget-card widget-nutrition" id="widgetNutrition">
          <div class="widget-header">
            <div class="widget-title-wrap">
              <span class="widget-icon icon-nutrition">${ICONS.nutrition}</span>
              <div>
                <h3 class="widget-title">Glucides & Nutrition Maroc</h3>
                <span class="widget-subtitle">Calculateur de charge glycémique</span>
              </div>
            </div>
            <span class="widget-status-badge ${carbsPct > 100 ? 'badge-danger' : (carbsPct > 80 ? 'badge-warning' : 'badge-good')}">
              ${carbsPct}% limite
            </span>
          </div>

          <div class="widget-body">
            <div class="nutrition-widget-stats">
              <div class="n-stat-main">
                <div class="n-val-big">${Math.round(todayNetCarbs)}<span class="n-unit">g</span></div>
                <div class="n-sub">Glucides nets consommés (max ${carbsTarget}g)</div>
              </div>

              <div class="progress-track mt-2">
                <div class="progress-bar ${carbsPct > 100 ? 'bar-danger' : (carbsPct > 80 ? 'bar-warning' : 'bar-primary')}" style="width: ${carbsPct}%;"></div>
              </div>

              <div class="macro-mini-row">
                <span>🍗 Protéines : <strong>${Math.round(todayProtein)}g</strong></span>
                <span>🍽️ Repas saisis : <strong>${appStore.getTodayMeals().length}</strong></span>
              </div>
            </div>
          </div>

          <div class="widget-footer">
            <button class="widget-nav-btn" data-target="nutrition">
              Ajouter un aliment ou plat marocain →
            </button>
          </div>
        </div>

        <!-- 3. WIDGET SPORT & VITALITÉ -->
        <div class="dashboard-widget-card widget-workout" id="widgetWorkout">
          <div class="widget-header">
            <div class="widget-title-wrap">
              <span class="widget-icon icon-workout">${ICONS.workout}</span>
              <div>
                <h3 class="widget-title">Sport Maison</h3>
                <span class="widget-subtitle">Full Body 17 au poids du corps</span>
              </div>
            </div>
            <span class="widget-status-badge ${workout.todayCompleted ? 'badge-good' : 'badge-pending'}">
              ${workout.todayCompleted ? 'Validé ✓' : 'À faire'}
            </span>
          </div>

          <div class="widget-body">
            <div class="workout-widget-status">
              <div class="workout-status-row">
                <span class="w-streak-badge">🔥 Série : ${workout.streak} ${workout.streak <= 1 ? 'jour' : 'jours'}</span>
                <span class="w-level-badge">Niveau : ${user.workoutLevel || 'intermédiaire'}</span>
              </div>

              <p class="workout-action-text">
                ${workout.todayCompleted
                  ? 'Bravo, vous avez validé votre séance aujourd\'hui ! Repos mérité ou étirements légers.'
                  : 'Une routine guidée de 15 à 20 minutes pour tonifier votre corps sans aucun équipement.'}
              </p>
            </div>
          </div>

          <div class="widget-footer">
            <button class="widget-nav-btn" data-target="workout">
              ${workout.todayCompleted ? 'Revoir le circuit d\'exercices →' : 'Lancer la séance guidée →'}
            </button>
          </div>
        </div>

      </div>

      <!-- MODAL RÉGLAGES & PROFIL -->
      <div id="settingsModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Paramètres & Sauvegarde</h3>
            <button id="btnCloseSettings" class="btn-icon-soft">${ICONS.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Votre Prénom / Pseudo :</label>
              <input type="text" id="settingName" class="form-input" value="${user.name}" />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Poids (kg) :</label>
                <input type="number" id="settingWeight" class="form-input" value="${user.weight || 70}" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Taille (cm) :</label>
                <input type="number" id="settingHeight" class="form-input" value="${user.height || 175}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Limite glucides nets/jour (g) :</label>
              <input type="number" id="settingCarbsLimit" class="form-input" value="${carbsTarget}" />
            </div>

            <div class="backup-actions-box">
              <h4>Sauvegarde Locale Unifiée</h4>
              <p class="text-xs text-muted">Exportez ou restaurez toutes vos données (jeûne, repas, séances de sport) en un clic.</p>
              <div class="backup-buttons">
                <button id="btnExportBackup" class="btn-secondary btn-sm">Exporter sauvegarde JSON</button>
                <label class="btn-secondary btn-sm cursor-pointer">
                  Importer JSON
                  <input type="file" id="importFileInput" accept=".json" style="display: none;" />
                </label>
              </div>
            </div>

            <button id="btnSaveSettings" class="btn-primary btn-block mt-4">
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Navigation vers les onglets
    this.container.querySelectorAll('.widget-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (this.navigateToTab) {
          this.navigateToTab(target);
        }
      });
    });

    // Démarrage rapide du jeûne depuis le dashboard
    const btnQuickStart = this.container.querySelector('#btnDashStartFast');
    if (btnQuickStart) {
      btnQuickStart.addEventListener('click', () => {
        const planKey = appStore.state.fasting.planKey || 'PLAN_16_8';
        const plan = FASTING_PLANS[planKey] || FASTING_PLANS.PLAN_16_8;
        appStore.startFast(plan.key, plan.fastingHours);
        this.render();
      });
    }

    // Modal Réglages
    const btnOpenSettings = this.container.querySelector('#btnOpenSettings');
    const modal = this.container.querySelector('#settingsModal');
    const btnCloseSettings = this.container.querySelector('#btnCloseSettings');

    if (btnOpenSettings && modal) {
      btnOpenSettings.addEventListener('click', () => {
        modal.style.display = 'flex';
      });
    }

    if (btnCloseSettings && modal) {
      btnCloseSettings.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    // Sauvegarde réglages
    const btnSaveSettings = this.container.querySelector('#btnSaveSettings');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const name = this.container.querySelector('#settingName')?.value || 'Champion(ne)';
        const weight = parseFloat(this.container.querySelector('#settingWeight')?.value) || 70;
        const height = parseFloat(this.container.querySelector('#settingHeight')?.value) || 175;
        const carbs = parseInt(this.container.querySelector('#settingCarbsLimit')?.value, 10) || 120;

        appStore.updateUser({
          name,
          weight,
          height,
          carbsDailyTarget: carbs
        });

        if (modal) modal.style.display = 'none';
        this.render();
      });
    }

    // Exportation backup
    const btnExport = this.container.querySelector('#btnExportBackup');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        appStore.exportBackup();
      });
    }

    // Importation backup
    const fileInput = this.container.querySelector('#importFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const ok = appStore.importBackup(evt.target.result);
            if (ok) {
              alert("Données restaurées avec succès !");
              if (modal) modal.style.display = 'none';
              this.render();
            } else {
              alert("Erreur lors de la lecture du fichier de sauvegarde.");
            }
          };
          reader.readAsText(file);
        }
      });
    }
  }

  updateLiveFastingBadge() {
    const fasting = appStore.state.fasting;
    if (!fasting.isActive) return;

    const status = FastingEngine.getStatus(fasting);
    const timerEl = this.container.querySelector('#dashFastingTimer');
    if (timerEl) {
      timerEl.textContent = status.elapsedFormatted;
    }
  }
}
