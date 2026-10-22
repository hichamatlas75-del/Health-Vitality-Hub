/**
 * Fasting Engine - Health & Vitality Hub
 * Calculs de temps, avancement métabolique et détection des étapes de jeûne.
 */

import { FASTING_PLANS, METABOLIC_STAGES } from './fastingData.js';

export class FastingEngine {
  static getPlan(key) {
    return FASTING_PLANS[key] || FASTING_PLANS.PLAN_16_8;
  }

  static getStatus(fastingState) {
    if (!fastingState || !fastingState.isActive || !fastingState.startTime) {
      return {
        isActive: false,
        elapsedSeconds: 0,
        elapsedHours: 0,
        elapsedFormatted: '00:00:00',
        remainingSeconds: 0,
        remainingHours: 0,
        remainingFormatted: '00:00:00',
        progressPercent: 0,
        isCompleted: false,
        currentStage: METABOLIC_STAGES[0],
        nextStage: METABOLIC_STAGES[1],
        timeUntilNextStage: '4h 00m'
      };
    }

    const now = Date.now();
    const elapsedMs = Math.max(0, now - fastingState.startTime);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedHours = elapsedSeconds / 3600;

    const plan = this.getPlan(fastingState.planKey);
    const targetHours = fastingState.targetHours || plan.fastingHours || 16;
    const targetSeconds = targetHours * 3600;

    const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    const remainingHours = remainingSeconds / 3600;

    const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
    const isCompleted = elapsedSeconds >= targetSeconds;

    // Détermination de l'étape métabolique actuelle
    let currentStage = METABOLIC_STAGES[0];
    let nextStage = METABOLIC_STAGES[1] || null;

    for (let i = METABOLIC_STAGES.length - 1; i >= 0; i--) {
      if (elapsedHours >= METABOLIC_STAGES[i].startHour) {
        currentStage = METABOLIC_STAGES[i];
        nextStage = METABOLIC_STAGES[i + 1] || null;
        break;
      }
    }

    let timeUntilNextStage = 'Max atteint';
    if (nextStage) {
      const secondsToNext = Math.max(0, Math.floor((nextStage.startHour * 3600) - elapsedSeconds));
      const hoursToNext = Math.floor(secondsToNext / 3600);
      const minsToNext = Math.floor((secondsToNext % 3600) / 60);
      timeUntilNextStage = `${hoursToNext}h ${minsToNext.toString().padStart(2, '0')}m`;
    }

    return {
      isActive: true,
      elapsedSeconds,
      elapsedHours,
      elapsedFormatted: this.formatTime(elapsedSeconds),
      remainingSeconds,
      remainingHours,
      remainingFormatted: this.formatTime(remainingSeconds),
      progressPercent,
      isCompleted,
      plan,
      targetHours,
      currentStage,
      nextStage,
      timeUntilNextStage
    };
  }

  static formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
