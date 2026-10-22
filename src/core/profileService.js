/**
 * Profile & Cloud Backend Service - Health & Vitality Hub
 * Synchronisation unifiée avec le backend Supabase (Gluco-Carb Maroc)
 * et passerelle Firebase RTDB (Workout Home) pour un profil partagé identique.
 */

import { appStore } from './store.js';
import { workoutSync } from '../modules/workout/workoutSyncService.js';

const SUPABASE_REST_URL = 'https://plrqzuwbnuryxtsmimyt.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscnF6dXdibnVyeXh0c21pbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0Mzk2OTcsImV4cCI6MjEwODAxNTY5N30.Wzx1Lsh1GGETK_RidTTND1t4Ix3EjhS3qQvlGn-Xglc';

const FIREBASE_RTDB_URL = 'https://workout-homefb17-default-rtdb.europe-west1.firebasedatabase.app';

// Clés de persistance locale interopérables avec les 3 apps
const KEY_ACTIVE_PROFILE = 'vitality_active_account_v1';
const KEY_GLUCO_ACTIVE = 'glucoscan_active_profile_v1';
const KEY_GLUCO_PROFILES = 'glucoscan_profiles_db_v1';
const KEY_FAST_USER = 'fastmaster_user';
const KEY_WORKOUT_PREFS = 'fb17_preferences';

async function sha256(str) {
  try {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (_) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash);
  }
}

export class ProfileBackendService {
  constructor() {
    this.currentUser = this.loadLocalActive();
    this.isSyncing = false;
    this.lastSyncTime = null;
  }

  loadLocalActive() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(KEY_ACTIVE_PROFILE);
      if (raw) return JSON.parse(raw);
      // Fallback : vérifier si GlucoScan avait déjà un compte actif
      const glucoRaw = localStorage.getItem(KEY_GLUCO_ACTIVE);
      if (glucoRaw) return JSON.parse(glucoRaw);
      return null;
    } catch (_) {
      return null;
    }
  }

  isLoggedIn() {
    return Boolean(this.currentUser && this.currentUser.username);
  }

  async hashPassword(username, password) {
    const cleanUser = String(username || '').toLowerCase().trim();
    return sha256(`${cleanUser}:${password}:glucomaroc_salt_v2`);
  }

  async verifyPassword(username, password, storedHash) {
    const salted = await this.hashPassword(username, password);
    if (salted === storedHash) return true;
    const legacy = await sha256(password);
    return legacy === storedHash;
  }

  /**
   * Récupère un profil utilisateur depuis Supabase (table app_accounts)
   */
  async fetchSupabaseAccount(username) {
    const clean = String(username || '').toLowerCase().trim();
    if (!clean) return { ok: false, error: 'Pseudo manquant' };

    try {
      const res = await fetch(`${SUPABASE_REST_URL}/app_accounts?username=eq.${encodeURIComponent(clean)}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) return { ok: false, error: `Erreur HTTP ${res.status}` };
      const data = await res.json();
      return { ok: true, account: Array.isArray(data) ? (data[0] || null) : null };
    } catch (e) {
      return { ok: false, error: e.message || 'Serveur cloud injoignable' };
    }
  }

  /**
   * Connexion avec synchronisation immédiate depuis le Cloud Supabase
   */
  async login(username, password) {
    const clean = String(username || '').toLowerCase().trim();
    if (!clean) throw new Error('Veuillez saisir votre pseudo');
    if (!password) throw new Error('Veuillez saisir votre mot de passe');

    // 1. Lire sur le cloud Supabase
    const cloudRes = await this.fetchSupabaseAccount(clean);
    if (!cloudRes.ok) throw new Error(`Cloud injoignable (${cloudRes.error}).`);
    const account = cloudRes.account;

    if (!account) {
      throw new Error(`Aucun compte trouvé pour "${clean}". Vérifiez votre pseudo ou créez un nouveau compte.`);
    }

    // 2. Vérifier le mot de passe
    const isMatch = await this.verifyPassword(clean, password, account.password_hash);
    if (!isMatch) {
      throw new Error('Mot de passe incorrect pour ce profil.');
    }

    // 3. Appliquer les données du profil distant à l'application unifiée
    this.currentUser = {
      username: account.username,
      displayName: account.display_name || account.username,
      passwordHash: account.password_hash,
      passwordPlain: password, // Conservé en session mémoire locale pour les synchros automatiques
      createdAt: account.created_at,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem(KEY_ACTIVE_PROFILE, JSON.stringify(this.currentUser));
    localStorage.setItem(KEY_GLUCO_ACTIVE, JSON.stringify({
      id: 'usr_' + clean,
      username: clean,
      mode: account.user_mode || 'sport',
      createdAt: account.created_at
    }));

    // Synchronisation des réglages dans le Store
    const settings = account.settings || {};
    appStore.updateUser({
      name: account.display_name || clean,
      carbsDailyTarget: Number(settings.dailyTargetCarbs) || 150,
      proteinDailyTarget: Number(settings.dailyTargetProtein) || 150,
      fatDailyTarget: Number(settings.dailyTargetFat) || 80,
      caloriesDailyTarget: Number(settings.dailyTargetCalories) || 1950,
      weight: Number(settings.weight) || appStore.state.user.weight || 85,
      height: Number(settings.height) || appStore.state.user.height || 183,
      workoutLevel: settings.workoutLevel || 'intermediate',
      fastingPlan: settings.fastingPlan || 'PLAN_18_6'
    });

    // Synchronisation des repas si présents dans le compte cloud
    if (Array.isArray(account.history) && account.history.length > 0) {
      // Filtrer les repas d'aujourd'hui
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayMeals = account.history.filter(m => {
        const itemDate = m.date || (m.timestamp ? new Date(m.timestamp).toISOString().slice(0, 10) : '');
        return itemDate === todayStr;
      }).map(m => {
        const carbs = Number(m.netCarbs || m.net_carbs_g || m.totalNetCarbs || 0);
        const prot = Number(m.protein || m.proteins_g || m.totalProtein || 0);
        const fat = Number(m.fat || m.fat_g || m.totalFat || m.lipides || 0);
        const cal = Number(m.calories || m.kcal || m.totalCalories || Math.round(prot * 4 + carbs * 4 + fat * 9));
        return {
          id: String(m.id || m.timestamp || Date.now()),
          timestamp: m.timestamp || Date.now(),
          timeFormatted: m.timeFormatted || new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mealType: m.mealType || m.type || 'Repas',
          title: m.title || 'Repas synchronisé',
          items: m.items || [],
          totalGrams: m.portion_total_weight_g || m.totalGrams || 0,
          totalNetCarbs: carbs,
          totalProtein: prot,
          totalFat: fat,
          totalCalories: cal,
          totalFiber: m.fiber || m.fibers_g || m.totalFiber || 0,
          totalGL: m.glycemicLoad || m.glycemic_load || m.totalGL || 0,
          amortiScore: m.amortiScore || 'normal'
        };
      });

      if (todayMeals.length > 0) {
        appStore.state.nutrition.todayMeals = todayMeals;
        appStore.save();
      }
    }

    this.lastSyncTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Propager aux autres apps en LocalStorage (Workout Home & Fast Master)
    this.mirrorToOtherApps();

    return this.currentUser;
  }

  /**
   * Inscription d'un nouveau profil sur le Cloud Supabase
   */
  async register(username, password, initialData = {}) {
    const clean = String(username || '').toLowerCase().trim();
    if (clean.length < 2) throw new Error('Le pseudo doit comporter au moins 2 caractères.');
    if (!password || password.length < 4) throw new Error('Le mot de passe doit comporter au moins 4 caractères.');

    // 1. Vérifier si existe déjà sur Supabase
    const cloudCheck = await this.fetchSupabaseAccount(clean);
    if (cloudCheck.account) {
      throw new Error(`Le compte "${clean}" existe déjà. Veuillez vous connecter.`);
    }

    const passwordHash = await this.hashPassword(clean, password);
    const nowIso = new Date().toISOString();

    const cloudRecord = {
      username: clean,
      display_name: initialData.name || clean,
      password_hash: passwordHash,
      user_mode: initialData.workoutLevel || 'sport',
      settings: {
        dailyTargetCarbs: initialData.carbsDailyTarget || 150,
        dailyTargetProtein: initialData.proteinDailyTarget || 150,
        dailyTargetFat: initialData.fatDailyTarget || 80,
        dailyTargetCalories: initialData.caloriesDailyTarget || 1950,
        weight: initialData.weight || 85,
        height: initialData.height || 183,
        fastingPlan: initialData.fastingPlan || 'PLAN_18_6',
        workoutLevel: initialData.workoutLevel || 'intermediate',
        __settingsUpdatedAt: nowIso
      },
      history: [],
      created_at: nowIso,
      updated_at: nowIso
    };

    // 2. Envoyer à Supabase
    const pushRes = await fetch(`${SUPABASE_REST_URL}/app_accounts?on_conflict=username`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(cloudRecord)
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();
      throw new Error(`Erreur Supabase: ${errText}`);
    }

    // 3. Activer localement
    this.currentUser = {
      username: clean,
      displayName: initialData.name || clean,
      passwordHash,
      passwordPlain: password,
      createdAt: nowIso,
      lastLogin: nowIso
    };
    localStorage.setItem(KEY_ACTIVE_PROFILE, JSON.stringify(this.currentUser));
    localStorage.setItem(KEY_GLUCO_ACTIVE, JSON.stringify({
      id: 'usr_' + clean,
      username: clean,
      mode: 'sport',
      createdAt: nowIso
    }));

    appStore.updateUser({
      name: initialData.name || clean,
      carbsDailyTarget: initialData.carbsDailyTarget || 150,
      proteinDailyTarget: initialData.proteinDailyTarget || 150,
      fatDailyTarget: initialData.fatDailyTarget || 80,
      caloriesDailyTarget: initialData.caloriesDailyTarget || 1950,
      weight: initialData.weight || 85,
      height: initialData.height || 183
    });

    this.lastSyncTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.mirrorToOtherApps();

    return this.currentUser;
  }

  /**
   * Synchronisation bidirectionnelle complète vers le Cloud Supabase
   */
  async syncToCloud() {
    if (!this.isLoggedIn()) return { success: false, error: 'Non connecté' };
    if (this.isSyncing) return { success: false, error: 'Synchronisation déjà en cours' };

    this.isSyncing = true;
    const clean = this.currentUser.username.toLowerCase();
    const nowIso = new Date().toISOString();

    try {
      // 1. Lire l'état cloud actuel
      const cloudRes = await this.fetchSupabaseAccount(clean);
      const cloudAccount = cloudRes.account;

      const user = appStore.state.user;
      const todayMeals = appStore.getTodayMeals();

      // Fusion de l'historique
      const existingHistory = Array.isArray(cloudAccount?.history) ? cloudAccount.history : [];
      const mealsMap = new Map();

      existingHistory.forEach(item => {
        if (item && (item.id || item.timestamp)) {
          mealsMap.set(String(item.id || item.timestamp), item);
        }
      });

      todayMeals.forEach(m => {
        mealsMap.set(String(m.id || m.timestamp), {
          id: m.id,
          timestamp: m.timestamp,
          timeFormatted: m.timeFormatted,
          mealType: m.mealType,
          title: m.title,
          items: m.items,
          portion_total_weight_g: m.totalGrams,
          net_carbs_g: m.totalNetCarbs,
          proteins_g: m.totalProtein,
          fibers_g: m.totalFiber,
          glycemic_load: m.totalGL,
          amortiScore: m.amortiScore
        });
      });

      const mergedHistory = Array.from(mealsMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 100);

      const payload = {
        username: clean,
        display_name: user.name || clean,
        password_hash: this.currentUser.passwordHash || cloudAccount?.password_hash,
        user_mode: user.workoutLevel || 'sport',
        settings: {
          ...(cloudAccount?.settings || {}),
          dailyTargetCarbs: user.carbsDailyTarget || 150,
          dailyTargetProtein: user.proteinDailyTarget || 150,
          dailyTargetFat: user.fatDailyTarget || 80,
          dailyTargetCalories: user.caloriesDailyTarget || 1950,
          weight: user.weight || 85,
          height: user.height || 183,
          fastingPlan: appStore.state.fasting.planKey || 'PLAN_18_6',
          workoutLevel: user.workoutLevel || 'intermediate',
          __settingsUpdatedAt: nowIso
        },
        history: mergedHistory,
        updated_at: nowIso
      };

      const res = await fetch(`${SUPABASE_REST_URL}/app_accounts?on_conflict=username`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Échec HTTP ${res.status}`);
      }

      // Synchroniser également avec le backend Workout Home (Firebase RTDB)
      await workoutSync.sync().catch(e => console.warn('[ProfileService] Workout sync error:', e));

      this.lastSyncTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      this.mirrorToOtherApps();

      return { success: true, lastSyncTime: this.lastSyncTime };
    } catch (e) {
      console.warn('[ProfileService] Erreur synchronisation Cloud:', e);
      return { success: false, error: e.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Miroir automatique dans le LocalStorage partagé pour les 3 applications d'origine
   */
  mirrorToOtherApps() {
    try {
      const user = appStore.state.user;
      const clean = (this.currentUser?.username || user.name || 'Champion').toLowerCase();

      // 1. Miroir Fast Master
      const fastUser = {
        name: user.name,
        weight: user.weight,
        height: user.height,
        darkMode: true,
        sound: user.soundEnabled !== false,
        autoStart: false,
        scheduleHour: 20,
        scheduleMinute: 0
      };
      localStorage.setItem(KEY_FAST_USER, JSON.stringify(fastUser));

      // 2. Miroir Workout Home
      const workoutPrefs = {
        userName: user.name,
        userLevel: user.workoutLevel,
        targetWeight: user.weight,
        heightCm: user.height,
        syncUserId: clean,
        soundEnabled: user.soundEnabled !== false,
        voiceEnabled: user.voiceEnabled !== false
      };
      localStorage.setItem(KEY_WORKOUT_PREFS, JSON.stringify(workoutPrefs));
    } catch (_) {}
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(KEY_ACTIVE_PROFILE);
    localStorage.removeItem(KEY_GLUCO_ACTIVE);
  }
}

export const profileBackend = new ProfileBackendService();
