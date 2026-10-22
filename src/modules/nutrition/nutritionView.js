/**
 * Nutrition View Controller - Health & Vitality Hub
 * Calculateur de Glucides, Amorti Glycémique & Nutrition Marocaine.
 */

import { MOROCCAN_FOODS, PRESET_PLATES, FoodRepository } from './foodsData.js';
import { MetabolicEngine } from './nutritionEngine.js';
import { appStore } from '../../core/store.js';
import { ICONS } from '../../ui/icons.js';

export class NutritionView {
  constructor(container) {
    this.container = container;
    this.currentPlateItems = []; // [{ foodId, grams, customName }]
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.activeMealType = 'Déjeuner';
  }

  mount() {
    this.render();
  }

  unmount() {
    // Nettoyage si nécessaire
  }

  render() {
    const todayNetCarbs = appStore.getTodayNetCarbs();
    const todayProtein = appStore.getTodayProtein();
    const todayGL = appStore.getTodayGlycemicLoad();
    const carbsTarget = appStore.state.user.carbsDailyTarget || 120;
    const proteinTarget = appStore.state.user.proteinDailyTarget || 80;
    const carbsPct = Math.min(100, Math.round((todayNetCarbs / carbsTarget) * 100));
    const proteinPct = Math.min(100, Math.round((todayProtein / proteinTarget) * 100));

    // Évaluation en direct de l'assiette en cours
    const plateEval = MetabolicEngine.evaluatePlate(this.currentPlateItems);

    this.container.innerHTML = `
      <div class="view-header">
        <div>
          <span class="view-badge">GLUCO-CARB MAROC</span>
          <h1 class="view-title">Nutrition & Glucides</h1>
        </div>
        <div class="header-icon-badge">${ICONS.nutrition}</div>
      </div>

      <!-- RÉCAPITULATIF JOURNALIER -->
      <div class="daily-summary-card">
        <div class="daily-summary-header">
          <span class="daily-title">Cumul Nutritionnel du Jour</span>
          <span class="daily-date">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        <div class="macros-grid">
          <!-- Glucides Nets -->
          <div class="macro-box">
            <div class="macro-label-row">
              <span class="macro-name">Glucides Nets</span>
              <span class="macro-val"><strong>${Math.round(todayNetCarbs)}g</strong> / ${carbsTarget}g</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar ${carbsPct > 100 ? 'bar-danger' : (carbsPct > 80 ? 'bar-warning' : 'bar-primary')}" style="width: ${carbsPct}%;"></div>
            </div>
            <span class="macro-hint">${carbsPct}% de la limite quotidienne</span>
          </div>

          <!-- Protéines -->
          <div class="macro-box">
            <div class="macro-label-row">
              <span class="macro-name">Protéines</span>
              <span class="macro-val"><strong>${Math.round(todayProtein)}g</strong> / ${proteinTarget}g</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-emerald" style="width: ${proteinPct}%;"></div>
            </div>
            <span class="macro-hint">${proteinPct}% de l'objectif anabolique</span>
          </div>
        </div>

        <div class="daily-substats">
          <div class="substat-item">
            <span class="substat-label">Charge Glycémique :</span>
            <strong class="substat-value">${Math.round(todayGL)} (${todayGL > 120 ? 'Élevée' : (todayGL > 80 ? 'Modérée' : 'Basse')})</strong>
          </div>
          <div class="substat-item">
            <span class="substat-label">Repas enregistrés :</span>
            <strong class="substat-value">${appStore.getTodayMeals().length}</strong>
          </div>
        </div>
      </div>

      <!-- ASSIETTE EN COURS DE COMPOSITION -->
      <div class="section-card">
        <div class="section-header-flex">
          <div>
            <h2 class="section-title">Composez votre Assiette</h2>
            <p class="section-subtitle">Calculez les glucides nets, l'indice d'amorti et la charge glycémique.</p>
          </div>
          <div class="meal-type-selector">
            ${['Déjeuner', 'Collation', 'Dîner'].map(type => `
              <button class="type-pill ${this.activeMealType === type ? 'active' : ''}" data-meal-type="${type}">
                ${type}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- RACCOURCIS PLATS TYPES DU MAROC -->
        <div class="preset-plates-scroll">
          <span class="preset-label">Idées Express :</span>
          <button class="preset-btn" data-preset="tajine_khobz">🥘 Tajine & Khobz</button>
          <button class="preset-btn" data-preset="jeune_10h">🍳 Oufs & Jben Beldi</button>
          <button class="preset-btn" data-preset="jeune_15h_poulet">🍗 Poulet & Salade</button>
          <button class="preset-btn" data-preset="couscous_royal">🍲 Couscous 7 Légumes</button>
          <button class="preset-btn" data-preset="ftour_marocain">🥞 Ftour Beldi</button>
          <button class="preset-btn" data-preset="harira_chebakia">🥣 Harira & Datte</button>
        </div>

        <!-- LISTE DES ALIMENTS DANS L'ASSIETTE -->
        <div class="plate-items-container">
          ${this.currentPlateItems.length === 0 ? `
            <div class="empty-plate-hint">
              <span class="empty-icon">🍽️</span>
              <p>Votre assiette est vide pour le moment.</p>
              <span class="empty-sub">Sélectionnez un plat express ci-dessus ou cherchez un aliment marocain dans le catalogue ci-dessous.</span>
            </div>
          ` : `
            <div class="plate-list">
              ${this.currentPlateItems.map((item, idx) => {
                const food = FoodRepository.getFoodById(item.foodId) || { name: item.customName || 'Aliment', carbs100g: 20, protein100g: 5, fiber100g: 1, gi: 50 };
                const factor = item.grams / 100;
                const netCarbs = Math.max(0, (food.carbs100g - food.fiber100g) * factor);
                const protein = (food.protein100g || 0) * factor;

                return `
                  <div class="plate-item-row" data-index="${idx}">
                    <div class="item-info">
                      <div class="item-name">${food.name}</div>
                      <div class="item-darija">${food.darija || ''}</div>
                      <div class="item-macros-detail">
                        <span>${Math.round(netCarbs * 10) / 10}g glucides nets</span> · 
                        <span>${Math.round(protein * 10) / 10}g protéines</span>
                      </div>
                    </div>

                    <div class="item-stepper-wrap">
                      <button class="step-btn step-minus" data-index="${idx}">-</button>
                      <input type="number" class="grams-input" data-index="${idx}" value="${item.grams}" min="5" max="1500" step="5" />
                      <span class="unit-label">g</span>
                      <button class="step-btn step-plus" data-index="${idx}">+</button>
                    </div>

                    <button class="btn-remove-item" data-index="${idx}" title="Supprimer">
                      ${ICONS.trash}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- ANALYSE MÉTABOLIQUE DE L'ASSIETTE -->
            <div class="plate-verdict-box ${plateEval.verdict.boxClass}">
              <div class="verdict-header">
                <span class="verdict-tag">${plateEval.verdict.tag}</span>
                <span class="amorti-badge ${plateEval.amorti.badgeClass}">${plateEval.amorti.badgeText}</span>
              </div>
              <h3 class="verdict-title">${plateEval.verdict.headline}</h3>
              <p class="verdict-desc">${plateEval.verdict.description}</p>

              <div class="verdict-metrics-grid">
                <div class="v-metric">
                  <span class="vm-val">${plateEval.netCarbs}g</span>
                  <span class="vm-lbl">Glucides Nets</span>
                </div>
                <div class="v-metric">
                  <span class="vm-val">${plateEval.totalProtein}g</span>
                  <span class="vm-lbl">Protéines</span>
                </div>
                <div class="v-metric">
                  <span class="vm-val">${plateEval.totalFiber}g</span>
                  <span class="vm-lbl">Fibres</span>
                </div>
                <div class="v-metric">
                  <span class="vm-val">${plateEval.totalGL}</span>
                  <span class="vm-lbl">Charge Glyc.</span>
                </div>
                <div class="v-metric">
                  <span class="vm-val">${plateEval.amorti.ratioText}</span>
                  <span class="vm-lbl">Indice Amorti</span>
                </div>
              </div>

              <div class="plate-actions-row">
                <button id="btnLogMeal" class="btn-primary flex-1">
                  ${ICONS.check} Enregistrer ce ${this.activeMealType} (${plateEval.netCarbs}g glucides)
                </button>
                <button id="btnClearPlate" class="btn-secondary">
                  Vider
                </button>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- CATALOGUE DES ALIMENTS MAROCAINS -->
      <div class="section-card">
        <h2 class="section-title">Catalogue Nutritionnel Marocain</h2>

        <!-- Barre de recherche -->
        <div class="search-box-wrap">
          <input
            type="search"
            id="foodSearchInput"
            class="search-input"
            placeholder="Rechercher (ex: Khobz, Tajine, Msemen, Harira, Dattes...)"
            value="${this.searchQuery}"
          />
        </div>

        <!-- Filtres par catégorie -->
        <div class="categories-bar">
          ${[
            { id: 'all', label: 'Tous' },
            { id: 'plats', label: 'Tajines & Plats' },
            { id: 'pains', label: 'Pains & Galettes' },
            { id: 'patisseries', label: 'Gâteaux & Pâtisseries' },
            { id: 'fruits', label: 'Fruits & Sucres' },
            { id: 'boissons', label: 'Boissons & Thés' }
          ].map(cat => `
            <button class="cat-pill ${this.selectedCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
              ${cat.label}
            </button>
          `).join('')}
        </div>

        <!-- Grille des aliments filtrés -->
        <div class="foods-grid">
          ${this.getFilteredFoods().map(food => {
            return `
              <div class="food-card" data-food-id="${food.id}">
                <div class="food-card-top">
                  <div>
                    <h4 class="food-name">${food.name}</h4>
                    <span class="food-darija">${food.darija || ''}</span>
                  </div>
                  <button class="btn-add-food" data-food-id="${food.id}" title="Ajouter à l'assiette">
                    ${ICONS.plus}
                  </button>
                </div>
                <div class="food-portion-hint">Portion type : ${food.refPortion || `${food.defaultGrams}g`}</div>
                <div class="food-macros-chips">
                  <span class="chip-macro chip-carbs">${Math.round(food.carbs100g - food.fiber100g)}g glucides nets/100g</span>
                  <span class="chip-macro chip-prot">${food.protein100g}g prot</span>
                  <span class="chip-macro chip-gi">IG ${food.gi}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- JOURNAL DES REPAS DU JOUR -->
      ${appStore.getTodayMeals().length > 0 ? `
        <div class="section-card">
          <h2 class="section-title">Journal des Repas du Jour</h2>
          <div class="meals-history-list">
            ${appStore.getTodayMeals().map(meal => `
              <div class="meal-log-card">
                <div class="meal-log-header">
                  <div>
                    <span class="meal-type-tag">${meal.mealType} · ${meal.timeFormatted}</span>
                    <h4 class="meal-log-title">${meal.title}</h4>
                  </div>
                  <button class="btn-delete-meal" data-meal-id="${meal.id}" title="Supprimer ce repas">
                    ${ICONS.trash}
                  </button>
                </div>
                <div class="meal-items-summary">
                  ${(meal.items || []).map(it => {
                    const f = FoodRepository.getFoodById(it.foodId);
                    return `<span>${f ? f.name.split('(')[0] : 'Aliment'} (${it.grams}g)</span>`;
                  }).join(', ')}
                </div>
                <div class="meal-log-footer">
                  <span class="badge-carb">${meal.totalNetCarbs}g glucides nets</span>
                  <span class="badge-prot">${meal.totalProtein}g protéines</span>
                  <span class="badge-gl">CG ${meal.totalGL}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    this.bindEvents();
  }

  getFilteredFoods() {
    const q = this.searchQuery.trim().toLowerCase();
    return MOROCCAN_FOODS.filter(food => {
      const matchCat = this.selectedCategory === 'all' || food.category === this.selectedCategory;
      const matchQuery = !q ||
        food.name.toLowerCase().includes(q) ||
        (food.darija && food.darija.toLowerCase().includes(q)) ||
        (food.id && food.id.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }

  bindEvents() {
    // Changement de type de repas
    this.container.querySelectorAll('.type-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeMealType = btn.dataset.mealType;
        this.render();
      });
    });

    // Raccourcis presets
    this.container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.preset;
        const plate = PRESET_PLATES[key];
        if (plate && plate.items) {
          this.currentPlateItems = plate.items.map(it => ({
            foodId: it.foodId,
            grams: it.grams
          }));
          this.render();
        }
      });
    });

    // Recherche d'aliment
    const searchInput = this.container.querySelector('#foodSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        const grid = this.container.querySelector('.foods-grid');
        if (grid) {
          grid.innerHTML = this.getFilteredFoods().map(food => `
            <div class="food-card" data-food-id="${food.id}">
              <div class="food-card-top">
                <div>
                  <h4 class="food-name">${food.name}</h4>
                  <span class="food-darija">${food.darija || ''}</span>
                </div>
                <button class="btn-add-food" data-food-id="${food.id}" title="Ajouter à l'assiette">
                  ${ICONS.plus}
                </button>
              </div>
              <div class="food-portion-hint">Portion type : ${food.refPortion || `${food.defaultGrams}g`}</div>
              <div class="food-macros-chips">
                <span class="chip-macro chip-carbs">${Math.round(food.carbs100g - food.fiber100g)}g glucides nets/100g</span>
                <span class="chip-macro chip-prot">${food.protein100g}g prot</span>
                <span class="chip-macro chip-gi">IG ${food.gi}</span>
              </div>
            </div>
          `).join('');
          this.bindAddButtons(grid);
        }
      });
    }

    // Filtres catégorie
    this.container.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.dataset.cat;
        this.render();
      });
    });

    // Boutons d'ajout d'aliment
    this.bindAddButtons(this.container);

    // Ajustement des grammages dans l'assiette
    this.container.querySelectorAll('.step-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (this.currentPlateItems[idx]) {
          this.currentPlateItems[idx].grams = Math.max(10, this.currentPlateItems[idx].grams - 15);
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.step-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (this.currentPlateItems[idx]) {
          this.currentPlateItems[idx].grams += 15;
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.grams-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = parseInt(inp.dataset.index, 10);
        const val = parseInt(inp.value, 10);
        if (this.currentPlateItems[idx] && !isNaN(val) && val > 0) {
          this.currentPlateItems[idx].grams = val;
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.currentPlateItems.splice(idx, 1);
        this.render();
      });
    });

    // Vider l'assiette
    const btnClear = this.container.querySelector('#btnClearPlate');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.currentPlateItems = [];
        this.render();
      });
    }

    // Enregistrer le repas
    const btnLog = this.container.querySelector('#btnLogMeal');
    if (btnLog) {
      btnLog.addEventListener('click', () => {
        if (this.currentPlateItems.length === 0) return;
        const plateEval = MetabolicEngine.evaluatePlate(this.currentPlateItems);

        appStore.logMeal({
          mealType: this.activeMealType,
          title: `${this.activeMealType} (${this.currentPlateItems.length} aliments)`,
          items: [...this.currentPlateItems],
          totalGrams: plateEval.totalGrams,
          totalNetCarbs: plateEval.netCarbs,
          totalProtein: plateEval.totalProtein,
          totalFiber: plateEval.totalFiber,
          totalGL: plateEval.totalGL,
          amortiScore: plateEval.amorti.status
        });

        this.currentPlateItems = [];
        this.render();
      });
    }

    // Supprimer un repas du journal
    this.container.querySelectorAll('.btn-delete-meal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.mealId;
        if (confirm("Supprimer ce repas du journal d'aujourd'hui ?")) {
          appStore.removeMeal(id);
          this.render();
        }
      });
    });
  }

  bindAddButtons(rootElement) {
    rootElement.querySelectorAll('.btn-add-food').forEach(btn => {
      btn.addEventListener('click', () => {
        const foodId = btn.dataset.foodId;
        const food = FoodRepository.getFoodById(foodId);
        if (food) {
          const existing = this.currentPlateItems.find(it => it.foodId === foodId);
          if (existing) {
            existing.grams += (food.defaultGrams || 100);
          } else {
            this.currentPlateItems.push({
              foodId: food.id,
              grams: food.defaultGrams || 100
            });
          }
          this.render();
        }
      });
    });
  }
}
