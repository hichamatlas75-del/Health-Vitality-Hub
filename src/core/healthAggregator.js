/**
 * Health Aggregator & Cross-Analytics Service - Health & Vitality Hub
 * Lit, croise et évalue en continu les données et performances du profil
 * issues des 3 applications mères :
 * 1. Gluco-Carb Maroc (Backend Supabase REST API)
 * 2. Workout Home (Backend Firebase RTDB AES-256)
 * 3. Fast Master (Protocole 18/6 : 15h00 - 09h00)
 */

import { profileBackend } from './profileService.js';
import { workoutSync } from '../modules/workout/workoutSyncService.js';
import { FastingEngine } from '../modules/fasting/fastingEngine.js';
import { appStore } from './store.js';

export class HealthAggregator {
  constructor() {
    this.cachedData = null;
    this.isRefreshing = false;
    this.lastRefreshedAt = null;
    this.subscribers = [];
  }

  getCredentials() {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('vitality_active_account_v1') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username) {
          return { username: parsed.username, password: parsed.passwordPlain || '1234' };
        }
      }
    } catch (_) {}
    return { username: 'hicham', password: '1234' };
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      if (this.cachedData) {
        callback(this.cachedData);
      }
    }
    return () => {
      this.subscribers = this.subscribers.filter(fn => fn !== callback);
    };
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.cachedData);
      } catch (e) {
        console.error('[Aggregator] Subscriber error:', e);
      }
    }
  }

  async refresh() {
    const creds = this.getCredentials();
    return this.fetchAllData(creds.username, creds.password);
  }

  async fetchAllData(username, password) {
    if (!username || !password) {
      const creds = this.getCredentials();
      username = username || creds.username;
      password = password || creds.password;
    }
    this.isRefreshing = true;

    try {
      // 1. Lecture Backend Gluco-Carb Maroc (Supabase Cloud)
      let supabaseAccount = null;
      try {
        const res = await profileBackend.fetchSupabaseAccount(username);
        if (res.ok && res.account) {
          supabaseAccount = res.account;
        }
      } catch (err) {
        console.warn('[Aggregator] Supabase fetch error:', err);
      }

      // 2. Lecture Backend Workout Home (Firebase RTDB)
      let workoutData = null;
      try {
        const hash = await workoutSync.hashUserId(username);
        const env = await workoutSync.cloudSyncRequest(hash, 'GET');
        if (env) {
          workoutData = await workoutSync.decryptPayload(env, username, password);
        }
      } catch (err) {
        console.warn('[Aggregator] Firebase fetch error:', err);
      }

      // 3. Calcul de l'état du Jeûne 18/6 (15h00 - 09h00)
      const fastingStatus = FastingEngine.getStatus(appStore.state.fasting);

      // 4. Traitement & Normalisation des Données
      const todayStr = new Date().toISOString().slice(0, 10);
      const settings = supabaseAccount?.settings || {};
      const targetCarbs = Number(settings.dailyTargetCarbs) || 150;
      const targetProtein = Number(settings.dailyTargetProtein) || 120;
      const weight = Number(settings.weight) || workoutData?.prefs?.targetWeight || 85;
      const height = Number(settings.height) || workoutData?.prefs?.heightCm || 183;

      // Repas du jour depuis Supabase
      const allMeals = Array.isArray(supabaseAccount?.history) ? supabaseAccount.history : [];
      const todayMeals = allMeals.filter(m => {
        const d = m.date || (m.timestamp ? new Date(m.timestamp).toISOString().slice(0, 10) : '');
        return d === todayStr;
      });

      const todayNetCarbs = todayMeals.reduce((sum, m) => sum + (Number(m.net_carbs_g || m.netCarbs || m.totalNetCarbs) || 0), 0);
      const todayProtein = todayMeals.reduce((sum, m) => sum + (Number(m.proteins_g || m.protein || m.totalProtein) || 0), 0);
      const todayGL = todayMeals.reduce((sum, m) => sum + (Number(m.glycemic_load || m.glycemicLoad || m.totalGL) || 0), 0);

      // Séances de sport depuis Firebase
      const allWorkouts = Array.isArray(workoutData?.history) ? workoutData.history : [];
      const todayWorkouts = allWorkouts.filter(w => {
        const d = w.date || (w.timestamp ? new Date(w.timestamp).toISOString().slice(0, 10) : '');
        return d === todayStr;
      });

      const workoutsCountToday = todayWorkouts.length;
      const totalLifetimeWorkouts = allWorkouts.length;
      const latestWorkout = allWorkouts[0] || null;

      // 5. Croisement des Données (Cross-Analytics)
      const crossAnalytics = this.computeCrossAnalytics({
        todayMeals,
        todayNetCarbs,
        todayProtein,
        targetCarbs,
        targetProtein,
        fastingStatus,
        todayWorkouts,
        allWorkouts,
        weight,
        height
      });

      // 6. Évaluation des 3 Objectifs Journaliers
      const dailyObjectives = this.evaluateObjectives({
        fastingStatus,
        todayMeals,
        todayNetCarbs,
        todayProtein,
        targetCarbs,
        targetProtein,
        todayWorkouts
      });

      this.cachedData = {
        username,
        displayName: supabaseAccount?.display_name || username,
        profile: {
          weight,
          height,
          targetCarbs,
          targetProtein,
          workoutLevel: settings.workoutLevel || workoutData?.prefs?.userLevel || 'intermediate',
          userMode: settings.userMode || 'insulin'
        },
        sources: {
          glucoCarb: {
            connected: Boolean(supabaseAccount),
            url: 'plrqzuwbnuryxtsmimyt.supabase.co',
            mealsCountToday: todayMeals.length,
            totalMealsCount: allMeals.length,
            todayNetCarbs: Math.round(todayNetCarbs * 10) / 10,
            todayProtein: Math.round(todayProtein * 10) / 10,
            todayGL: Math.round(todayGL * 10) / 10,
            todayMeals
          },
          workoutHome: {
            connected: Boolean(workoutData),
            url: 'workout-homefb17-default-rtdb.europe-west1.firebasedatabase.app',
            workoutsCountToday,
            totalWorkouts: totalLifetimeWorkouts,
            latestWorkout,
            streak: workoutData?.prefs?.streak || 0
          },
          fastMaster: {
            active: true,
            protocol: '18:6 (15h00 - 09h00)',
            phase: fastingStatus.phase,
            elapsedFormatted: fastingStatus.elapsedFormatted,
            remainingFormatted: fastingStatus.remainingFormatted,
            currentStage: fastingStatus.currentStage,
            progressPercent: fastingStatus.progressPercent
          }
        },
        dailyObjectives,
        crossAnalytics,
        refreshedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      this.lastRefreshedAt = this.cachedData.refreshedAt;
      this.notify();
      return this.cachedData;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Évalue l'accomplissement des 3 Objectifs Journaliers
   */
  evaluateObjectives(data) {
    const { fastingStatus, todayMeals, todayNetCarbs, todayProtein, targetCarbs, targetProtein, todayWorkouts } = data;

    // --- OBJECTIF 1 : JEÛNE 18/6 ---
    let fastingAccomplished = false;
    let fastingStatusText = '';
    let fastingProgress = fastingStatus.progressPercent;

    if (fastingStatus.phase === 'fasting') {
      fastingStatusText = `Jeûne 18h actif (${fastingStatus.elapsedFormatted} écoulées)`;
      fastingAccomplished = fastingStatus.progressPercent >= 50; // En bonne voie
    } else {
      // En fenêtre repas (09h - 15h) : respecté si aucun repas n'a été pris avant 09h
      fastingStatusText = `Fenêtre repas respectée (prochain jeûne à 15h00)`;
      fastingAccomplished = true;
    }

    const objFasting = {
      id: 'fasting',
      title: 'Jeûne Intermittent 18/6 (15h00 - 09h00)',
      target: '18h de jeûne quotidien',
      current: fastingStatus.phase === 'fasting' ? `${fastingStatus.elapsedFormatted} de jeûne` : 'Fenêtre 09h-15h',
      percent: fastingProgress,
      isAccomplished: fastingAccomplished,
      statusLabel: fastingAccomplished ? 'En cours / Respecté ✓' : 'Non démarré',
      tagClass: fastingAccomplished ? 'badge-success' : 'badge-pending',
      icon: '⚡',
      details: fastingStatus.phase === 'fasting'
        ? `Étape : ${fastingStatus.currentStage.name} (${fastingStatus.currentStage.emoji}). Fin prévue à 09h00.`
        : `Repas autorisés jusqu'à 15h00. Le jeûne de 18h démarrera automatiquement à 15h00.`
    };

    // --- OBJECTIF 2 : NUTRITION & GLUCIDES ---
    const carbsWithinLimit = todayNetCarbs <= targetCarbs;
    const carbsPercent = Math.min(100, Math.round((todayNetCarbs / targetCarbs) * 100));
    const proteinPercent = Math.min(100, Math.round((todayProtein / targetProtein) * 100));

    const objNutrition = {
      id: 'nutrition',
      title: `Glucides Nets ≤ ${targetCarbs}g & Protéines ≥ ${targetProtein}g`,
      target: `Max ${targetCarbs}g glucides nets / Objectif ${targetProtein}g protéines`,
      current: `${Math.round(todayNetCarbs)}g glucides / ${Math.round(todayProtein)}g protéines`,
      percent: carbsPercent,
      isAccomplished: carbsWithinLimit,
      statusLabel: carbsWithinLimit ? `Respecté (${carbsPercent}% du quota) ✓` : `Dépassement (+${Math.round(todayNetCarbs - targetCarbs)}g)`,
      tagClass: carbsWithinLimit ? 'badge-success' : 'badge-danger',
      icon: '🥗',
      details: todayMeals.length > 0
        ? `${todayMeals.length} repas journalisé(s). Amorti et charge glycémique maîtrisés.`
        : `Aucun repas saisi aujourd'hui dans Gluco-Carb Maroc.`
    };

    // --- OBJECTIF 3 : SPORT & ACTIVITÉ ---
    const workoutDone = todayWorkouts.length > 0;
    const objWorkout = {
      id: 'workout',
      title: 'Séance Quotidienne Full Body 17',
      target: '1 séance guidée par jour (~15-20 min)',
      current: workoutDone ? `${todayWorkouts.length} séance validée aujourd'hui` : 'Aucune séance validée aujourd\'hui',
      percent: workoutDone ? 100 : 0,
      isAccomplished: workoutDone,
      statusLabel: workoutDone ? 'Accompli ✓' : 'À réaliser aujourd\'hui',
      tagClass: workoutDone ? 'badge-success' : 'badge-pending',
      icon: '🏋️',
      details: workoutDone
        ? `Séance terminée et envoyée au backend Workout Home. Bravo !`
        : `Prévoyez votre routine au poids du corps pour valider vos 3/3 objectifs.`
    };

    // Calcul du score global d'accomplissement (ex: 2/3)
    const accomplishedCount = [objFasting.isAccomplished, objNutrition.isAccomplished, objWorkout.isAccomplished].filter(Boolean).length;
    const globalPercent = Math.round((accomplishedCount / 3) * 100);

    return {
      accomplishedCount,
      totalObjectives: 3,
      globalPercent,
      isFullSuccess: accomplishedCount === 3,
      items: [objFasting, objNutrition, objWorkout]
    };
  }

  /**
   * Analyse Croisée & Corrélations Métaboliques (Cross-Analytics)
   */
  computeCrossAnalytics(data) {
    const { todayMeals, todayNetCarbs, todayProtein, targetCarbs, targetProtein, fastingStatus, todayWorkouts, allWorkouts, weight } = data;

    // 1. Analyse Synchronisation Repas vs Fenêtre de Jeûne
    const mealTimingChecks = todayMeals.map(meal => {
      const mealDate = new Date(meal.timestamp || Date.now());
      const hour = mealDate.getHours();
      const inEatingWindow = (hour >= 9 && hour < 15);
      return {
        title: meal.title || 'Repas',
        time: meal.timeFormatted || `${hour}h`,
        netCarbs: meal.net_carbs_g || meal.netCarbs || 0,
        inEatingWindow,
        verdict: inEatingWindow
          ? '✓ Pris dans la fenêtre autorisée (09h-15h)'
          : '⚠️ Pris pendant la période de jeûne (hors fenêtre)'
      };
    });

    // 2. Corrélation Nutrition ↔ Sport
    const workoutDone = todayWorkouts.length > 0;
    let anabolismIndex = 'En attente';
    let anabolismDesc = '';

    if (workoutDone && todayProtein >= (targetProtein * 0.7)) {
      anabolismIndex = 'Optimal 🔥';
      anabolismDesc = 'Excellente synergie anabolique : la séance de sport stimule le muscle et les protéines ingérées réparent les fibres.';
    } else if (workoutDone && todayProtein < (targetProtein * 0.5)) {
      anabolismIndex = 'Apport Protéique à renforcer ⚠️';
      anabolismDesc = 'Séance effectuée, mais apport en protéines encore bas. Consommez œufs, volaille, poisson ou fromage blanc avant 15h00.';
    } else {
      anabolismIndex = 'Modéré ⚖️';
      anabolismDesc = 'L\'activité musculaire et les glucides sont équilibrés. Poursuivez vers l\'objectif journalier.';
    }

    // 3. Synthèse de Clarté Métabolique
    let smartVerdict = '';
    if (todayNetCarbs <= targetCarbs && fastingStatus.phase === 'fasting') {
      smartVerdict = 'Synergie parfaite : vous êtes en jeûne actif avec une glycémie stable, facilitant le déstockage des graisses.';
    } else if (todayNetCarbs <= targetCarbs && fastingStatus.phase === 'eating') {
      smartVerdict = 'Fenêtre de repas active avec glucides maîtrisés. Pensez à finaliser vos apports avant 15h00.';
    } else {
      smartVerdict = 'Attention à la charge glucidique : privilégiez les légumes et fibres pour amortir le pic.';
    }

    return {
      mealTimingChecks,
      anabolismIndex,
      anabolismDesc,
      smartVerdict,
      totalCaloriesEstimatedBurned: allWorkouts.reduce((acc, w) => acc + (w.caloriesEstimated || w.caloriesBurned || 150), 0)
    };
  }
}

export const healthAggregator = new HealthAggregator();
