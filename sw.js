/**
 * Service Worker - Health & Vitality Hub
 * Version v3 - Support hors-ligne PWA avec bypass total des APIs distantes (Supabase REST, Firebase RTDB)
 */

const CACHE_NAME = 'vitality-hub-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Purge ancien cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les protocoles internes de navigateur
  if (!url.protocol.startsWith('http')) return;

  // 1. BYPASS INTÉGRAL DES APIS DISTANTES ET DES BACKENDS CLOUD
  // Ne JAMAIS intercepter ni polluer les requêtes vers Supabase, Firebase RTDB ou passerelles API.
  // Laisser le navigateur gérer nativement avec ses en-têtes CORS, JWT et apikey.
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('workout-home.pages.dev') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/workout_profiles/') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 2. Navigation SPA : Stratégie Network-First avec fallback index.html pour le hors-ligne
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 3. Assets statiques (scripts, styles, polices) : Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
