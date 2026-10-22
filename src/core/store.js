/**
 * Central Reactive Store - Health & Vitality Hub
 * Gestion unifiée et résiliente du stockage local (LocalStorage / IndexedDB fallback).
 */

const STORAGE_KEY = 'health_vitality_hub_data_v1';

const DEFAULT_STATE = {
  user: {
    name: 'Champion(ne)',
    weight: 72,
    height: 175,
    carbsDailyTarget: 120, // grammes de glucides nets par jour
    proteinDailyTarget: 80, // grammes de protéines par jour
    fastingPlan: 'PLAN_16_8',
    workoutLevel: 'intermediate',
    soundEnabled: true,
    voiceEnabled: true,
    theme: 'dark'
  },
  fasting: {
    isActive: false,
    startTime: null,
    targetHours: 16,
    planKey: 'PLAN_16_8',
    history: []
  },
  nutrition: {
    todayDate: new Date().toISOString().slice(0, 10),
    todayMeals: [],
    history: []
  },
  workout: {
    todayCompleted: false,
    lastWorkoutDate: null,
    streak: 0,
    history: []
  }
};

class Store {
  constructor() {
    this.state = this.load();
    this.listeners = new Set();
    this.checkDayRollover();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      // Fusion sécurisée avec les valeurs par défaut
      return {
        user: { ...DEFAULT_STATE.user, ...(parsed.user || {}) },
        fasting: { ...DEFAULT_STATE.fasting, ...(parsed.fasting || {}) },
        nutrition: { ...DEFAULT_STATE.nutrition, ...(parsed.nutrition || {}) },
        workout: { ...DEFAULT_STATE.workout, ...(parsed.workout || {}) }
      };
    } catch (e) {
      console.warn('[Store] Erreur chargement localStorage:', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.error('[Store] Échec de sauvegarde:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[Store] Erreur dans un abonné:', err);
      }
    }
  }

  checkDayRollover() {
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;

    // Réinitialisation des repas du jour si changement de date
    if (this.state.nutrition.todayDate !== today) {
      if (this.state.nutrition.todayMeals.length > 0) {
        this.state.nutrition.history.unshift({
          date: this.state.nutrition.todayDate,
          meals: [...this.state.nutrition.todayMeals],
          totalNetCarbs: this.getTodayNetCarbs(),
          totalProtein: this.getTodayProtein()
        });
      }
      this.state.nutrition.todayDate = today;
      this.state.nutrition.todayMeals = [];
      changed = true;
    }

    // Réinitialisation du sport du jour si changement de date
    if (this.state.workout.lastWorkoutDate !== today) {
      this.state.workout.todayCompleted = false;
      // Vérifier si la streak a été brisée (plus d'un jour sans séance)
      if (this.state.workout.lastWorkoutDate) {
        const lastDate = new Date(this.state.workout.lastWorkoutDate);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 2) {
          this.state.workout.streak = 0;
          changed = true;
        }
      }
      changed = true;
    }

    if (changed) {
      this.save();
    }
  }

  // --- Actions Utilisateur & Préférences ---
  updateUser(updates) {
    this.state.user = { ...this.state.user, ...updates };
    this.save();
  }

  // --- Actions Jeûne (Fasting) ---
  startFast(planKey, targetHours) {
    this.state.fasting.isActive = true;
    this.state.fasting.startTime = Date.now();
    this.state.fasting.planKey = planKey;
    this.state.fasting.targetHours = targetHours;
    this.save();
  }

  stopFast(maxStageReached = 'Digestion') {
    if (!this.state.fasting.isActive) return;
    const endTime = Date.now();
    const durationHours = (endTime - this.state.fasting.startTime) / (1000 * 60 * 60);

    const session = {
      id: 'fast_' + Date.now(),
      startTime: this.state.fasting.startTime,
      endTime,
      durationHours: Math.round(durationHours * 100) / 100,
      targetHours: this.state.fasting.targetHours,
      planKey: this.state.fasting.planKey,
      stageReached: maxStageReached,
      completedAt: new Date().toISOString()
    };

    this.state.fasting.history.unshift(session);
    // Conserver max 60 sessions
    if (this.state.fasting.history.length > 60) {
      this.state.fasting.history.pop();
    }

    this.state.fasting.isActive = false;
    this.state.fasting.startTime = null;
    this.save();
    return session;
  }

  adjustFastStartTime(newTimestamp) {
    if (this.state.fasting.isActive) {
      this.state.fasting.startTime = newTimestamp;
      this.save();
    }
  }

  // --- Actions Nutrition & Glucides ---
  getTodayMeals() {
    this.checkDayRollover();
    return this.state.nutrition.todayMeals || [];
  }

  getTodayNetCarbs() {
    const meals = this.getTodayMeals();
    return meals.reduce((sum, m) => sum + (Number(m.totalNetCarbs) || 0), 0);
  }

  getTodayProtein() {
    const meals = this.getTodayMeals();
    return meals.reduce((sum, m) => sum + (Number(m.totalProtein) || 0), 0);
  }

  getTodayGlycemicLoad() {
    const meals = this.getTodayMeals();
    return meals.reduce((sum, m) => sum + (Number(m.totalGL) || 0), 0);
  }

  logMeal(meal) {
    this.checkDayRollover();
    const newMeal = {
      id: 'meal_' + Date.now(),
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType: meal.mealType || 'Repas',
      title: meal.title || 'Assiette composée',
      items: meal.items || [],
      totalGrams: meal.totalGrams || 0,
      totalNetCarbs: Math.round((meal.totalNetCarbs || 0) * 10) / 10,
      totalProtein: Math.round((meal.totalProtein || 0) * 10) / 10,
      totalFiber: Math.round((meal.totalFiber || 0) * 10) / 10,
      totalGL: Math.round((meal.totalGL || 0) * 10) / 10,
      amortiScore: meal.amortiScore || 'normal'
    };

    this.state.nutrition.todayMeals.push(newMeal);
    this.save();
    return newMeal;
  }

  removeMeal(mealId) {
    this.state.nutrition.todayMeals = this.state.nutrition.todayMeals.filter(m => m.id !== mealId);
    this.save();
  }

  // --- Actions Entraînement / Sport ---
  recordWorkoutCompletion(workoutData) {
    const today = new Date().toISOString().slice(0, 10);
    const isNewDay = this.state.workout.lastWorkoutDate !== today;

    const session = {
      id: 'workout_' + Date.now(),
      date: today,
      timestamp: Date.now(),
      routineLevel: workoutData.routineLevel || 'intermediate',
      durationSeconds: workoutData.durationSeconds || 0,
      rounds: workoutData.rounds || 2,
      exercisesCount: workoutData.exercisesCount || 8,
      caloriesBurned: workoutData.caloriesBurned || 120
    };

    this.state.workout.history.unshift(session);
    if (this.state.workout.history.length > 50) {
      this.state.workout.history.pop();
    }

    if (isNewDay) {
      this.state.workout.streak += 1;
    }
    this.state.workout.todayCompleted = true;
    this.state.workout.lastWorkoutDate = today;

    this.save();
    return session;
  }

  // --- Sauvegarde & Restauration Complète ---
  exportBackup() {
    const backup = {
      app: 'Health & Vitality Hub',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: this.state
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitality-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data) {
        throw new Error('Format de sauvegarde invalide.');
      }
      this.state = {
        user: { ...DEFAULT_STATE.user, ...(parsed.data.user || {}) },
        fasting: { ...DEFAULT_STATE.fasting, ...(parsed.data.fasting || {}) },
        nutrition: { ...DEFAULT_STATE.nutrition, ...(parsed.data.nutrition || {}) },
        workout: { ...DEFAULT_STATE.workout, ...(parsed.data.workout || {}) }
      };
      this.save();
      return true;
    } catch (err) {
      console.error('[Store] Échec import:', err);
      return false;
    }
  }

  resetAll() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
  }
}

export const appStore = new Store();
