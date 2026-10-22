/**
 * Router & Navigation Manager - Health & Vitality Hub
 * Gestion du basculement d'onglet sans rechargement de page (Bottom Navigation).
 */

export class Router {
  constructor(routes, defaultRoute = 'dashboard') {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.currentRoute = null;
    this.currentViewInstance = null;
    this.navButtons = [];
  }

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.navButtons = Array.from(document.querySelectorAll('.bottom-nav-item'));

    this.navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.target;
        this.navigate(target);
      });
    });

    this.handleHashChange();
  }

  navigate(routeKey) {
    if (!this.routes[routeKey]) {
      routeKey = this.defaultRoute;
    }
    window.location.hash = `#${routeKey}`;
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const routeKey = this.routes[rawHash] ? rawHash : this.defaultRoute;

    if (this.currentRoute === routeKey && this.currentViewInstance) {
      return;
    }

    if (this.currentViewInstance && typeof this.currentViewInstance.unmount === 'function') {
      this.currentViewInstance.unmount();
    }

    this.currentRoute = routeKey;

    // Mise à jour visuelle des boutons de la barre de navigation
    this.navButtons.forEach(btn => {
      if (btn.dataset.target === routeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Instanciation de la vue
    const viewFactory = this.routes[routeKey];
    const container = document.getElementById('viewContainer');
    if (viewFactory && container) {
      container.scrollTop = 0;
      this.currentViewInstance = viewFactory(container, (target) => this.navigate(target));
      if (this.currentViewInstance && typeof this.currentViewInstance.mount === 'function') {
        this.currentViewInstance.mount();
      }
    }
  }
}
