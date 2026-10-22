/**
 * Main Application Bootstrapper - Health & Vitality Hub
 * Assemblage modulaire, initialisation du Store réactif, du Routeur SPA et de la PWA.
 */

import { Router } from './core/router.js';
import { appStore } from './core/store.js';
import { initPWA } from './core/pwa.js';

import { DashboardView } from './modules/dashboard/dashboard.js';
import { FastingView } from './modules/fasting/fastingView.js';
import { NutritionView } from './modules/nutrition/nutritionView.js';
import { WorkoutView } from './modules/workout/workoutView.js';

// Table de routage modulaire
const routes = {
  dashboard: (container, navigateTo) => new DashboardView(container, navigateTo),
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
    // Si la vue active dispose d'une méthode de mise à jour légère, elle peut réagir
    if (router.currentViewInstance && typeof router.currentViewInstance.onStoreUpdate === 'function') {
      router.currentViewInstance.onStoreUpdate(state);
    }
  });

  console.log('⚡ Health & Vitality Hub initialisé avec succès.');
});
