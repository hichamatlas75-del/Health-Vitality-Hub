/**
 * Main Application Bootstrapper - Health & Vitality Hub
 * Assemblage modulaire, initialisation du Store réactif, du Routeur SPA et de la PWA.
 */

import { Router } from './core/router.js';
import { appStore } from './core/store.js';
import { initPWA } from './core/pwa.js';
import { profileBackend } from './core/profileService.js';
import { healthAggregator } from './core/healthAggregator.js';

import { CockpitView } from './modules/cockpit/cockpitView.js';
import { ObjectifsView } from './modules/objectifs/objectifsView.js';
import { HistoriqueView } from './modules/history/historiqueView.js';
import { CrossView } from './modules/cross/crossView.js';
import { SourcesView } from './modules/sources/sourcesView.js';

import { FastingView } from './modules/fasting/fastingView.js';
import { NutritionView } from './modules/nutrition/nutritionView.js';
import { WorkoutView } from './modules/workout/workoutView.js';

// Table de routage modulaire du Cockpit Santé & Vitalité
const routes = {
  dashboard: (container, navigateTo) => new CockpitView(container, navigateTo),
  cockpit: (container, navigateTo) => new CockpitView(container, navigateTo),
  objectifs: (container, navigateTo) => new ObjectifsView(container, navigateTo),
  history: (container, navigateTo) => new HistoriqueView(container, navigateTo),
  historique: (container, navigateTo) => new HistoriqueView(container, navigateTo),
  cross: (container, navigateTo) => new CrossView(container, navigateTo),
  sources: (container, navigateTo) => new SourcesView(container, navigateTo),

  // Vues secondaires / compatibilité
  fasting: (container) => new FastingView(container),
  nutrition: (container) => new NutritionView(container),
  workout: (container) => new WorkoutView(container)
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
