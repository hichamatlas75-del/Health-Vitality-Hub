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
      const targetProtein = Number(settings.dailyTargetProtein) || 150; // Protocole 85 kg (18-6)
      const targetFat = Number(settings.dailyTargetFat) || 80; // 80g lipides
      const targetCalories = Number(settings.dailyTargetCalories) || 1950; // ~1920 - 2000 kcal
      const weight = Number(settings.weight || settings.userWeight) || workoutData?.prefs?.targetWeight || 85;
      const height = Number(settings.height) || workoutData?.prefs?.heightCm || 183;

      // Repas du jour depuis Supabase (avec fallback local résilient en mode hors-ligne)
      let allMeals = Array.isArray(supabaseAccount?.history) ? supabaseAccount.history : [];
      if (allMeals.length === 0 && appStore.state?.nutrition) {
        const localTodayMeals = appStore.getTodayMeals ? appStore.getTodayMeals() : (appStore.state.nutrition.todayMeals || []);
        const localHistory = (appStore.state.nutrition.history || []).flatMap(h => h.meals || []);
        allMeals = [...localTodayMeals, ...localHistory];
      }
      const todayMeals = allMeals.filter(m => {
        const d = m.date || (m.timestamp ? new Date(m.timestamp).toISOString().slice(0, 10) : '');
        return d === todayStr;
      });

      const todayNetCarbs = todayMeals.reduce((sum, m) => sum + (Number(m.net_carbs_g || m.netCarbs || m.totalNetCarbs) || 0), 0);
      const todayProtein = todayMeals.reduce((sum, m) => sum + (Number(m.proteins_g || m.protein || m.totalProtein) || 0), 0);
      const todayFat = todayMeals.reduce((sum, m) => sum + (Number(m.fat_g || m.fat || m.totalFat || m.lipides) || 0), 0);
      const todayCalories = todayMeals.reduce((sum, m) => {
        const cal = Number(m.calories || m.kcal || m.totalCalories);
        if (cal > 0) return sum + cal;
        const c = Number(m.net_carbs_g || m.netCarbs || m.totalNetCarbs || 0);
        const p = Number(m.proteins_g || m.protein || m.totalProtein || 0);
        const f = Number(m.fat_g || m.fat || m.totalFat || m.lipides || 0);
        return sum + Math.round(p * 4 + c * 4 + f * 9);
      }, 0);
      const todayGL = todayMeals.reduce((sum, m) => sum + (Number(m.glycemic_load || m.glycemicLoad || m.totalGL) || 0), 0);

      // Repas 1 (10h00 - 40%) et Repas 2 (15h00 - 60%)
      const meal1 = todayMeals.find(m => {
        const h = new Date(m.timestamp || (m.date + 'T10:00:00')).getHours();
        return (m.slot === 'morning' || h < 12);
      }) || null;

      const meal2 = todayMeals.find(m => {
        const h = new Date(m.timestamp || (m.date + 'T15:00:00')).getHours();
        return (m.slot === 'noon' || (h >= 12 && h < 16));
      }) || null;

      const protocol186 = {
        targets: {
          weight,
          caloriesMin: 1920,
          caloriesMax: 2000,
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat
        },
        repas1: {
          slotName: 'Repas 1 (10h00) - Rupture du Jeûne [40%]',
          time: '10h00',
          percent: 40,
          targetCalories: 770,
          targetProtein: 60,
          targetCarbs: 60,
          targetFat: 32,
          actual: meal1 ? {
            logged: true,
            title: meal1.title || 'Rupture 10h',
            calories: Math.round(Number(meal1.calories || meal1.kcal || meal1.totalCalories || ((Number(meal1.proteins_g || meal1.protein || 0)*4) + (Number(meal1.net_carbs_g || meal1.netCarbs || 0)*4) + (Number(meal1.fat_g || meal1.fat || 0)*9)))),
            protein: Math.round(Number(meal1.proteins_g || meal1.protein || meal1.totalProtein || 0) * 10) / 10,
            carbs: Math.round(Number(meal1.net_carbs_g || meal1.netCarbs || meal1.totalNetCarbs || 0) * 10) / 10,
            fat: Math.round(Number(meal1.fat_g || meal1.fat || meal1.totalFat || meal1.lipides || 0) * 10) / 10,
            timeFormatted: meal1.timeFormatted || '10:00'
          } : {
            logged: false,
            title: 'En attente',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            timeFormatted: '--'
          }
        },
        repas2: {
          slotName: 'Repas 2 (15h00) - Clôture du Jeûne [60%]',
          time: '15h00',
          percent: 60,
          targetCalories: 1150,
          targetProtein: 90,
          targetCarbs: 90,
          targetFat: 48,
          actual: meal2 ? {
            logged: true,
            title: meal2.title || 'Clôture 15h',
            calories: Math.round(Number(meal2.calories || meal2.kcal || meal2.totalCalories || ((Number(meal2.proteins_g || meal2.protein || 0)*4) + (Number(meal2.net_carbs_g || meal2.netCarbs || 0)*4) + (Number(meal2.fat_g || meal2.fat || 0)*9)))),
            protein: Math.round(Number(meal2.proteins_g || meal2.protein || meal2.totalProtein || 0) * 10) / 10,
            carbs: Math.round(Number(meal2.net_carbs_g || meal2.netCarbs || meal2.totalNetCarbs || 0) * 10) / 10,
            fat: Math.round(Number(meal2.fat_g || meal2.fat || meal2.totalFat || meal2.lipides || 0) * 10) / 10,
            timeFormatted: meal2.timeFormatted || '15:00'
          } : {
            logged: false,
            title: 'En attente',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            timeFormatted: '--'
          }
        }
      };

      // Séances de sport depuis Firebase (avec fallback local résilient en mode hors-ligne)
      let allWorkouts = Array.isArray(workoutData?.history) ? workoutData.history : [];
      if (allWorkouts.length === 0 && Array.isArray(appStore.state?.workout?.history)) {
        allWorkouts = appStore.state.workout.history;
      }
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
        todayFat,
        todayCalories,
        targetCarbs,
        targetProtein,
        targetFat,
        targetCalories,
        protocol186,
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
        todayFat,
        todayCalories,
        targetCarbs,
        targetProtein,
        targetFat,
        targetCalories,
        protocol186,
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
          targetFat,
          targetCalories,
          workoutLevel: settings.workoutLevel || workoutData?.prefs?.userLevel || 'intermediate',
          userMode: settings.userMode || 'sport'
        },
        sources: {
          glucoCarb: {
            connected: Boolean(supabaseAccount),
            url: 'plrqzuwbnuryxtsmimyt.supabase.co',
            mealsCountToday: todayMeals.length,
            totalMealsCount: allMeals.length,
            todayNetCarbs: Math.round(todayNetCarbs * 10) / 10,
            todayProtein: Math.round(todayProtein * 10) / 10,
            todayFat: Math.round(todayFat * 10) / 10,
            todayCalories: Math.round(todayCalories),
            todayGL: Math.round(todayGL * 10) / 10,
            protocol186,
            todayMeals,
            allMeals
          },
          workoutHome: {
            connected: Boolean(workoutData),
            url: 'workout-homefb17-default-rtdb.europe-west1.firebasedatabase.app',
            workoutsCountToday,
            totalWorkouts: totalLifetimeWorkouts,
            latestWorkout,
            allWorkouts,
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
        protocol186,
        multiAppHistory: this.computeMultiAppHistory({
          allMeals,
          allWorkouts,
          fastingStatus,
          targetCarbs,
          targetProtein,
          targetFat,
          targetCalories
        }),
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
    const { fastingStatus, todayMeals, todayNetCarbs, todayProtein, todayFat, todayCalories, targetCarbs, targetProtein, targetFat, targetCalories, protocol186, todayWorkouts } = data;

    // --- OBJECTIF 1 : JEÛNE 18/6 ---
    // Dès le début du chrono de jeûne (15h00), la case est immédiatement marquée ACCOMPLI ✓
    let fastingAccomplished = true;
    let fastingStatusText = '';
    let fastingProgress = fastingStatus.progressPercent;

    if (fastingStatus.phase === 'fasting') {
      fastingStatusText = `Jeûne 18h actif (${fastingStatus.elapsedFormatted} écoulées)`;
      fastingAccomplished = true; // Dès le début du chrono de jeûne, marqué accompli
    } else {
      // En fenêtre repas (09h - 15h)
      fastingStatusText = `Fenêtre repas (prochain jeûne à 15h00)`;
      fastingAccomplished = true;
    }

    const objFasting = {
      id: 'fasting',
      title: 'Jeûne Intermittent 18/6 (15h00 - 09h00)',
      target: '18h de jeûne quotidien',
      current: fastingStatus.phase === 'fasting' ? `Chrono actif : ${fastingStatus.elapsedFormatted} de jeûne` : 'Fenêtre 09h-15h',
      percent: fastingProgress,
      isAccomplished: fastingAccomplished,
      statusLabel: 'Accompli ✓',
      tagClass: 'badge-success',
      icon: '⚡',
      details: fastingStatus.phase === 'fasting'
        ? `Chrono de jeûne 18h démarré et validé ! Étape : ${fastingStatus.currentStage.name} (${fastingStatus.currentStage.emoji}). Fin prévue à 09h00.`
        : `Fenêtre de repas active (09h00 - 15h00). Le chrono de 18h démarrera automatiquement à 15h00.`
    };

    // --- OBJECTIF 2 : NUTRITION & MACROS 85 KG (18/6) ---
    const carbsWithinLimit = todayNetCarbs <= targetCarbs;
    const carbsPercent = Math.min(100, Math.round((todayNetCarbs / targetCarbs) * 100));
    const proteinPercent = Math.min(100, Math.round((todayProtein / targetProtein) * 100));
    const fatPercent = Math.min(100, Math.round((todayFat / targetFat) * 100));
    const calPercent = Math.min(100, Math.round((todayCalories / targetCalories) * 100));

    const objNutrition = {
      id: 'nutrition',
      title: `Protocole 85 kg (18-6) : 150g P • 150g G • 80g L (~1920-2000 kcal)`,
      target: `150g protéines • Max 150g glucides nets • 80g lipides (~1950 kcal)`,
      current: `${Math.round(todayCalories)} kcal • ${Math.round(todayProtein)}g P • ${Math.round(todayNetCarbs)}g G • ${Math.round(todayFat)}g L`,
      percent: carbsPercent,
      isAccomplished: carbsWithinLimit,
      statusLabel: carbsWithinLimit ? `Conforme (${carbsPercent}% glucides) ✓` : `Dépassement (+${Math.round(todayNetCarbs - targetCarbs)}g)`,
      tagClass: carbsWithinLimit ? 'badge-success' : 'badge-danger',
      icon: '🥗',
      details: todayMeals.length > 0
        ? `${todayMeals.length} repas journalisé(s). Répartition 18/6 : Repas 1 (10h00 [40%]) & Repas 2 (15h00 [60%]).`
        : `Aucun repas saisi aujourd'hui dans Gluco-Carb Maroc.`,
      macros: {
        calories: { current: Math.round(todayCalories), target: targetCalories, percent: calPercent, range: '1920-2000 kcal' },
        protein: { current: Math.round(todayProtein), target: targetProtein, percent: proteinPercent, targetStr: '150g' },
        carbs: { current: Math.round(todayNetCarbs), target: targetCarbs, percent: carbsPercent, targetStr: '≤ 150g' },
        fat: { current: Math.round(todayFat), target: targetFat, percent: fatPercent, targetStr: '80g' }
      },
      protocol186
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
    const { todayMeals, todayNetCarbs, todayProtein, todayFat = 0, todayCalories = 0, targetCarbs, targetProtein, targetFat = 80, targetCalories = 1950, protocol186, fastingStatus, todayWorkouts, allWorkouts, weight } = data;

    // 1. Analyse Synchronisation Repas vs Fenêtre de Jeûne
    const mealTimingChecks = todayMeals.map(meal => {
      const mealDate = new Date(meal.timestamp || Date.now());
      const hour = mealDate.getHours();
      const inEatingWindow = (hour >= 9 && hour < 15);
      return {
        title: meal.title || 'Repas',
        time: meal.timeFormatted || `${hour}h`,
        netCarbs: meal.net_carbs_g || meal.netCarbs || 0,
        protein: meal.proteins_g || meal.protein || 0,
        fat: meal.fat_g || meal.fat || 0,
        calories: meal.calories || meal.kcal || 0,
        inEatingWindow,
        verdict: inEatingWindow
          ? '✓ Pris dans la fenêtre autorisée (09h-15h)'
          : '⚠️ Pris pendant la période de jeûne (hors fenêtre)'
      };
    });

    // 2. Analyse de la Répartition des 2 Repas (10h00 [40%] & 15h00 [60%])
    const r1 = protocol186?.repas1;
    const r2 = protocol186?.repas2;
    const mealSplitAnalysis = {
      repas1: {
        title: 'Repas 1 (10h00) - Rupture du Jeûne [40%]',
        timeTarget: '10h00 (09h-12h)',
        targets: { calories: 770, protein: 60, carbs: 60, fat: 32, percent: 40 },
        actual: r1?.actual || { logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
        status: r1?.actual?.logged ? 'Journalisé ✓' : 'En attente'
      },
      repas2: {
        title: 'Repas 2 (15h00) - Clôture du Jeûne [60%]',
        timeTarget: '15h00 (13h-15h)',
        targets: { calories: 1150, protein: 90, carbs: 90, fat: 48, percent: 60 },
        actual: r2?.actual || { logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
        status: r2?.actual?.logged ? 'Journalisé ✓' : 'En attente'
      },
      totalCaloriesLogged: todayCalories,
      calorieBalanceVerdict: todayCalories > 0
        ? `${Math.round(todayCalories)} kcal consommées sur l'objectif ~1920-2000 kcal.`
        : 'Préparez votre repas de rupture (10h00) ou de clôture (15h00).'
    };

    // 3. Corrélation Nutrition ↔ Sport
    const workoutDone = todayWorkouts.length > 0;
    let anabolismIndex = 'En attente';
    let anabolismDesc = '';

    if (workoutDone && todayProtein >= (targetProtein * 0.7)) {
      anabolismIndex = 'Optimal 🔥';
      anabolismDesc = `Excellente synergie anabolique : la séance de sport stimule le muscle et les ${Math.round(todayProtein)}g de protéines (cible ${targetProtein}g) saturent la voie mTOR pour la réparation musculaire.`;
    } else if (workoutDone && todayProtein < (targetProtein * 0.5)) {
      anabolismIndex = 'Apport Protéique à renforcer ⚠️';
      anabolismDesc = `Séance effectuée, mais apport protéique actuel (${Math.round(todayProtein)}g) encore en-dessous de l'objectif ${targetProtein}g. Privilégiez 60g au repas 1 (10h) et 90g au repas 2 (15h).`;
    } else {
      anabolismIndex = 'Modéré ⚖️';
      anabolismDesc = `Activité musculaire et apports équilibrés. Cible globale : 150g protéines, 150g glucides, 80g lipides (~1920-2000 kcal).`;
    }

    // 4. Synthèse de Clarté Métabolique
    let smartVerdict = '';
    if (todayNetCarbs <= targetCarbs && fastingStatus.phase === 'fasting') {
      smartVerdict = 'Synergie parfaite : vous êtes en jeûne actif 18h avec glycémie basse et stable, maximisant l\'oxydation des graisses et l\'autophagie.';
    } else if (todayNetCarbs <= targetCarbs && fastingStatus.phase === 'eating') {
      smartVerdict = `Fenêtre repas active (09h-15h) avec glucides sous le plafond (${Math.round(todayNetCarbs)} / ${targetCarbs}g). Respectez le ratio 40% (10h) / 60% (15h).`;
    } else {
      smartVerdict = `Attention au plafond glucidique (${Math.round(todayNetCarbs)} / ${targetCarbs}g). Privilégiez légumes et fibres pour amortir le pic.`;
    }

    return {
      mealTimingChecks,
      mealSplitAnalysis,
      anabolismIndex,
      anabolismDesc,
      smartVerdict,
      totalCaloriesEstimatedBurned: allWorkouts.reduce((acc, w) => acc + (w.caloriesEstimated || w.caloriesBurned || 150), 0)
    };
  }

  /**
   * Compilation de l'historique complet des 3 applications pour les Courbes & le Diaporama
   */
  computeMultiAppHistory(data) {
    const { allMeals = [], allWorkouts = [], targetCarbs = 150, targetProtein = 150, targetFat = 80, targetCalories = 1950 } = data;

    // 1. Normalisation des repas (Gluco-Carb Maroc)
    const formattedMeals = allMeals.map((m, idx) => {
      const ts = m.timestamp ? new Date(m.timestamp) : (m.date ? new Date(m.date) : new Date());
      const dateStr = ts.toISOString().slice(0, 10);
      const timeStr = ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const carbs = Math.round((Number(m.net_carbs_g || m.netCarbs || m.totalNetCarbs) || 0) * 10) / 10;
      const protein = Math.round((Number(m.proteins_g || m.protein || m.totalProtein) || 0) * 10) / 10;
      const fat = Math.round((Number(m.fat_g || m.fat || m.totalFat || m.lipides) || 0) * 10) / 10;
      const calories = Math.round(Number(m.calories || m.kcal || m.totalCalories || ((protein * 4) + (carbs * 4) + (fat * 9))));
      const gl = Math.round((Number(m.glycemic_load || m.glycemicLoad || m.totalGL) || 0) * 10) / 10;
      const itemsList = Array.isArray(m.items) ? m.items.map(i => i.name).join(', ') : (m.title || 'Repas sain');

      return {
        id: m.id || `meal_${idx}`,
        date: dateStr,
        time: timeStr,
        timestamp: ts.getTime(),
        title: m.title || itemsList.slice(0, 35) || 'Repas composé',
        itemsDescription: itemsList,
        netCarbs: carbs,
        protein: protein,
        fat: fat,
        calories: calories,
        glycemicLoad: gl,
        imageUrl: m.imageUrl || null,
        hour: ts.getHours(),
        inEatingWindow: (ts.getHours() >= 9 && ts.getHours() < 15)
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

    // 2. Normalisation des séances (Workout Home)
    const formattedWorkouts = allWorkouts.map((w, idx) => {
      const ts = w.timestamp ? new Date(w.timestamp) : (w.date ? new Date(w.date) : new Date());
      const dateStr = w.date || ts.toISOString().slice(0, 10);
      const durationSec = Number(w.durationSeconds) || 900;
      const durationMin = Math.round((durationSec / 60) * 10) / 10;
      const calories = Number(w.caloriesEstimated || w.caloriesBurned) || 140;

      return {
        id: w.id || `wo_${idx}`,
        date: dateStr,
        timestamp: ts.getTime(),
        durationSeconds: durationSec,
        durationMinutes: durationMin,
        durationFormatted: `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
        calories,
        rounds: w.rounds || 3,
        exercisesCount: w.exercisesCount || 9,
        level: w.level || 'intermediate',
        completed: Boolean(w.completed !== false)
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

    // 3. Fusion et agrégation par jour
    const daysMap = new Map();

    formattedWorkouts.forEach(w => {
      if (!daysMap.has(w.date)) {
        daysMap.set(w.date, { date: w.date, meals: [], workouts: [], fastingHours: 18 });
      }
      daysMap.get(w.date).workouts.push(w);
    });

    formattedMeals.forEach(m => {
      if (!daysMap.has(m.date)) {
        daysMap.set(m.date, { date: m.date, meals: [], workouts: [], fastingHours: 18 });
      }
      daysMap.get(m.date).meals.push(m);
    });

    // Assurer la présence des 7 derniers jours
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (!daysMap.has(ds)) {
        daysMap.set(ds, { date: ds, meals: [], workouts: [], fastingHours: 18 });
      }
    }

    const dailyTimeline = Array.from(daysMap.values()).map(day => {
      const netCarbs = Math.round(day.meals.reduce((sum, m) => sum + m.netCarbs, 0) * 10) / 10;
      const protein = Math.round(day.meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
      const fat = Math.round(day.meals.reduce((sum, m) => sum + (m.fat || 0), 0) * 10) / 10;
      const caloriesConsumed = Math.round(day.meals.reduce((sum, m) => sum + (m.calories || 0), 0));
      const caloriesBurned = day.workouts.reduce((sum, w) => sum + w.calories, 0);
      const workoutCount = day.workouts.length;
      const workoutDurationMin = Math.round(day.workouts.reduce((sum, w) => sum + w.durationMinutes, 0) * 10) / 10;
      const fastingHours = 18; // Standard 18/6

      const carbsOk = netCarbs > 0 ? (netCarbs <= targetCarbs) : true;
      const workoutOk = workoutCount > 0;
      const fastingOk = true;

      const scorePillars = (carbsOk ? 1 : 0) + (workoutOk ? 1 : 0) + (fastingOk ? 1 : 0);

      const dObj = new Date(day.date + 'T12:00:00Z');
      const dayLabel = dObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

      return {
        date: day.date,
        dayLabel,
        netCarbs,
        targetCarbs,
        protein,
        targetProtein,
        fat,
        targetFat,
        caloriesConsumed,
        targetCalories,
        caloriesBurned,
        workoutCount,
        workoutDurationMin,
        fastingHours,
        carbsOk,
        workoutOk,
        fastingOk,
        scorePillars,
        scorePercent: Math.round((scorePillars / 3) * 100)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Sessions de jeûne dédiées
    const fastSessions = dailyTimeline.map(d => ({
      date: d.date,
      dayLabel: d.dayLabel,
      hoursFasted: d.fastingHours,
      targetHours: 18,
      protocol: '18:6 (15h00 - 09h00)',
      stage: 'Autophagie / Cétose',
      completed: true
    })).reverse();

    return {
      dailyTimeline, // Trié par date croissante (idéal pour les tracés de courbes)
      formattedMeals, // Trié du plus récent au plus ancien (idéal pour diaporama repas)
      formattedWorkouts, // Trié du plus récent au plus ancien (idéal pour diaporama sport)
      fastSessions, // Trié du plus récent au plus ancien (idéal pour diaporama jeûne)
      totals: {
        totalMeals: formattedMeals.length,
        totalWorkouts: formattedWorkouts.length,
        totalCaloriesBurned: formattedWorkouts.reduce((acc, w) => acc + w.calories, 0),
        totalWorkoutMinutes: Math.round(formattedWorkouts.reduce((acc, w) => acc + w.durationMinutes, 0)),
        avgCarbs: dailyTimeline.filter(d => d.netCarbs > 0).length > 0
          ? Math.round((dailyTimeline.reduce((acc, d) => acc + d.netCarbs, 0) / dailyTimeline.filter(d => d.netCarbs > 0).length) * 10) / 10
          : 0,
        avgCaloriesPerWorkout: formattedWorkouts.length > 0
          ? Math.round(formattedWorkouts.reduce((acc, w) => acc + w.calories, 0) / formattedWorkouts.length)
          : 0
      }
    };
  }
}

export const healthAggregator = new HealthAggregator();
