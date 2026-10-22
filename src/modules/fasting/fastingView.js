/**
 * Fasting View Controller - Health & Vitality Hub
 * Interface utilisateur interactive du jeûne intermittent et des étapes métaboliques.
 */

import { FASTING_PLANS, METABOLIC_STAGES } from './fastingData.js';
import { FastingEngine } from './fastingEngine.js';
import { appStore } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';

export class FastingView {
  constructor(container) {
    this.container = container;
    this.timerInterval = null;
    this.selectedPlanKey = appStore.state.fasting.planKey || 'PLAN_16_8';
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
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  stopLiveUpdate() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  render() {
    const fastingState = appStore.state.fasting;
    const status = FastingEngine.getStatus(fastingState);
    const radius = 100;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (status.progressPercent / 100) * circumference;

    this.container.innerHTML = `
      <div class="view-header">
        <div>
          <span class="view-badge">MÉTABOLISME & AUTOPHAGIE</span>
          <h1 class="view-title">Jeûne Intermittent</h1>
        </div>
        <div class="header-icon-badge">${ICONS.fire}</div>
      </div>

      <!-- TIMER CIRCULAIRE CENTRAL -->
      <div class="timer-card">
        <div class="circular-timer-wrap">
          <svg class="timer-svg" viewBox="0 0 240 240">
            <circle class="timer-track" cx="120" cy="120" r="${radius}"></circle>
            <circle
              id="fastingProgressRing"
              class="timer-progress"
              cx="120"
              cy="120"
              r="${radius}"
              style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${status.currentStage.color};"
            ></circle>
          </svg>

          <div class="timer-inner-content">
            <span class="timer-stage-badge" style="color: ${status.currentStage.color}; background: ${status.currentStage.color}15; border: 1px solid ${status.currentStage.color}30;">
              ${status.currentStage.emoji} ${status.currentStage.name}
            </span>
            <div id="fastingElapsedText" class="timer-main-digits">
              ${status.elapsedFormatted}
            </div>
            <span id="fastingSubtitleText" class="timer-subtext">
              ${status.isActive ? `Objectif : ${status.targetHours}h (${status.remainingFormatted} restant)` : 'Prêt à démarrer'}
            </span>
          </div>
        </div>

        <!-- ACTIONS PRINCIPALES -->
        <div class="timer-controls">
          ${!status.isActive ? `
            <button id="btnStartFast" class="btn-primary btn-block">
              ${ICONS.play} Démarrer le Jeûne
            </button>
          ` : `
            <div class="timer-btn-group">
              <button id="btnStopFast" class="btn-danger flex-1">
                ${ICONS.check} Terminer le Jeûne
              </button>
              <button id="btnAdjustFast" class="btn-secondary" title="Ajuster l'heure de départ">
                ${ICONS.clock}
              </button>
            </div>
          `}
        </div>
      </div>

      <!-- SÉLECTEUR DE PROTOCOLES -->
      <div class="section-card">
        <h2 class="section-title">Protocoles Disponibles</h2>
        <div class="plans-grid">
          ${Object.values(FASTING_PLANS).map(plan => {
            const isCurrent = (fastingState.isActive && fastingState.planKey === plan.key) || (!fastingState.isActive && this.selectedPlanKey === plan.key);
            return `
              <div class="plan-card ${isCurrent ? 'active' : ''}" data-plan-key="${plan.key}">
                <div class="plan-card-header">
                  <span class="plan-emoji">${plan.emoji}</span>
                  <span class="plan-difficulty">${plan.difficulty}</span>
                </div>
                <div class="plan-name">${plan.name}</div>
                <div class="plan-hours">${plan.fastingHours}h jeûne / ${plan.eatingHours}h repas</div>
                <p class="plan-desc">${plan.desc}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ÉTAPES MÉTABOLIQUES EN COURS -->
      <div class="section-card">
        <div class="section-header-flex">
          <h2 class="section-title">Étapes Métaboliques</h2>
          <span class="section-hint">Prochaine étape dans : <strong id="timeToNextStage">${status.timeUntilNextStage}</strong></span>
        </div>

        <div class="stages-timeline">
          ${METABOLIC_STAGES.map(stage => {
            const isPassed = status.elapsedHours >= stage.endHour;
            const isCurrent = status.elapsedHours >= stage.startHour && (status.elapsedHours < stage.endHour || stage.endHour === 72);
            return `
              <div class="stage-item ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''}" style="--stage-color: ${stage.color};">
                <div class="stage-indicator">
                  <span class="stage-dot">${stage.emoji}</span>
                  <div class="stage-line"></div>
                </div>
                <div class="stage-body">
                  <div class="stage-title-row">
                    <h3 class="stage-name">${stage.name}</h3>
                    <span class="stage-hours">${stage.startHour}h - ${stage.endHour}h</span>
                  </div>
                  <p class="stage-short">${stage.shortDesc}</p>
                  ${isCurrent ? `
                    <div class="stage-expanded-box">
                      <p class="stage-full">${stage.fullDesc}</p>
                      <ul class="stage-effects">
                        ${stage.effects.map(eff => `<li>✓ ${eff}</li>`).join('')}
                      </ul>
                      <div class="stage-tip">
                        💡 <strong>Conseil :</strong> ${stage.tip}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- HISTORIQUE RÉCENT -->
      ${fastingState.history.length > 0 ? `
        <div class="section-card">
          <h2 class="section-title">Historique des Jeûnes</h2>
          <div class="history-list">
            ${fastingState.history.slice(0, 5).map(session => {
              const plan = FASTING_PLANS[session.planKey] || FASTING_PLANS.PLAN_16_8;
              const dateStr = new Date(session.startTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              return `
                <div class="history-row">
                  <div class="history-left">
                    <span class="history-emoji">${plan.emoji}</span>
                    <div>
                      <div class="history-plan-name">${plan.name} · ${session.durationHours}h réalisées</div>
                      <div class="history-date">${dateStr} · Étape atteinte : ${session.stageReached}</div>
                    </div>
                  </div>
                  <span class="badge-success">Terminé</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Bouton démarrer
    const btnStart = this.container.querySelector('#btnStartFast');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const plan = FASTING_PLANS[this.selectedPlanKey] || FASTING_PLANS.PLAN_16_8;
        appStore.startFast(plan.key, plan.fastingHours);
        this.render();
      });
    }

    // Bouton terminer
    const btnStop = this.container.querySelector('#btnStopFast');
    if (btnStop) {
      btnStop.addEventListener('click', () => {
        const status = FastingEngine.getStatus(appStore.state.fasting);
        if (confirm(`Terminer votre jeûne de ${status.elapsedFormatted} ?`)) {
          appStore.stopFast(status.currentStage.name);
          this.render();
        }
      });
    }

    // Bouton ajuster heure
    const btnAdjust = this.container.querySelector('#btnAdjustFast');
    if (btnAdjust) {
      btnAdjust.addEventListener('click', () => {
        const hoursAgoStr = prompt("Combien d'heures (ou fraction d'heure, ex: 1.5) avez-vous déjà jeûné avant d'activer le chrono ?");
        if (hoursAgoStr !== null) {
          const hoursAgo = parseFloat(hoursAgoStr);
          if (!isNaN(hoursAgo) && hoursAgo >= 0 && hoursAgo < 168) {
            const newStartTime = Date.now() - (hoursAgo * 3600 * 1000);
            appStore.adjustFastStartTime(newStartTime);
            this.render();
          }
        }
      });
    }

    // Sélection de protocole
    this.container.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.planKey;
        this.selectedPlanKey = key;
        if (!appStore.state.fasting.isActive) {
          appStore.updateUser({ fastingPlan: key });
          this.render();
        } else {
          // Si déjà actif, proposer de changer l'objectif
          if (confirm(`Basculer vers le protocole ${FASTING_PLANS[key].name} pour ce jeûne en cours ?`)) {
            appStore.state.fasting.planKey = key;
            appStore.state.fasting.targetHours = FASTING_PLANS[key].fastingHours;
            appStore.save();
            this.render();
          }
        }
      });
    });
  }

  updateTimerDisplay() {
    const fastingState = appStore.state.fasting;
    if (!fastingState.isActive) return;

    const status = FastingEngine.getStatus(fastingState);
    const radius = 100;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (status.progressPercent / 100) * circumference;

    const digitsEl = this.container.querySelector('#fastingElapsedText');
    if (digitsEl) digitsEl.textContent = status.elapsedFormatted;

    const subEl = this.container.querySelector('#fastingSubtitleText');
    if (subEl) subEl.textContent = `Objectif : ${status.targetHours}h (${status.remainingFormatted} restant)`;

    const ringEl = this.container.querySelector('#fastingProgressRing');
    if (ringEl) {
      ringEl.style.strokeDashoffset = offset;
      ringEl.style.stroke = status.currentStage.color;
    }

    const nextEl = this.container.querySelector('#timeToNextStage');
    if (nextEl) nextEl.textContent = status.timeUntilNextStage;
  }
}
