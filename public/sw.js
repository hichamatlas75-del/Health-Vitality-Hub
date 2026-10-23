/**
 * Service Worker - Health & Vitality Hub
 * Cache offline pour fonctionnement 100% autonome sans connexion internet.
 */

const CACHE_NAME = 'vitality-hub-v2';
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
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les protocoles internes de navigateur (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Stratégie pour les assets locaux et externes (Google Fonts, CDN, scripts, styles)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Mettre en cache les réponses standard (200) ainsi que les réponses opaques tierces (Google Fonts, CDN)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback hors-ligne pour la navigation SPA
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return cachedResponse || Response.error();
      });

      return cachedResponse || fetchPromise;
    })
  );
});
