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

  // Requête multi-routes vers Firebase Direct ou Gateway Cloudflare
  async cloudSyncRequest(userHash, method = 'GET', data = null) {
    const routes = [
      `${DIRECT_FIREBASE_RTDB}/workout_profiles/${encodeURIComponent(userHash)}.json`,
      `${CLOUDFLARE_API_GATEWAY}?user=${encodeURIComponent(userHash)}`
    ];

    let lastError = null;

    for (const url of routes) {
      try {
        const fetchOpts = { method, mode: 'cors' };
        if (data) {
          fetchOpts.headers = { 'Content-Type': 'application/json' };
          fetchOpts.body = typeof data === 'string' ? data : JSON.stringify(data);
        }
        const resp = await fetch(url, fetchOpts);
        if (resp.ok) {
          const text = await resp.text();
          return text && text !== 'null' ? JSON.parse(text) : null;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Serveur Workout Home injoignable");
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
      if (remoteData && remoteData.history && Array.isArray(remoteData.history)) {
        const localHist = appStore.state.workout.history || [];
        const merged = this.mergeWorkoutHistory(localHist, remoteData.history);
        appStore.state.workout.history = merged;

        if (remoteData.prefs) {
          if (remoteData.prefs.userLevel) {
            appStore.state.user.workoutLevel = remoteData.prefs.userLevel;
          }
        }
        appStore.save();
      }

      // 3. Préparer le paquet de mise à jour pour Firebase
      const fullPayload = {
        app: 'FULL_BODY_17',
        version: '2.3.8',
        syncedAt: Date.now(),
        prefs: {
          userName: appStore.state.user.name,
          userLevel: appStore.state.user.workoutLevel || 'intermediate',
          streak: appStore.state.workout.streak || 0,
          targetWeight: appStore.state.user.weight,
          heightCm: appStore.state.user.height
        },
        history: appStore.state.workout.history || [],
        weightHistory: []
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
}

export const workoutSync = new WorkoutSyncService();
