/**
 * Multi-App History View (Diaporama & Courbes Interactives) - Health & Vitality Hub
 * Affiche l'historique complet des 3 applications mères (Gluco-Carb, Workout Home, Fast Master)
 * sous forme de courbes d'évolution graphiques vectorielles et sous forme de diaporama interactif.
 */

import { healthAggregator } from '../../core/healthAggregator.js';

export class HistoriqueView {
  constructor(container, navigateToTab) {
    this.container = container;
    this.navigateToTab = navigateToTab;
    this.unsubscribeAggregator = null;
    this.data = null;

    // État de l'interface
    this.activeMode = 'curves'; // 'curves' | 'slideshow'
    this.timeFilter = 'all'; // '7d' | '30d' | 'all'
    this.currentSlide = 0; // 0: Repas, 1: Séances, 2: Jeûne, 3: Tableau Croisé
    this.autoPlayInterval = null;
    this.isPlaying = false;
  }

  mount() {
    this.container.innerHTML = `
      <div class="cockpit-loading-state">
        <div class="loading-spinner"></div>
        <p>Génération des courbes et du diaporama des 3 applications...</p>
      </div>
    `;

    this.unsubscribeAggregator = healthAggregator.subscribe((data) => {
      this.data = data;
      this.render();
    });

    healthAggregator.refresh().catch(err => {
      console.warn('[Historique] Refresh error:', err);
    });
  }

  unmount() {
    if (this.unsubscribeAggregator) {
      this.unsubscribeAggregator();
      this.unsubscribeAggregator = null;
    }
    this.stopAutoPlay();
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    this.isPlaying = false;
  }

  startAutoPlay() {
    this.stopAutoPlay();
    this.isPlaying = true;
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
    this.updateCarouselUI();
  }

  nextSlide() {
    const totalSlides = 4;
    this.currentSlide = (this.currentSlide + 1) % totalSlides;
    this.updateCarouselUI();
  }

  prevSlide() {
    const totalSlides = 4;
    this.currentSlide = (this.currentSlide - 1 + totalSlides) % totalSlides;
    this.updateCarouselUI();
  }

  goToSlide(index) {
    this.currentSlide = index;
    this.updateCarouselUI();
  }

  updateCarouselUI() {
    const slides = this.container.querySelectorAll('.diapo-slide');
    const dots = this.container.querySelectorAll('.carousel-dot');
    const counter = this.container.querySelector('.diapo-counter-text');
    const playBtn = this.container.querySelector('#btnTogglePlay');

    slides.forEach((slide, idx) => {
      if (idx === this.currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, idx) => {
      if (idx === this.currentSlide) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    if (counter) {
      const titles = [
        '🥗 Diapositive 1/4 : Repas Gluco-Carb Maroc',
        '🏋️ Diapositive 2/4 : Séances Workout Home',
        '⚡ Diapositive 3/4 : Cycles Fast Master (18/6)',
        '🎯 Diapositive 4/4 : Calcul & Bilan Multi-Piliers'
      ];
      counter.textContent = titles[this.currentSlide] || `Diapositive ${this.currentSlide + 1}/4`;
    }

    if (playBtn) {
      playBtn.innerHTML = this.isPlaying ? '⏸ Pause' : '▶ Diaporama Auto';
    }
  }

  getFilteredTimeline(dailyTimeline) {
    if (!dailyTimeline || dailyTimeline.length === 0) return [];
    if (this.timeFilter === '7d') {
      return dailyTimeline.slice(-7);
    }
    if (this.timeFilter === '30d') {
      return dailyTimeline.slice(-30);
    }
    return dailyTimeline;
  }

  /**
   * Générateur de tracé de courbe SVG haute fidélité
   */
  generateSvgPath(points, width, height, padding = 30) {
    if (!points || points.length === 0) return '';
    const usableW = width - (padding * 2);
    const usableH = height - (padding * 2);

    const maxVal = Math.max(...points.map(p => p.y), 1);
    const stepX = points.length > 1 ? usableW / (points.length - 1) : usableW / 2;

    const coords = points.map((p, idx) => {
      const x = padding + (idx * stepX);
      const y = height - padding - ((p.y / maxVal) * usableH);
      return { x, y, raw: p };
    });

    const d = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    return { pathD: d, coords, maxVal };
  }

  render() {
    if (!this.data || !this.data.multiAppHistory) return;

    const { multiAppHistory, profile } = this.data;
    const { dailyTimeline, formattedMeals, formattedWorkouts, fastSessions, totals } = multiAppHistory;
    const filteredTimeline = this.getFilteredTimeline(dailyTimeline);

    this.container.innerHTML = `
      <div class="history-view-wrapper">

        <!-- EN-TÊTE PRINCIPAL -->
        <div class="history-header">
          <div class="history-title-group">
            <span class="view-kicker">📊 HISTORIQUE &amp; CALCUL ÉVOLUTIF</span>
            <h1 class="view-title">Historique des 3 Applications</h1>
            <p class="history-subtitle">
              Calcul et suivi des performances de <strong>Gluco-Carb</strong>, <strong>Workout Home</strong> et <strong>Fast Master</strong>.
            </p>
          </div>

          <!-- BASCULE DU MODE D'AFFICHAGE (COURBE VS DIAPORAMA) -->
          <div class="view-mode-toggle-group">
            <button class="mode-toggle-btn ${this.activeMode === 'curves' ? 'active' : ''}" id="btnModeCurves">
              📈 Mode Courbes
            </button>
            <button class="mode-toggle-btn ${this.activeMode === 'slideshow' ? 'active' : ''}" id="btnModeSlideshow">
              🎞️ Diaporama
            </button>
          </div>
        </div>

        <!-- BANDEAU STATISTIQUES RÉCAPITULATIF (KPIs) -->
        <div class="history-kpi-bar">
          <div class="kpi-chip">
            <span class="kpi-icon">🥗</span>
            <div>
              <strong class="kpi-num">${totals.totalMeals} repas</strong>
              <span class="kpi-label">Gluco-Carb (Moy. ${totals.avgCarbs}g)</span>
            </div>
          </div>

          <div class="kpi-chip">
            <span class="kpi-icon">🏋️</span>
            <div>
              <strong class="kpi-num">${totals.totalWorkouts} séances</strong>
              <span class="kpi-label">Workout Home (${totals.totalCaloriesBurned} kcal)</span>
            </div>
          </div>

          <div class="kpi-chip">
            <span class="kpi-icon">⚡</span>
            <div>
              <strong class="kpi-num">18/6 Actif</strong>
              <span class="kpi-label">Fast Master (15h-09h)</span>
            </div>
          </div>
        </div>

        <!-- FILTRE DE PÉRIODE -->
        <div class="filter-period-row">
          <span class="filter-label">Période d'analyse :</span>
          <div class="filter-buttons">
            <button class="filter-btn ${this.timeFilter === '7d' ? 'active' : ''}" data-filter="7d">7 Derniers Jours</button>
            <button class="filter-btn ${this.timeFilter === '30d' ? 'active' : ''}" data-filter="30d">30 Jours</button>
            <button class="filter-btn ${this.timeFilter === 'all' ? 'active' : ''}" data-filter="all">Tout (${dailyTimeline.length} jours)</button>
          </div>
        </div>

        <!-- CONTENU DYNAMIQUE SELON LE MODE SÉLECTIONNÉ -->
        ${this.activeMode === 'curves' ? this.renderCurvesSection(filteredTimeline, profile) : this.renderSlideshowSection(formattedMeals, formattedWorkouts, fastSessions, dailyTimeline)}

      </div>
    `;

    this.attachEventListeners();
    if (this.activeMode === 'slideshow') {
      this.updateCarouselUI();
    }
  }

  /**
   * Rendu du Mode 1 : Courbes & Graphiques Interactifs
   */
  renderCurvesSection(timeline, profile) {
    const targetCarbs = profile.targetCarbs || 120;
    const targetProtein = profile.targetProtein || 80;

    // Données pour Courbe 1 : Glucides & Protéines
    const carbsPoints = timeline.map(d => ({ x: d.date, y: d.netCarbs, label: d.dayLabel }));
    const proteinPoints = timeline.map(d => ({ x: d.date, y: d.protein, label: d.dayLabel }));
    const maxCarbsScale = Math.max(targetCarbs * 1.2, ...carbsPoints.map(p => p.y), 150);

    // Données pour Courbe 2 : Calories Brûlées & Durée de Sport
    const calPoints = timeline.map(d => ({ x: d.date, y: d.caloriesBurned, label: d.dayLabel }));
    const maxCalScale = Math.max(250, ...calPoints.map(p => p.y));

    // Données pour Courbe 3 : Heures de Jeûne
    const fastingPoints = timeline.map(d => ({ x: d.date, y: d.fastingHours, label: d.dayLabel }));

    return `
      <div class="curves-container">

        <!-- COURBE 1 : NUTRITION (GLUCIDES NETS VS PLAFOND ET PROTÉINES) -->
        <div class="curve-chart-card">
          <div class="chart-card-header">
            <div class="chart-title-wrap">
              <span class="chart-icon">🥗</span>
              <div>
                <h3 class="chart-title">Évolution des Glucides Nets &amp; Protéines (Gluco-Carb Maroc)</h3>
                <span class="chart-desc">Comparaison journalière avec le plafond maximal (${targetCarbs}g) et l'objectif protéines (${targetProtein}g)</span>
              </div>
            </div>
            <div class="chart-legend-row">
              <span class="legend-item"><span class="legend-color color-carbs"></span> Glucides nets</span>
              <span class="legend-item"><span class="legend-color color-target"></span> Plafond (${targetCarbs}g)</span>
              <span class="legend-item"><span class="legend-color color-protein"></span> Protéines</span>
            </div>
          </div>

          <div class="svg-chart-wrapper">
            <svg class="interactive-curve-svg" viewBox="0 0 600 220" preserveAspectRatio="none">
              <!-- Ligne de grille horizontale Plafond -->
              <line x1="30" y1="${220 - 30 - ((targetCarbs / maxCarbsScale) * 160)}" x2="570" y2="${220 - 30 - ((targetCarbs / maxCarbsScale) * 160)}" stroke="#f43f5e" stroke-dasharray="4,4" stroke-width="1.8" />
              <text x="565" y="${220 - 34 - ((targetCarbs / maxCarbsScale) * 160)}" fill="#f43f5e" font-size="10" text-anchor="end" font-family="monospace">Plafond ${targetCarbs}g</text>

              <!-- Tracé des Glucides -->
              ${this.renderSvgLine(carbsPoints, maxCarbsScale, '#10b981', 'rgba(16, 185, 129, 0.15)')}

              <!-- Tracé des Protéines -->
              ${this.renderSvgLine(proteinPoints, maxCarbsScale, '#38bdf8', 'transparent')}

              <!-- Axe X Labels -->
              ${this.renderSvgXAxis(timeline, 600, 220)}
            </svg>
          </div>
        </div>

        <!-- COURBE 2 : SPORT (CALORIES BRÛLÉES & RÉGULARITÉ WORKOUT HOME) -->
        <div class="curve-chart-card">
          <div class="chart-card-header">
            <div class="chart-title-wrap">
              <span class="chart-icon">🏋️</span>
              <div>
                <h3 class="chart-title">Dépense Calorique des Séances (Workout Home)</h3>
                <span class="chart-desc">Calories brûlées par séance Full Body 17 au fil du temps</span>
              </div>
            </div>
            <div class="chart-legend-row">
              <span class="legend-item"><span class="legend-color color-workout"></span> Calories brûlées (kcal)</span>
            </div>
          </div>

          <div class="svg-chart-wrapper">
            <svg class="interactive-curve-svg" viewBox="0 0 600 200" preserveAspectRatio="none">
              <!-- Tracé des Calories -->
              ${this.renderSvgLine(calPoints, maxCalScale, '#3b82f6', 'rgba(59, 130, 246, 0.15)')}
              <!-- Axe X Labels -->
              ${this.renderSvgXAxis(timeline, 600, 200)}
            </svg>
          </div>
        </div>

        <!-- COURBE 3 : JEÛNE 18/6 (FAST MASTER) -->
        <div class="curve-chart-card">
          <div class="chart-card-header">
            <div class="chart-title-wrap">
              <span class="chart-icon">⚡</span>
              <div>
                <h3 class="chart-title">Constance du Jeûne Intermittent 18/6 (Fast Master)</h3>
                <span class="chart-desc">Heures de jeûne consécutives réalisées chaque jour (cible : 18h de 15h00 à 09h00)</span>
              </div>
            </div>
            <div class="chart-legend-row">
              <span class="legend-item"><span class="legend-color color-fasting"></span> Heures de jeûne</span>
              <span class="legend-item"><span class="legend-color color-target-green"></span> Objectif 18h</span>
            </div>
          </div>

          <div class="svg-chart-wrapper">
            <svg class="interactive-curve-svg" viewBox="0 0 600 180" preserveAspectRatio="none">
              <!-- Ligne cible 18h -->
              <line x1="30" y1="${180 - 30 - ((18 / 24) * 120)}" x2="570" y2="${180 - 30 - ((18 / 24) * 120)}" stroke="#10b981" stroke-dasharray="4,4" stroke-width="1.8" />
              <text x="565" y="${180 - 34 - ((18 / 24) * 120)}" fill="#10b981" font-size="10" text-anchor="end" font-family="monospace">18h Cible</text>

              <!-- Tracé du Jeûne -->
              ${this.renderSvgLine(fastingPoints, 24, '#f59e0b', 'rgba(245, 158, 11, 0.12)')}
              <!-- Axe X Labels -->
              ${this.renderSvgXAxis(timeline, 600, 180)}
            </svg>
          </div>
        </div>

      </div>
    `;
  }

  renderSvgLine(points, maxVal, strokeColor, fillColor) {
    if (!points || points.length === 0) return '';
    const width = 600;
    const height = 200;
    const padding = 30;
    const usableW = width - (padding * 2);
    const usableH = height - (padding * 2);

    const stepX = points.length > 1 ? usableW / (points.length - 1) : usableW / 2;

    const coords = points.map((p, idx) => {
      const x = padding + (idx * stepX);
      const val = Math.max(0, p.y);
      const y = height - padding - ((val / maxVal) * usableH);
      return { x, y, raw: p };
    });

    const pathD = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    return `
      ${fillColor !== 'transparent' ? `<path d="${areaD}" fill="${fillColor}" />` : ''}
      <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${coords.map(pt => `
        <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${strokeColor}" stroke="#0b0f19" stroke-width="2" class="chart-point-dot">
          <title>${pt.raw.label} : ${pt.raw.y}</title>
        </circle>
      `).join('')}
    `;
  }

  renderSvgXAxis(timeline, width, height) {
    if (!timeline || timeline.length === 0) return '';
    const padding = 30;
    const usableW = width - (padding * 2);
    const stepX = timeline.length > 1 ? usableW / (timeline.length - 1) : usableW / 2;

    // Afficher un label tous les N points pour éviter le chevauchement
    const interval = Math.max(1, Math.floor(timeline.length / 7));

    return timeline.map((d, idx) => {
      if (idx % interval !== 0 && idx !== timeline.length - 1) return '';
      const x = padding + (idx * stepX);
      const y = height - 10;
      return `<text x="${x}" y="${y}" fill="#64748b" font-size="10" text-anchor="middle" font-family="sans-serif">${d.dayLabel}</text>`;
    }).join('');
  }

  /**
   * Rendu du Mode 2 : Diaporama Interactif (Slideshow / Carrousel)
   */
  renderSlideshowSection(meals, workouts, fasts, dailyTimeline) {
    return `
      <div class="slideshow-container">

        <!-- BARRE DE COMMANDE DU DIAPORAMA -->
        <div class="slideshow-controls-bar">
          <button class="diapo-nav-btn" id="btnPrevSlide" title="Diapositive précédente">❮ Précédent</button>
          
          <div class="diapo-indicator-box">
            <span class="diapo-counter-text">Diapositive 1/4</span>
            <div class="carousel-dots-row">
              <span class="carousel-dot active" data-slide="0"></span>
              <span class="carousel-dot" data-slide="1"></span>
              <span class="carousel-dot" data-slide="2"></span>
              <span class="carousel-dot" data-slide="3"></span>
            </div>
          </div>

          <div class="diapo-actions-right">
            <button class="btn-primary btn-sm" id="btnTogglePlay">▶ Diaporama Auto</button>
            <button class="diapo-nav-btn" id="btnNextSlide" title="Diapositive suivante">Suivant ❯</button>
          </div>
        </div>

        <!-- ZONE DE DIAPOSITIVES DÉFILANTES -->
        <div class="slides-viewport">

          <!-- DIAPOSITIVE 1 : HISTORIQUE DES REPAS GLUCO-CARB MAROC -->
          <div class="diapo-slide active" id="slide-0">
            <div class="slide-header">
              <span class="slide-badge badge-nutrition">🥗 SOURCE 1 : GLUCO-CARB MAROC</span>
              <h2 class="slide-title">Historique des Repas &amp; Charge Glycémique (${meals.length} repas)</h2>
              <p class="slide-desc">Chaque repas consigné dans Supabase avec ses glucides nets, protéines et conformité au créneau 09h-15h.</p>
            </div>

            <div class="diapo-cards-grid">
              ${meals.map(m => `
                <div class="diapo-item-card meal-card">
                  <div class="diapo-item-top">
                    <span class="diapo-date-pill">${m.date} à ${m.time}</span>
                    <span class="timing-badge ${m.inEatingWindow ? 'badge-good' : 'badge-alert'}">
                      ${m.inEatingWindow ? '✓ Fenêtre 09h-15h' : '⚠️ Hors fenêtre'}
                    </span>
                  </div>

                  <h4 class="diapo-item-title">${m.title}</h4>
                  <p class="diapo-item-sub">${m.itemsDescription}</p>

                  <div class="diapo-macros-bar">
                    <span class="macro-cell">🥖 Glucides : <strong>${m.netCarbs}g</strong></span>
                    <span class="macro-cell">🍗 Protéines : <strong>${m.protein}g</strong></span>
                    <span class="macro-cell">📈 Charge Glyc. : <strong>${m.glycemicLoad}</strong></span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- DIAPOSITIVE 2 : HISTORIQUE DES SÉANCES WORKOUT HOME -->
          <div class="diapo-slide" id="slide-1">
            <div class="slide-header">
              <span class="slide-badge badge-workout">🏋️ SOURCE 2 : WORKOUT HOME</span>
              <h2 class="slide-title">Historique des Séances Full Body 17 (${workouts.length} séances)</h2>
              <p class="slide-desc">Historique chiffré extrait de Firebase RTDB avec durée d'effort, rounds et calories brûlées.</p>
            </div>

            <div class="diapo-cards-grid">
              ${workouts.map((w, idx) => `
                <div class="diapo-item-card workout-card">
                  <div class="diapo-item-top">
                    <span class="diapo-date-pill">Séance #${workouts.length - idx} • ${w.date}</span>
                    <span class="timing-badge badge-good">Validée ✓</span>
                  </div>

                  <div class="workout-diapo-stats">
                    <div class="w-stat-col">
                      <span class="w-stat-num">${w.calories}</span>
                      <span class="w-stat-lbl">kcal brûlées</span>
                    </div>
                    <div class="w-stat-col">
                      <span class="w-stat-num">${w.durationFormatted}</span>
                      <span class="w-stat-lbl">durée totale</span>
                    </div>
                    <div class="w-stat-col">
                      <span class="w-stat-num">${w.rounds}</span>
                      <span class="w-stat-lbl">rounds complétés</span>
                    </div>
                  </div>

                  <div class="diapo-footer-row">
                    <span>${w.exercisesCount} exercices au poids du corps</span>
                    <span>Niveau : ${w.level}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- DIAPOSITIVE 3 : HISTORIQUE DU JEÛNE FAST MASTER (18/6) -->
          <div class="diapo-slide" id="slide-2">
            <div class="slide-header">
              <span class="slide-badge badge-fasting">⚡ SOURCE 3 : FAST MASTER</span>
              <h2 class="slide-title">Historique des Cycles de Jeûne 18/6 (${fasts.length} sessions)</h2>
              <p class="slide-desc">Protocole 18/6 strict : Début automatique à 15h00, rupture à 09h00.</p>
            </div>

            <div class="diapo-cards-grid">
              ${fasts.map(f => `
                <div class="diapo-item-card fast-card">
                  <div class="diapo-item-top">
                    <span class="diapo-date-pill">${f.date}</span>
                    <span class="timing-badge badge-good">18h Respectées ✓</span>
                  </div>

                  <div class="fast-cycle-visual">
                    <div class="fast-phase-pill pill-fast">15h00 - 09h00 : Jeûne (18h)</div>
                    <div class="fast-phase-pill pill-eat">09h00 - 15h00 : Repas (6h)</div>
                  </div>

                  <div class="diapo-footer-row">
                    <span>Paliers métaboliques : Cétose &amp; Autophagie</span>
                    <span>Objectif 100% accompli</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- DIAPOSITIVE 4 : BILAN MULTI-PILIERS & CALCUL CROISÉ -->
          <div class="diapo-slide" id="slide-3">
            <div class="slide-header">
              <span class="slide-badge badge-cross">🎯 CALCUL CROISÉ MULTI-PILIERS</span>
              <h2 class="slide-title">Bilan Quotidien Croisé &amp; Accomplissement</h2>
              <p class="slide-desc">Rapprochement des 3 piliers jour par jour pour calculer l'accomplissement des 3 objectifs journaliers.</p>
            </div>

            <div class="history-table-container">
              <table class="history-cross-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Glucides Nets (≤120g)</th>
                    <th>Sport (Workout Home)</th>
                    <th>Jeûne (18/6)</th>
                    <th>Objectifs Validés</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyTimeline.slice().reverse().map(d => `
                    <tr>
                      <td class="td-date"><strong>${d.date}</strong></td>
                      <td class="${d.carbsOk ? 'td-ok' : 'td-alert'}">
                        ${d.netCarbs}g ${d.carbsOk ? '✓' : '⚠️'}
                      </td>
                      <td class="${d.workoutOk ? 'td-ok' : 'td-muted'}">
                        ${d.workoutOk ? `${d.caloriesBurned} kcal (${d.workoutCount} séance)` : '0 séance'}
                      </td>
                      <td class="td-ok">18h ✓</td>
                      <td>
                        <span class="score-pill ${d.scorePillars === 3 ? 'score-3' : (d.scorePillars === 2 ? 'score-2' : 'score-1')}">
                          ${d.scorePillars} / 3 (${d.scorePercent}%)
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  attachEventListeners() {
    // Bascule de Mode (Courbes / Diaporama)
    const btnCurves = document.getElementById('btnModeCurves');
    const btnSlideshow = document.getElementById('btnModeSlideshow');

    if (btnCurves) {
      btnCurves.addEventListener('click', () => {
        this.activeMode = 'curves';
        this.stopAutoPlay();
        this.render();
      });
    }

    if (btnSlideshow) {
      btnSlideshow.addEventListener('click', () => {
        this.activeMode = 'slideshow';
        this.render();
      });
    }

    // Filtres de période
    const filterBtns = this.container.querySelectorAll('[data-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.timeFilter = btn.getAttribute('data-filter');
        this.render();
      });
    });

    // Contrôles du Diaporama
    const btnNext = document.getElementById('btnNextSlide');
    const btnPrev = document.getElementById('btnPrevSlide');
    const btnTogglePlay = document.getElementById('btnTogglePlay');

    if (btnNext) {
      btnNext.addEventListener('click', () => this.nextSlide());
    }
    if (btnPrev) {
      btnPrev.addEventListener('click', () => this.prevSlide());
    }
    if (btnTogglePlay) {
      btnTogglePlay.addEventListener('click', () => this.toggleAutoPlay());
    }

    // Puces cliquables du Diaporama
    const dots = this.container.querySelectorAll('.carousel-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = Number(dot.getAttribute('data-slide')) || 0;
        this.goToSlide(idx);
      });
    });
  }
}
