/**
 * Main Application Bootstrapper - Health & Vitality Hub
 * Assemblage modulaire, initialisation du Store réactif, du Routeur SPA et de la PWA.
 */

import { Router } from './core/router.js';
import { appStore } from './core/store.js';
import { initPWA } from './core/pwa.js';
import { profileBackend } from './core/profileService.js';
import { healthAggregator } from './core/healthAggregator.js';

// Chargement eager de la vue principale pour un affichage instantané
import { CockpitView } from './modules/cockpit/cockpitView.js';

// Table de routage modulaire avec Code-Splitting à la demande
const routes = {
  dashboard: (container, navigateTo) => new CockpitView(container, navigateTo),
  cockpit: (container, navigateTo) => new CockpitView(container, navigateTo),

  objectifs: async (container, navigateTo) => {
    const { ObjectifsView } = await import('./modules/objectifs/objectifsView.js');
    return new ObjectifsView(container, navigateTo);
  },
  history: async (container, navigateTo) => {
    const { HistoriqueView } = await import('./modules/history/historiqueView.js');
    return new HistoriqueView(container, navigateTo);
  },
  historique: async (container, navigateTo) => {
    const { HistoriqueView } = await import('./modules/history/historiqueView.js');
    return new HistoriqueView(container, navigateTo);
  },
  cross: async (container, navigateTo) => {
    const { CrossView } = await import('./modules/cross/crossView.js');
    return new CrossView(container, navigateTo);
  },
  sources: async (container, navigateTo) => {
    const { SourcesView } = await import('./modules/sources/sourcesView.js');
    return new SourcesView(container, navigateTo);
  },

  // Vues secondaires / compatibilité
  fasting: async (container) => {
    const { FastingView } = await import('./modules/fasting/fastingView.js');
    return new FastingView(container);
  },
  nutrition: async (container) => {
    const { NutritionView } = await import('./modules/nutrition/nutritionView.js');
    return new NutritionView(container);
  },
  workout: async (container) => {
    const { WorkoutView } = await import('./modules/workout/workoutView.js');
    return new WorkoutView(container);
  }
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialiser le contrôleur PWA (Service Worker & prompt install)
  initPWA();

  // 2. Initialiser le routeur SPA
  const router = new Router(routes, 'dashboard');
  router.init();

  // 3. Écouter les changements dans le store pour actualiser les indicateurs globaux
  appStore.subscribe((state) => {
    if (router.currentViewInstance && typeof router.currentViewInstance.onStoreUpdate === 'function') {
      router.currentViewInstance.onStoreUpdate(state);
    }
  });

  // 4. Lecture et synchronisation immédiate des 3 backends mères (Supabase, Firebase, Fast Master)
  healthAggregator.refresh().catch(err => {
    console.warn('[App] HealthAggregator background sync warning:', err);
  });

  if (profileBackend.isLoggedIn()) {
    profileBackend.syncToCloud().catch(err => console.warn('[App] Background sync warning:', err));
  }

  console.log('⚡ Health & Vitality Cockpit initialisé : lecture passive des 3 backends mères active.');
});
