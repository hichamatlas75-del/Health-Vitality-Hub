/**
 * PWA Controller - Health & Vitality Hub
 * Enregistrement du Service Worker, détection hors-ligne et bannière d'installation PWA.
 */

export function initPWA() {
  // Enregistrement du Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker actif, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Échec enregistrement SW:', err);
        });
    });
  }

  // Écoute de l'événement d'installation PWA
  let deferredPrompt = null;
  const installBanner = document.getElementById('pwaInstallBanner');
  const btnInstall = document.getElementById('btnPwaInstall');
  const btnDismiss = document.getElementById('btnPwaDismiss');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) {
      installBanner.style.display = 'flex';
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Choix utilisateur:', outcome);
        deferredPrompt = null;
        if (installBanner) installBanner.style.display = 'none';
      }
    });
  }

  if (btnDismiss && installBanner) {
    btnDismiss.addEventListener('click', () => {
      installBanner.style.display = 'none';
    });
  }

  // Détection du statut réseau
  const offlineBadge = document.getElementById('offlineBadge');
  function updateOnlineStatus() {
    if (offlineBadge) {
      if (!navigator.onLine) {
        offlineBadge.style.display = 'inline-flex';
      } else {
        offlineBadge.style.display = 'none';
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}
