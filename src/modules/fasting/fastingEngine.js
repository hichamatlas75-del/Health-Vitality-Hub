/**
 * Fasting Engine - Health & Vitality Hub
 * Calculs de temps, avancement métabolique et détection des étapes de jeûne.
 * Support complet du protocole 18/6 automatique : Début automatique à 15h00 jusqu'à 09h00.
 */

import { FASTING_PLANS, METABOLIC_STAGES } from './fastingData.js';

export class FastingEngine {
  static getPlan(key) {
    return FASTING_PLANS[key] || FASTING_PLANS.PLAN_18_6;
  }

  static getStatus(fastingState) {
    const planKey = fastingState?.planKey || 'PLAN_18_6';
    const plan = this.getPlan(planKey);
    const isAutoSchedule = fastingState?.autoSchedule !== false && planKey === 'PLAN_18_6';

    const now = new Date();

    // --- MODE AUTOMATIQUE 18/6 (15h00 -> 09h00) ---
    if (isAutoSchedule) {
      const curHour = now.getHours();
      const isFastingHours = (curHour >= 15 || curHour < 9);

      if (isFastingHours) {
        // En période de jeûne (15h00 -> 09h00)
        let startTime = new Date(now);
        startTime.setHours(15, 0, 0, 0);
        if (curHour < 9) {
          // Si on est entre minuit et 9h du matin, le jeûne a commencé hier à 15h
          startTime.setDate(startTime.getDate() - 1);
        }

        let targetEndTime = new Date(startTime);
        targetEndTime.setTime(startTime.getTime() + (18 * 3600 * 1000)); // +18h = 09h00 le lendemain

        const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const elapsedHours = elapsedSeconds / 3600;

        const targetSeconds = 18 * 3600;
        const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
        const remainingHours = remainingSeconds / 3600;

        const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
        const isCompleted = elapsedSeconds >= targetSeconds;

        const { currentStage, nextStage, timeUntilNextStage } = this.calculateStages(elapsedHours, elapsedSeconds);

        return {
          isActive: true,
          isAuto: true,
          phase: 'fasting', // 'fasting'
          plan,
          targetHours: 18,
          startTime: startTime.getTime(),
          targetEndTime: targetEndTime.getTime(),
          elapsedSeconds,
          elapsedHours,
          elapsedFormatted: this.formatTime(elapsedSeconds),
          remainingSeconds,
          remainingHours,
          remainingFormatted: this.formatTime(remainingSeconds),
          progressPercent,
          isCompleted,
          currentStage,
          nextStage,
          timeUntilNextStage,
          bannerText: 'Jeûne 18/6 en cours (Auto 15h00 - 09h00)',
          phaseDesc: 'Période de jeûne actif. Prochaine rupture du jeûne à 09h00 du matin.'
        };
      } else {
        // En période alimentaire (09h00 -> 15h00 = 6h de repas)
        let startTime = new Date(now);
        startTime.setHours(9, 0, 0, 0);

        let nextFastTime = new Date(now);
        nextFastTime.setHours(15, 0, 0, 0);

        const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const totalEatingSeconds = 6 * 3600;

        const remainingSeconds = Math.max(0, Math.floor((nextFastTime.getTime() - now.getTime()) / 1000));
        const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalEatingSeconds) * 100));

        return {
          isActive: false,
          isAuto: true,
          phase: 'eating', // 'eating'
          plan,
          targetHours: 6,
          startTime: startTime.getTime(),
          targetEndTime: nextFastTime.getTime(),
          elapsedSeconds,
          elapsedHours: elapsedSeconds / 3600,
          elapsedFormatted: this.formatTime(elapsedSeconds),
          remainingSeconds,
          remainingHours: remainingSeconds / 3600,
          remainingFormatted: this.formatTime(remainingSeconds),
          progressPercent,
          isCompleted: false,
          currentStage: {
            id: 0,
            name: 'Fenêtre Alimentaire',
            emoji: '🥗',
            color: '#10B981',
            shortDesc: 'Repas et hydratation autorisés',
            tip: 'Prenez vos repas sains et nutritifs (09h - 15h) avant le début automatique du jeûne à 15h00.'
          },
          nextStage: METABOLIC_STAGES[0],
          timeUntilNextStage: this.formatTime(remainingSeconds),
          bannerText: 'Fenêtre Alimentaire Active (09h00 - 15h00)',
          phaseDesc: `Prochain jeûne automatique de 18h à 15h00 (dans ${this.formatTime(remainingSeconds)}).`
        };
      }
    }

    // --- MODE MANUEL CLASSIC ---
    if (!fastingState || !fastingState.isActive || !fastingState.startTime) {
      return {
        isActive: false,
        isAuto: false,
        phase: 'idle',
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
        timeUntilNextStage: '4h 00m',
        bannerText: 'Prêt à démarrer',
        phaseDesc: 'Démarrez votre chrono à la fin de votre repas.'
      };
    }

    const elapsedMs = Math.max(0, Date.now() - fastingState.startTime);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedHours = elapsedSeconds / 3600;

    const targetHours = fastingState.targetHours || plan.fastingHours || 18;
    const targetSeconds = targetHours * 3600;

    const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    const remainingHours = remainingSeconds / 3600;

    const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
    const isCompleted = elapsedSeconds >= targetSeconds;

    const { currentStage, nextStage, timeUntilNextStage } = this.calculateStages(elapsedHours, elapsedSeconds);

    return {
      isActive: true,
      isAuto: false,
      phase: 'fasting',
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
      timeUntilNextStage,
      bannerText: `Jeûne ${plan.name} en cours`,
      phaseDesc: `Objectif : ${targetHours}h (${this.formatTime(remainingSeconds)} restant)`
    };
  }

  static calculateStages(elapsedHours, elapsedSeconds) {
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

    return { currentStage, nextStage, timeUntilNextStage };
  }

  static formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
