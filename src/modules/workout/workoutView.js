/**
 * Workout View Controller - Health & Vitality Hub
 * Interface utilisateur de la séance de sport à la maison & player guidé.
 * Connecté directement au backend de l'application mère "Workout Home" (Firebase RTDB).
 */

import { EXERCISES_DATA, ROUTINES_BY_LEVEL, getExercisesForLevel, getExerciseById } from './exerciseData.js';
import { WorkoutEngine, WORKOUT_STATES } from './workoutEngine.js';
import { workoutSync } from './workoutSyncService.js';
import { appStore } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';

export class WorkoutView {
  constructor(container) {
    this.container = container;
    this.engine = new WorkoutEngine();
    this.selectedLevel = appStore.state.user.workoutLevel || 'intermediate';
    this.selectedRounds = 2;
    this.selectedDetailExercise = null;

    this.setupEngineCallbacks();
  }

  setupEngineCallbacks() {
    this.engine.onTick = () => {
      this.updateActivePlayerDisplay();
    };

    this.engine.onPhaseChange = () => {
      this.render();
    };

    this.engine.onFinish = (summary) => {
      appStore.recordWorkoutCompletion(summary);
      this.render();
    };
  }

  mount() {
    this.render();
    // Synchro automatique en arrière-plan avec le backend Workout Home
    workoutSync.sync().then(res => {
      if (res && res.success) {
        this.updateSyncBadge();
        if (this.engine.state === WORKOUT_STATES.IDLE) {
          this.render();
        }
      }
    }).catch(() => {});
  }

  unmount() {
    if (this.engine.state !== WORKOUT_STATES.IDLE && this.engine.state !== WORKOUT_STATES.COMPLETED) {
      this.engine.stopWorkout();
    }
  }

  render() {
    if (this.engine.state === WORKOUT_STATES.IDLE) {
      this.renderHome();
    } else if (this.engine.state === WORKOUT_STATES.COMPLETED) {
      this.renderCompleted();
    } else {
      this.renderActivePlayer();
    }
  }

  renderHome() {
    const workoutState = appStore.state.workout;
    const routineExercises = getExercisesForLevel(this.selectedLevel);
    const estDurationMinutes = Math.round((routineExercises.length * 40 * this.selectedRounds) / 60);
    const creds = workoutSync.getCredentials();

    const pedometer = appStore.getPedometer ? appStore.getPedometer() : (workoutState.pedometer || { todaySteps: 0, targetSteps: 8000, caloriesBurned: 0, distanceKm: 0 });
    const stepsCount = pedometer.todaySteps || 0;
    const stepsGoal = pedometer.targetSteps || 8000;
    const stepsCalories = pedometer.caloriesBurned || Math.round(stepsCount * 0.045);
    const stepsDistance = pedometer.distanceKm || Math.round((stepsCount * 0.00075) * 10) / 10;
    const stepsPct = Math.min(100, Math.round((stepsCount / stepsGoal) * 100));

    this.container.innerHTML = `
      <div class="view-header">
        <div>
          <span class="view-badge">FULL BODY 17 · POIDS DU CORPS</span>
          <h1 class="view-title">Sport & Vitalité</h1>
        </div>
        <div class="header-icon-badge">${ICONS.workout}</div>
      </div>

      <!-- BANNIÈRE BACKEND WORKOUT HOME (APPLICATION MÈRE) -->
      <div class="workout-backend-card">
        <div class="backend-card-header">
          <div class="backend-title-wrap">
            <span class="backend-icon">⚡</span>
            <div>
              <strong class="backend-title">Backend Workout Home (Firebase RTDB)</strong>
              <span id="workoutSyncTimeLabel" class="backend-sub">
                ${workoutSync.lastSyncTime ? `Dernière synchro : ${workoutSync.lastSyncTime}` : `Connecté : profil "${creds.userId}"`}
              </span>
            </div>
          </div>
          <button id="btnSyncWorkoutHome" class="btn-primary btn-sm">
            🔄 Synchroniser
          </button>
        </div>
      </div>

      <!-- STATUT DU JOUR & SÉRIE -->
      <div class="daily-summary-card">
        <div class="daily-summary-header">
          <span class="daily-title">Séance Quotidienne</span>
          <span class="daily-date">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        <div class="workout-streak-banner">
          <div class="streak-left">
            <span class="streak-flame">🔥</span>
            <div>
              <div class="streak-number">${workoutState.streak} ${workoutState.streak <= 1 ? 'jour' : 'jours'} consécutifs</div>
              <div class="streak-sub">Série d'entraînement active</div>
            </div>
          </div>
          <div>
            ${workoutState.todayCompleted ? `
              <span class="badge-success">Séance du jour validée ✓</span>
            ` : `
              <span class="badge-pending">À faire aujourd'hui</span>
            `}
          </div>
        </div>
      </div>

      <!-- CASE COMPTEUR PODOMÈTRE & CALORIES BRÛLÉES (WORKOUT HOME) -->
      <div class="pedometer-card">
        <div class="pedometer-header">
          <div class="pedometer-title-group">
            <span class="pedometer-icon-badge">🚶‍♂️</span>
            <div>
              <span class="pedometer-kicker">WORKOUT HOME · PODOMÈTRE</span>
              <h3 class="pedometer-card-title">Compteur de Pas &amp; Calories Brûlées</h3>
            </div>
          </div>
          <span class="pedometer-badge-pct ${stepsPct >= 100 ? 'badge-goal-hit' : ''}">
            ${stepsPct}% objectif
          </span>
        </div>

        <div class="pedometer-boxes-grid">
          <!-- Case 1: Nb de pas réalisé -->
          <div class="pedometer-stat-box box-steps">
            <span class="p-stat-icon">👟</span>
            <div class="p-stat-meta">
              <span class="p-stat-label">Pas Réalisés</span>
              <div class="p-stat-number-wrap">
                <span class="p-stat-value" id="pedStepsValue">${stepsCount.toLocaleString('fr-FR')}</span>
                <span class="p-stat-target">/ ${stepsGoal.toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>

          <!-- Case 2: Calories brûlées -->
          <div class="pedometer-stat-box box-calories">
            <span class="p-stat-icon">🔥</span>
            <div class="p-stat-meta">
              <span class="p-stat-label">Calories Brûlées</span>
              <div class="p-stat-number-wrap">
                <span class="p-stat-value" id="pedCaloriesValue">${stepsCalories}</span>
                <span class="p-stat-unit">kcal</span>
              </div>
            </div>
          </div>

          <!-- Case 3: Distance estimée -->
          <div class="pedometer-stat-box box-distance">
            <span class="p-stat-icon">📍</span>
            <div class="p-stat-meta">
              <span class="p-stat-label">Distance Estimée</span>
              <div class="p-stat-number-wrap">
                <span class="p-stat-value">${stepsDistance}</span>
                <span class="p-stat-unit">km</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Jauge d'avancement -->
        <div class="pedometer-gauge-container">
          <div class="pedometer-gauge-bar">
            <div class="pedometer-gauge-fill" style="width: ${stepsPct}%;"></div>
          </div>
          <div class="pedometer-gauge-hints">
            <span>0 pas</span>
            <span class="pedometer-remaining-hint">
              ${stepsCount >= stepsGoal
                ? `🎉 Bravo, objectif ${stepsGoal.toLocaleString('fr-FR')} pas validé !`
                : `Encore ${(stepsGoal - stepsCount).toLocaleString('fr-FR')} pas pour atteindre l'objectif`}
            </span>
            <span>${stepsGoal.toLocaleString('fr-FR')}</span>
          </div>
        </div>

        <!-- Boutons d'ajustement rapide et saisie -->
        <div class="pedometer-footer-row">
          <span class="p-quick-label">Ajuster vos pas :</span>
          <div class="p-quick-buttons">
            <button class="btn-step-add" data-step-add="500">+500 pas</button>
            <button class="btn-step-add" data-step-add="1000">+1 000 pas</button>
            <button class="btn-step-add" data-step-add="2500">+2 500 pas</button>
            <button class="btn-step-custom" id="btnCustomStepsModal">✏️ Saisir</button>
          </div>
        </div>
      </div>

      <!-- SÉLECTION DU NIVEAU & PARAMÈTRES -->
      <div class="section-card">
        <h2 class="section-title">Paramétrez votre Séance</h2>

        <!-- Niveaux -->
        <div class="level-tabs">
          ${[
            { id: 'beginner', label: 'Débutant', desc: '8 exercices adaptés' },
            { id: 'intermediate', label: 'Intermédiaire', desc: '9 exercices équilibrés' },
            { id: 'advanced', label: 'Avancé', desc: '9 exercices intenses' }
          ].map(lvl => `
            <button class="level-tab ${this.selectedLevel === lvl.id ? 'active' : ''}" data-level="${lvl.id}">
              <div class="level-tab-name">${lvl.label}</div>
              <div class="level-tab-sub">${lvl.desc}</div>
            </button>
          `).join('')}
        </div>

        <!-- Tours -->
        <div class="rounds-selector-row">
          <span class="rounds-label">Nombre de tours (circuit) :</span>
          <div class="rounds-pills">
            ${[1, 2, 3].map(r => `
              <button class="round-pill ${this.selectedRounds === r ? 'active' : ''}" data-rounds="${r}">
                ${r} ${r === 1 ? 'tour' : 'tours'} (~${Math.round(routineExercises.length * 40 * r / 60)} min)
              </button>
            `).join('')}
          </div>
        </div>

        <!-- CTA DÉMARRER -->
        <div class="workout-launch-box">
          <button id="btnStartWorkout" class="btn-primary btn-large btn-block">
            ${ICONS.play} Démarrer l'Entraînement (~${estDurationMinutes} min)
          </button>
        </div>
      </div>

      <!-- LISTE DES EXERCICES DU PROGRAMME -->
      <div class="section-card">
        <div class="section-header-flex">
          <h2 class="section-title">Circuit d'Exercices (${routineExercises.length})</h2>
          <span class="section-hint">${this.selectedRounds} tour(s) · 30s effort / 10s repos</span>
        </div>

        <div class="exercise-cards-list">
          ${routineExercises.map((ex, idx) => `
            <div class="exercise-row-card" data-ex-id="${ex.id}">
              <div class="ex-number-badge">${(idx + 1).toString().padStart(2, '0')}</div>
              <div class="ex-info">
                <h4 class="ex-name">${ex.name}</h4>
                <div class="ex-target">${ex.targetPrimary || ex.targetMuscles}</div>
              </div>
              <div class="ex-duration-chip">30s</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- HISTORIQUE RÉCENT -->
      ${workoutState.history.length > 0 ? `
        <div class="section-card">
          <h2 class="section-title">Historique des Séances</h2>
          <div class="history-list">
            ${workoutState.history.slice(0, 5).map(session => {
              const dateStr = new Date(session.timestamp || session.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              const mins = Math.round((session.durationSeconds || 600) / 60);
              return `
                <div class="history-row">
                  <div class="history-left">
                    <span class="history-emoji">🏆</span>
                    <div>
                      <div class="history-plan-name">Circuit ${session.routineLevel || 'Général'} · ${session.rounds || 2} tours</div>
                      <div class="history-date">${dateStr} · ~${mins} min · ${session.caloriesBurned || 120} kcal</div>
                    </div>
                  </div>
                  <span class="badge-success">Validé</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- MODAL DÉTAIL EXERCICE SI SÉLECTIONNÉ -->
      ${this.selectedDetailExercise ? this.renderExerciseModal(this.selectedDetailExercise) : ''}
    `;

    this.bindHomeEvents();
  }

  renderActivePlayer() {
    const status = this.engine.getStatus();
    const ex = status.currentExercise;
    const isPaused = status.state === WORKOUT_STATES.PAUSED;
    const isPrepare = status.state === WORKOUT_STATES.PREPARE;
    const isRest = status.state === WORKOUT_STATES.REST;

    let phaseLabel = 'EFFORT INTENSE';
    let phaseColor = '#10B981';
    let phaseClass = 'phase-work';

    if (isPrepare) {
      phaseLabel = 'PRÉPAREZ-VOUS';
      phaseColor = '#F59E0B';
      phaseClass = 'phase-prepare';
    } else if (isRest) {
      phaseLabel = 'RÉCUPÉRATION';
      phaseColor = '#06B6D4';
      phaseClass = 'phase-rest';
    }

    if (isPaused) {
      phaseLabel = 'EN PAUSE';
      phaseColor = '#94A3B8';
      phaseClass = 'phase-paused';
    }

    const radius = 95;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (status.progressPercent / 100) * circumference;

    this.container.innerHTML = `
      <div class="active-player-screen ${phaseClass}">
        <!-- Top Status Bar -->
        <div class="player-top-bar">
          <button id="btnPlayerQuit" class="btn-icon-soft" title="Quitter la séance">
            ${ICONS.close}
          </button>
          <div class="player-rounds-badge">
            Tour ${status.currentRound} / ${status.totalRounds} · Exercice ${status.currentExerciseIndex + 1} / ${status.totalExercises}
          </div>
          <div class="player-elapsed-time">
            ${Math.floor(status.elapsedSeconds / 60)}:${(status.elapsedSeconds % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <!-- Timer Circulaire Central -->
        <div class="player-timer-container">
          <svg class="player-svg" viewBox="0 0 220 220">
            <circle class="player-track" cx="110" cy="110" r="${radius}"></circle>
            <circle
              id="playerProgressRing"
              class="player-progress"
              cx="110"
              cy="110"
              r="${radius}"
              style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${phaseColor};"
            ></circle>
          </svg>

          <div class="player-timer-center">
            <span class="player-phase-chip" style="color: ${phaseColor}; background: ${phaseColor}15; border: 1px solid ${phaseColor}40;">
              ${phaseLabel}
            </span>
            <div id="playerTimerDigits" class="player-countdown-digits">
              ${status.timeRemaining}
            </div>
            <span class="player-countdown-unit">secondes</span>
          </div>
        </div>

        <!-- Fiche Exercice Actuel -->
        <div class="player-exercise-card">
          <h2 class="player-ex-title">${ex.name}</h2>
          <span class="player-ex-muscles">${ex.targetPrimary || ex.targetMuscles || 'Corps complet'}</span>
          <p class="player-ex-cue">💡 ${ex.cue || 'Gardez une respiration régulière et les abdominaux gainés.'}</p>
          <div class="player-ex-breathing">🫁 ${ex.breathing || 'Inspirez sur la descente, expirez sur l\'effort.'}</div>
        </div>

        <!-- Contrôles du Player -->
        <div class="player-controls-bar">
          <button id="btnPlayerPauseToggle" class="btn-player-action">
            ${isPaused ? ICONS.play : ICONS.pause}
            <span>${isPaused ? 'Reprendre' : 'Pause'}</span>
          </button>

          <button id="btnPlayerSkip" class="btn-player-action btn-skip">
            ${ICONS.skip}
            <span>Passer</span>
          </button>
        </div>
      </div>
    `;

    this.bindPlayerEvents();
  }

  renderCompleted() {
    const status = this.engine.getStatus();
    const durationMins = Math.max(1, Math.round(status.elapsedSeconds / 60));
    const calories = Math.round(status.elapsedSeconds * 0.14);

    this.container.innerHTML = `
      <div class="workout-completed-screen">
        <div class="completed-icon-wrap">🎉</div>
        <h1 class="completed-title">Séance Terminée !</h1>
        <p class="completed-sub">Félicitations pour votre régularité. Les données ont été sauvegardées et envoyées au backend Workout Home.</p>

        <div class="completed-stats-grid">
          <div class="c-stat-box">
            <span class="c-stat-val">${durationMins} min</span>
            <span class="c-stat-lbl">Durée totale</span>
          </div>
          <div class="c-stat-box">
            <span class="c-stat-val">~${calories} kcal</span>
            <span class="c-stat-lbl">Calories brûlées</span>
          </div>
          <div class="c-stat-box">
            <span class="c-stat-val">${status.totalRounds}</span>
            <span class="c-stat-lbl">Tours bouclés</span>
          </div>
        </div>

        <button id="btnFinishCompleted" class="btn-primary btn-large btn-block">
          ${ICONS.check} Retourner à l'Accueil
        </button>
      </div>
    `;

    const btn = this.container.querySelector('#btnFinishCompleted');
    if (btn) {
      btn.addEventListener('click', () => {
        this.engine.stopWorkout();
        this.render();
      });
    }
  }

  renderExerciseModal(ex) {
    return `
      <div class="modal-backdrop" id="modalBackdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>${ex.name}</h3>
            <button id="btnCloseModal" class="btn-icon-soft">${ICONS.close}</button>
          </div>
          <div class="modal-body">
            <div class="modal-target-badge">${ex.targetPrimary || ex.targetMuscles}</div>
            <p class="modal-desc">${ex.description || ''}</p>
            <div class="modal-cue-box">
              <strong>Conseil du coach :</strong> ${ex.cue || ''}
            </div>
            <div class="modal-adapt-box">
              <strong>Adaptation :</strong> ${ex.adaptation || ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindHomeEvents() {
    // Bouton de synchronisation Workout Home
    const btnSync = this.container.querySelector('#btnSyncWorkoutHome');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        btnSync.textContent = 'Synchronisation...';
        const res = await workoutSync.sync();
        btnSync.disabled = false;
        btnSync.textContent = '🔄 Synchroniser';
        if (res && res.success) {
          this.updateSyncBadge();
          alert("Séances de sport et profil synchronisés avec succès avec l'application mère Workout Home (Firebase RTDB) !");
          this.render();
        } else {
          alert("Erreur de connexion Workout Home : " + (res?.error || 'inconnue'));
        }
      });
    }

    // Changement de niveau
    this.container.querySelectorAll('.level-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectedLevel = tab.dataset.level;
        appStore.updateUser({ workoutLevel: this.selectedLevel });
        this.render();
      });
    });

    // Changement de nombre de tours
    this.container.querySelectorAll('.round-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.selectedRounds = parseInt(pill.dataset.rounds, 10);
        this.render();
      });
    });

    // Lancer la séance
    const btnStart = this.container.querySelector('#btnStartWorkout');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const exercises = getExercisesForLevel(this.selectedLevel);
        this.engine.startWorkout(exercises, {
          rounds: this.selectedRounds,
          routineLevel: this.selectedLevel
        });
        this.render();
      });
    }

    // Clic sur un exercice pour voir le détail
    this.container.querySelectorAll('.exercise-row-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.exId;
        this.selectedDetailExercise = getExerciseById(id);
        this.render();
      });
    });

    // Fermeture du modal
    const btnClose = this.container.querySelector('#btnCloseModal');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.selectedDetailExercise = null;
        this.render();
      });
    }

    // Ajustement rapide des pas (+500, +1000, +2500)
    this.container.querySelectorAll('.btn-step-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const toAdd = parseInt(btn.dataset.stepAdd, 10);
        if (toAdd > 0) {
          appStore.addSteps(toAdd);
          // Synchro non-bloquante avec Firebase RTDB
          workoutSync.sync().catch(() => {});
          this.render();
        }
      });
    });

    // Saisie personnalisée du compteur de pas
    const btnCustomSteps = this.container.querySelector('#btnCustomStepsModal');
    if (btnCustomSteps) {
      btnCustomSteps.addEventListener('click', () => {
        const ped = appStore.getPedometer ? appStore.getPedometer() : appStore.state.workout.pedometer;
        const current = ped?.todaySteps || 0;
        const val = prompt("Entrez le nombre total de pas réalisés aujourd'hui :", current);
        if (val !== null && val.trim() !== '' && !isNaN(val)) {
          const num = Math.max(0, parseInt(val, 10));
          appStore.updatePedometer({ todaySteps: num });
          workoutSync.sync().catch(() => {});
          this.render();
        }
      });
    }
  }

  bindPlayerEvents() {
    const btnPause = this.container.querySelector('#btnPlayerPauseToggle');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (this.engine.state === WORKOUT_STATES.PAUSED) {
          this.engine.resume();
        } else {
          this.engine.pause();
        }
        this.render();
      });
    }

    const btnSkip = this.container.querySelector('#btnPlayerSkip');
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        this.engine.skipExercise();
      });
    }

    const btnQuit = this.container.querySelector('#btnPlayerQuit');
    if (btnQuit) {
      btnQuit.addEventListener('click', () => {
        if (confirm("Abandonner la séance en cours ?")) {
          this.engine.stopWorkout();
          this.render();
        }
      });
    }
  }

  updateActivePlayerDisplay() {
    const status = this.engine.getStatus();
    const digits = this.container.querySelector('#playerTimerDigits');
    if (digits) {
      digits.textContent = status.timeRemaining;
    }

    const ring = this.container.querySelector('#playerProgressRing');
    if (ring) {
      const radius = 95;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (status.progressPercent / 100) * circumference;
      ring.style.strokeDashoffset = offset;
    }
  }

  updateSyncBadge() {
    const label = this.container.querySelector('#workoutSyncTimeLabel');
    if (label && workoutSync.lastSyncTime) {
      label.textContent = `Dernière synchro : ${workoutSync.lastSyncTime}`;
    }
  }
}
