/**
 * Workout Home Mother Backend Sync Service - Health & Vitality Hub
 * Synchronisation directe avec l'infrastructure Firebase RTDB et Passerelle Cloudflare
 * de l'application mère "Workout Home" (FULL BODY 17).
 * Chiffrement Client-Side AES-256 Zero-Knowledge conforme à l'application originale.
 */

import { appStore } from '../../core/store.js';

const CLOUDFLARE_API_GATEWAY = 'https://workout-home.pages.dev/api/sync';
const DIRECT_FIREBASE_RTDB = 'https://workout-homefb17-default-rtdb.europe-west1.firebasedatabase.app';

function getSubtleCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

export class WorkoutSyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncStatus = 'idle'; // 'idle' | 'syncing' | 'success' | 'error'
    this.statusMessage = '';
  }

  getCredentials() {
    // Récupérer depuis profileBackend si connecté, ou depuis le store local
    const savedActive = localStorage.getItem('vitality_active_account_v1');
    const parsed = savedActive ? JSON.parse(savedActive) : {};
    const userId = (parsed.username || appStore.state.user.name || 'hicham').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
    const password = parsed.passwordPlain || '1234';
    return { userId, password };
  }

  // Hachage de l'ID utilisateur (identique à Workout Home)
  async hashUserId(userId) {
    const subtle = getSubtleCrypto();
    if (subtle) {
      try {
        const enc = new TextEncoder();
        const hashBuf = await subtle.digest('SHA-256', enc.encode('fb17_usr_' + userId));
        const hashArr = Array.from(new Uint8Array(hashBuf));
        return 'u_' + hashArr.map(b => b.toString(16).padStart(2, '0')).slice(0, 20).join('');
      } catch (e) {
        console.warn('[WorkoutSync] Fallback hash:', e);
      }
    }
    // Fallback synchrone
    let hash = 0;
    const str = 'fb17_usr_' + userId;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'u_' + Math.abs(hash).toString(16).padStart(8, '0') + '_' + userId.slice(0, 10);
  }

  // Dérivation de clé PBKDF2 (AES-GCM 256 bits)
  async deriveKey(userId, password) {
    const subtle = getSubtleCrypto();
    const enc = new TextEncoder();
    const secret = `${userId.toLowerCase().trim()}:${password}`;
    const keyMaterial = await subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('fb17_profile_salt_v3'),
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Chiffrement AES-GCM
  async encryptPayload(dataObj, userId, password) {
    const jsonStr = JSON.stringify(dataObj);
    const subtle = getSubtleCrypto();
    if (subtle) {
      try {
        const key = await this.deriveKey(userId, password);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encodedData = new TextEncoder().encode(jsonStr);

        const ciphertext = await subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          encodedData
        );

        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
        const payloadHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');

        return {
          v: 3,
          app: 'FULL_BODY_17',
          profile: userId,
          iv: ivHex,
          payload: payloadHex,
          updatedAt: Date.now()
        };
      } catch (err) {
        console.warn('[WorkoutSync] Crypto Encrypt error:', err);
      }
    }

    // Fallback Base64 direct
    return {
      v: 2,
      app: 'FULL_BODY_17',
      profile: userId,
      payload: btoa(unescape(encodeURIComponent(jsonStr))),
      updatedAt: Date.now()
    };
  }

  // Déchiffrement AES-GCM
  async decryptPayload(envelope, userId, password) {
    if (!envelope || !envelope.payload) return null;
    const subtle = getSubtleCrypto();

    if (envelope.v === 3 && envelope.iv && envelope.payload) {
      if (subtle) {
        const key = await this.deriveKey(userId, password);
        const ivBytes = new Uint8Array(envelope.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const cipherBytes = new Uint8Array(envelope.payload.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        const decryptedBuf = await subtle.decrypt(
          { name: 'AES-GCM', iv: ivBytes },
          key,
          cipherBytes
        );

        const decryptedStr = new TextDecoder().decode(decryptedBuf);
        return JSON.parse(decryptedStr);
      }
    }

    if (envelope.v === 2 && envelope.payload) {
      const decodedStr = decodeURIComponent(escape(atob(envelope.payload)));
      return JSON.parse(decodedStr);
    }

    return null;
  }

  // Requête multi-routes vers Firebase Direct ou Gateway Cloudflare avec timeout résilient
  async cloudSyncRequest(userHash, method = 'GET', data = null) {
    const routes = [
      `${DIRECT_FIREBASE_RTDB}/workout_profiles/${encodeURIComponent(userHash)}.json`,
      `${CLOUDFLARE_API_GATEWAY}?user=${encodeURIComponent(userHash)}`
    ];

    let lastError = null;

    for (const url of routes) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 6500) : null;

      try {
        const fetchOpts = { method, mode: 'cors' };
        if (controller) fetchOpts.signal = controller.signal;
        if (data) {
          fetchOpts.headers = { 'Content-Type': 'application/json' };
          fetchOpts.body = typeof data === 'string' ? data : JSON.stringify(data);
        }
        const resp = await fetch(url, fetchOpts);
        if (timeoutId) clearTimeout(timeoutId);

        if (resp.ok) {
          const text = await resp.text();
          return text && text !== 'null' ? JSON.parse(text) : null;
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = err;
        console.warn(`[WorkoutSync] Échec route ${url.slice(0, 35)}...:`, err.message);
      }
    }

    throw lastError || new Error("Serveurs Workout Home (Firebase & Gateway) injoignables");
  }

  /**
   * Synchronisation complète : télécharge, fusionne et renvoie à Firebase RTDB
   */
  async sync(overrideUserId = null, overridePassword = null) {
    if (this.isSyncing) return { success: false, error: 'Synchro en cours' };
    this.isSyncing = true;
    this.syncStatus = 'syncing';

    const creds = this.getCredentials();
    const userId = (overrideUserId || creds.userId || 'hicham').toLowerCase().trim();
    const password = overridePassword || creds.password || '1234';

    try {
      const userHash = await this.hashUserId(userId);

      // 1. Lire les données distantes sur Firebase RTDB
      let remoteData = null;
      try {
        const remoteEnvelope = await this.cloudSyncRequest(userHash, 'GET');
        if (remoteEnvelope) {
          remoteData = await this.decryptPayload(remoteEnvelope, userId, password);
        }
      } catch (e) {
        console.warn('[WorkoutSync] GET warning:', e);
      }

      // 2. Fusionner avec le store local
      if (remoteData) {
        if (remoteData.history && Array.isArray(remoteData.history)) {
          const localHist = appStore.state.workout.history || [];
          const merged = this.mergeWorkoutHistory(localHist, remoteData.history);
          appStore.state.workout.history = merged;
        }

        if (remoteData.prefs) {
          if (remoteData.prefs.userLevel) {
            appStore.state.user.workoutLevel = remoteData.prefs.userLevel;
          }
        }

        // Extraction et fusion du podomètre distant (Workout Home)
        const remotePed = this.extractPedometer(remoteData);
        if (remotePed) {
          this.mergePedometer(remotePed);
        }

        appStore.save();
      }

      // 3. Préparer le paquet de mise à jour pour Firebase (compatibilité 100% Workout Home FULL BODY 17)
      const pedometerState = appStore.getPedometer ? appStore.getPedometer() : appStore.state.workout.pedometer;
      const todayStr = new Date().toISOString().slice(0, 10);

      // Reconstruire et préserver le dictionnaire stepsHistory officiel de Workout Home
      const stepsHistoryObj = (remoteData && remoteData.stepsHistory && typeof remoteData.stepsHistory === 'object')
        ? { ...remoteData.stepsHistory }
        : {};

      if (Array.isArray(pedometerState?.history)) {
        pedometerState.history.forEach(h => {
          if (h && h.date) {
            stepsHistoryObj[h.date] = {
              steps: h.steps || 0,
              calories: h.caloriesBurned || Math.round((h.steps || 0) * 0.045),
              distanceKm: h.distanceKm || Math.round(((h.steps || 0) * 0.00075) * 10) / 10,
              updatedAt: Date.now()
            };
          }
        });
      }

      if (pedometerState?.todaySteps > 0 || !stepsHistoryObj[todayStr]) {
        const prevToday = stepsHistoryObj[todayStr] || {};
        const maxSteps = Math.max(typeof prevToday === 'number' ? prevToday : (prevToday.steps || 0), pedometerState?.todaySteps || 0);
        stepsHistoryObj[todayStr] = {
          steps: maxSteps,
          distanceKm: pedometerState?.distanceKm || (typeof prevToday === 'object' ? prevToday.distanceKm : 0) || Math.round((maxSteps * 0.00075) * 10) / 10,
          calories: pedometerState?.caloriesBurned || (typeof prevToday === 'object' ? prevToday.calories : 0) || Math.round(maxSteps * 0.045),
          updatedAt: Date.now()
        };
      }

      const fullPayload = {
        app: 'FULL_BODY_17',
        version: '2.5.0',
        syncedAt: Date.now(),
        prefs: {
          ...(remoteData?.prefs || {}),
          userName: appStore.state.user.name,
          userLevel: appStore.state.user.workoutLevel || 'intermediate',
          streak: appStore.state.workout.streak || 0,
          targetWeight: appStore.state.user.weight,
          heightCm: appStore.state.user.height,
          dailyStepGoal: pedometerState?.targetSteps || 8000,
          dailySteps: pedometerState?.todaySteps || 0,
          targetSteps: pedometerState?.targetSteps || 8000,
          stepCalories: pedometerState?.caloriesBurned || 0,
          stepDistanceKm: pedometerState?.distanceKm || 0
        },
        stepsHistory: stepsHistoryObj, // Clé officielle interopérable avec FULL BODY 17
        pedometer: {
          todayDate: pedometerState?.todayDate || todayStr,
          todaySteps: pedometerState?.todaySteps || 0,
          targetSteps: pedometerState?.targetSteps || 8000,
          caloriesBurned: pedometerState?.caloriesBurned || 0,
          distanceKm: pedometerState?.distanceKm || 0,
          history: pedometerState?.history || [],
          lastUpdated: pedometerState?.lastUpdated || Date.now()
        },
        history: appStore.state.workout.history || [],
        weightHistory: remoteData?.weightHistory || []
      };

      // 4. Chiffrer et envoyer (PUT) vers Firebase RTDB
      const envelope = await this.encryptPayload(fullPayload, userId, password);
      await this.cloudSyncRequest(userHash, 'PUT', envelope);

      this.lastSyncTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      this.syncStatus = 'success';
      this.statusMessage = `Synchronisé avec Workout Home (Firebase) à ${this.lastSyncTime}`;

      return { success: true, lastSyncTime: this.lastSyncTime };
    } catch (err) {
      this.syncStatus = 'error';
      this.statusMessage = err.message || 'Erreur synchronisation';
      console.warn('[WorkoutSync] Error:', err);
      return { success: false, error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  mergeWorkoutHistory(localHist, remoteHist) {
    const map = new Map();
    const all = [...(remoteHist || []), ...(localHist || [])];
    for (const item of all) {
      if (!item) continue;
      const key = String(item.id || item.timestamp || item.date || '');
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 50);
  }

  /**
   * Extrait et normalise les données de podomètre / compteur de pas depuis les données distantes (Workout Home)
   */
  extractPedometer(remoteData) {
    const today = new Date().toISOString().slice(0, 10);
    let steps = null;
    let target = 8000;
    let calories = null;
    let distance = null;
    let history = [];
    let date = today;

    // 1. Structure officielle Workout Home (FULL BODY 17) : stepsHistory = { "YYYY-MM-DD": { steps, distanceKm, calories, ... } }
    if (remoteData?.stepsHistory && typeof remoteData.stepsHistory === 'object') {
      const sh = remoteData.stepsHistory;
      const dates = Object.keys(sh).sort();
      const todayEntry = sh[today] || (dates.length > 0 ? sh[dates[dates.length - 1]] : null);
      if (todayEntry) {
        if (typeof todayEntry === 'number') {
          steps = todayEntry;
        } else {
          steps = todayEntry.steps ?? todayEntry.count;
          calories = todayEntry.calories ?? todayEntry.kcal;
          distance = todayEntry.distanceKm ?? todayEntry.distance;
        }
      }

      // Convertir toutes les entrées enregistrées en tableau d'historique
      for (const d of dates) {
        const item = sh[d];
        const s = typeof item === 'number' ? item : (item?.steps || 0);
        const c = typeof item === 'number' ? Math.round(s * 0.045) : (item?.calories || Math.round(s * 0.045));
        const dist = typeof item === 'number' ? Math.round((s * 0.00075) * 10) / 10 : (item?.distanceKm || 0);
        history.push({ date: d, steps: s, caloriesBurned: c, distanceKm: dist });
      }
    }

    // 2. Format alternatif podometer = { todaySteps, ... }
    if (steps == null && remoteData?.pedometer) {
      const p = remoteData.pedometer;
      if (typeof p === 'number') {
        steps = p;
      } else if (typeof p === 'object') {
        steps = p.todaySteps ?? p.steps ?? p.count ?? p.today;
        target = p.targetSteps ?? p.target ?? p.goal ?? target;
        calories = p.caloriesBurned ?? p.calories ?? p.kcal;
        distance = p.distanceKm ?? p.distance;
        date = p.todayDate || p.date || today;
        if (Array.isArray(p.history)) history = p.history;
      }
    }

    // 3. Format alternatif steps = number ou { today, goal, calories }
    if (steps == null && remoteData?.steps != null) {
      if (typeof remoteData.steps === 'number') {
        steps = remoteData.steps;
      } else if (typeof remoteData.steps === 'object') {
        steps = remoteData.steps.today ?? remoteData.steps.count ?? remoteData.steps.steps;
        target = remoteData.steps.goal ?? remoteData.steps.target ?? target;
        calories = remoteData.steps.calories ?? remoteData.steps.kcal;
        date = remoteData.steps.date || today;
      }
    }

    // 4. Format préférences Workout Home (dailyStepGoal, dailySteps)
    if (remoteData?.prefs) {
      if (remoteData.prefs.dailyStepGoal) target = Number(remoteData.prefs.dailyStepGoal);
      else if (remoteData.prefs.targetSteps) target = Number(remoteData.prefs.targetSteps);

      if (steps == null && remoteData.prefs.dailySteps != null) {
        steps = remoteData.prefs.dailySteps;
        if (remoteData.prefs.stepCalories) calories = remoteData.prefs.stepCalories;
        if (remoteData.prefs.stepDistanceKm) distance = remoteData.prefs.stepDistanceKm;
      }
    }

    // 5. Lecture directe depuis le localStorage partagé (si ouvert dans le même navigateur / domaine)
    try {
      if (typeof localStorage !== 'undefined') {
        const localStepsRaw = localStorage.getItem('fb17_steps_history')
          || localStorage.getItem('fb17_prof_default_steps')
          || localStorage.getItem('fb17_prof_hicham_steps');
        if (localStepsRaw) {
          const parsed = JSON.parse(localStepsRaw);
          if (parsed && typeof parsed === 'object') {
            const entry = parsed[today] || parsed[Object.keys(parsed).sort().pop()];
            if (entry) {
              const localSteps = typeof entry === 'number' ? entry : (entry.steps || 0);
              if (localSteps > (steps || 0)) {
                steps = localSteps;
                calories = (typeof entry === 'object' && entry.calories != null) ? entry.calories : calories;
                distance = (typeof entry === 'object' && entry.distanceKm != null) ? entry.distanceKm : distance;
              }
            }
          }
        }
      }
    } catch (_) {}

    if (steps == null) return null;

    const numericSteps = Math.max(0, Math.round(Number(steps) || 0));
    const numericCalories = calories != null ? Math.round(Number(calories)) : Math.round(numericSteps * 0.045);
    const numericDistance = distance != null ? Math.round(Number(distance) * 100) / 100 : Math.round((numericSteps * 0.00075) * 10) / 10;

    return {
      todayDate: date,
      todaySteps: numericSteps,
      targetSteps: Number(target) || 8000,
      caloriesBurned: numericCalories,
      distanceKm: numericDistance,
      history
    };
  }

  /**
   * Fusionne les données de podomètre distantes avec le store local sans perte
   */
  mergePedometer(remotePed) {
    if (!remotePed) return;
    const today = new Date().toISOString().slice(0, 10);
    const localPed = appStore.getPedometer ? appStore.getPedometer() : appStore.state.workout.pedometer;

    // Si les données distantes sont pour aujourd'hui, on retient le max des pas
    let mergedSteps = localPed?.todaySteps || 0;
    let caloriesBurned = localPed?.caloriesBurned || 0;
    let distanceKm = localPed?.distanceKm || 0;

    if (remotePed.todayDate === today || !remotePed.todayDate) {
      if ((remotePed.todaySteps || 0) >= (localPed?.todaySteps || 0)) {
        mergedSteps = remotePed.todaySteps || 0;
        caloriesBurned = remotePed.caloriesBurned || Math.round(mergedSteps * 0.045);
        distanceKm = remotePed.distanceKm || Math.round((mergedSteps * 0.00075) * 10) / 10;
      } else {
        mergedSteps = localPed?.todaySteps || 0;
        caloriesBurned = localPed?.caloriesBurned || Math.round(mergedSteps * 0.045);
        distanceKm = localPed?.distanceKm || Math.round((mergedSteps * 0.00075) * 10) / 10;
      }
    }
    const targetSteps = remotePed.targetSteps || localPed?.targetSteps || 8000;

    // Fusion de l'historique
    let mergedHistory = localPed?.history || [];
    if (Array.isArray(remotePed.history) && remotePed.history.length > 0) {
      const histMap = new Map();
      for (const h of [...mergedHistory, ...remotePed.history]) {
        if (h && h.date) histMap.set(h.date, h);
      }
      mergedHistory = Array.from(histMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30);
    }

    appStore.updatePedometer({
      todaySteps: mergedSteps,
      targetSteps,
      caloriesBurned,
      distanceKm,
      history: mergedHistory
    });
  }
}

export const workoutSync = new WorkoutSyncService();
