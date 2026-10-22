/**
 * Workout Engine - Health & Vitality Hub
 * Machine à états d'entraînement (Effort / Repos / Tours), Synchronisation Audio et Wake Lock.
 */

import { audioEngine } from '../../core/audio.js';

export const WORKOUT_STATES = {
  IDLE: 'IDLE',
  PREPARE: 'PREPARE',
  WORK: 'WORK',
  REST: 'REST',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED'
};

export class WorkoutEngine {
  constructor() {
    this.state = WORKOUT_STATES.IDLE;
    this.previousState = null;

    this.currentRound = 1;
    this.totalRounds = 2;
    this.currentExerciseIndex = 0;
    this.exercises = [];

    this.workDuration = 30; // secondes par exercice
    this.restDuration = 10; // secondes de repos
    this.prepareDuration = 5; // secondes de préparation

    this.timeRemaining = 0;
    this.totalPhaseDuration = 0;
    this.workoutStartTime = null;
    this.elapsedSeconds = 0;

    this.timerInterval = null;
    this.wakeLock = null;

    // Callbacks
    this.onTick = null;
    this.onPhaseChange = null;
    this.onFinish = null;
  }

  startWorkout(exercises = [], options = {}) {
    this.exercises = exercises.length > 0 ? exercises : [];
    this.totalRounds = options.rounds || 2;
    this.workDuration = options.workDuration || 30;
    this.restDuration = options.restDuration || 10;
    this.routineLevel = options.routineLevel || 'intermediate';

    this.currentRound = 1;
    this.currentExerciseIndex = 0;
    this.elapsedSeconds = 0;
    this.workoutStartTime = Date.now();

    this.requestWakeLock();

    // Démarrage par la phase de préparation
    this.setPhase(WORKOUT_STATES.PREPARE, this.prepareDuration);
    this.startTimerLoop();

    const firstEx = this.getCurrentExercise();
    audioEngine.speak(`Préparez-vous. Premier exercice : ${firstEx.name}`);
  }

  getCurrentExercise() {
    return this.exercises[this.currentExerciseIndex] || {
      id: 0,
      name: "Exercice",
      targetPrimary: "Corps Entier",
      cue: "Maintenez une posture droite et gainée."
    };
  }

  setPhase(newState, duration) {
    this.state = newState;
    this.timeRemaining = duration;
    this.totalPhaseDuration = duration;

    if (this.onPhaseChange) {
      this.onPhaseChange(this.getStatus());
    }
  }

  startTimerLoop() {
    this.stopTimerLoop();
    this.timerInterval = setInterval(() => {
      if (this.state === WORKOUT_STATES.PAUSED || this.state === WORKOUT_STATES.IDLE || this.state === WORKOUT_STATES.COMPLETED) {
        return;
      }

      this.elapsedSeconds++;
      this.timeRemaining--;

      // Bips du compte à rebours final (3, 2, 1)
      if (this.timeRemaining === 3 || this.timeRemaining === 2 || this.timeRemaining === 1) {
        audioEngine.beepCountdown();
      }

      // Transition de phase quand le chrono atteint 0
      if (this.timeRemaining <= 0) {
        this.handlePhaseTransition();
      } else {
        if (this.onTick) {
          this.onTick(this.getStatus());
        }
      }
    }, 1000);
  }

  stopTimerLoop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handlePhaseTransition() {
    if (this.state === WORKOUT_STATES.PREPARE) {
      // Fin de la préparation -> Début du 1er exercice
      const ex = this.getCurrentExercise();
      const duration = ex.duration || this.workDuration;
      this.setPhase(WORKOUT_STATES.WORK, duration);
      audioEngine.beepGo();
      audioEngine.speak(`${ex.name}. C'est parti !`);
    } else if (this.state === WORKOUT_STATES.WORK) {
      // Fin de l'effort -> Repos ou fin de séance
      const isLastExercise = this.currentExerciseIndex === this.exercises.length - 1;
      const isLastRound = this.currentRound === this.totalRounds;

      if (isLastExercise && isLastRound) {
        this.completeWorkout();
      } else {
        this.setPhase(WORKOUT_STATES.REST, this.restDuration);
        audioEngine.beepRest();

        // Annonce du prochain exercice pendant le repos
        let nextIndex = this.currentExerciseIndex + 1;
        let nextRound = this.currentRound;
        if (nextIndex >= this.exercises.length) {
          nextIndex = 0;
          nextRound++;
        }
        const nextEx = this.exercises[nextIndex];
        if (nextEx) {
          setTimeout(() => {
            if (this.state === WORKOUT_STATES.REST) {
              audioEngine.speak(`Repos. Prochain exercice : ${nextEx.name}`);
            }
          }, 1200);
        }
      }
    } else if (this.state === WORKOUT_STATES.REST) {
      // Fin du repos -> Exercice suivant ou tour suivant
      this.currentExerciseIndex++;
      if (this.currentExerciseIndex >= this.exercises.length) {
        this.currentExerciseIndex = 0;
        this.currentRound++;
        audioEngine.speak(`Tour ${this.currentRound} sur ${this.totalRounds}`);
      }

      const ex = this.getCurrentExercise();
      const duration = ex.duration || this.workDuration;
      this.setPhase(WORKOUT_STATES.WORK, duration);
      audioEngine.beepGo();
    }
  }

  pause() {
    if (this.state !== WORKOUT_STATES.PAUSED && this.state !== WORKOUT_STATES.IDLE && this.state !== WORKOUT_STATES.COMPLETED) {
      this.previousState = this.state;
      this.state = WORKOUT_STATES.PAUSED;
      if (this.onPhaseChange) this.onPhaseChange(this.getStatus());
    }
  }

  resume() {
    if (this.state === WORKOUT_STATES.PAUSED) {
      this.state = this.previousState || WORKOUT_STATES.WORK;
      this.previousState = null;
      if (this.onPhaseChange) this.onPhaseChange(this.getStatus());
    }
  }

  skipExercise() {
    if (this.state === WORKOUT_STATES.WORK || this.state === WORKOUT_STATES.REST || this.state === WORKOUT_STATES.PREPARE) {
      this.timeRemaining = 0;
      this.handlePhaseTransition();
    }
  }

  completeWorkout() {
    this.stopTimerLoop();
    this.releaseWakeLock();
    this.state = WORKOUT_STATES.COMPLETED;

    audioEngine.beepVictory();
    audioEngine.speak("Félicitations ! Vous avez terminé votre séance complète !");

    const summary = {
      routineLevel: this.routineLevel,
      durationSeconds: this.elapsedSeconds,
      rounds: this.totalRounds,
      exercisesCount: this.exercises.length,
      caloriesBurned: Math.round(this.elapsedSeconds * 0.14) // ~8.5 kcal/min
    };

    if (this.onFinish) {
      this.onFinish(summary);
    }
    if (this.onPhaseChange) {
      this.onPhaseChange(this.getStatus());
    }
  }

  stopWorkout() {
    this.stopTimerLoop();
    this.releaseWakeLock();
    this.state = WORKOUT_STATES.IDLE;
    if (this.onPhaseChange) {
      this.onPhaseChange(this.getStatus());
    }
  }

  getStatus() {
    const currentEx = this.getCurrentExercise();
    const progressPercent = this.totalPhaseDuration > 0
      ? Math.max(0, Math.min(100, Math.round(((this.totalPhaseDuration - this.timeRemaining) / this.totalPhaseDuration) * 100)))
      : 0;

    return {
      state: this.state,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentExerciseIndex: this.currentExerciseIndex,
      totalExercises: this.exercises.length,
      currentExercise: currentEx,
      timeRemaining: this.timeRemaining,
      totalPhaseDuration: this.totalPhaseDuration,
      progressPercent,
      elapsedSeconds: this.elapsedSeconds
    };
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (_) {}
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }
}
