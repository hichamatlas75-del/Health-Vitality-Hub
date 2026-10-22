/**
 * Données & Protocoles de Jeûne Intermittent - Fast Master adapté
 */

export const FASTING_PLANS = {
  PLAN_16_8: {
    key: 'PLAN_16_8',
    name: '16:8 Le Classique',
    fastingHours: 16,
    eatingHours: 8,
    emoji: '⚡',
    difficulty: 'Débutant',
    desc: '16h de jeûne et 8h d\'alimentation. Le protocole d\'or le plus accessible et équilibré.'
  },
  PLAN_18_6: {
    key: 'PLAN_18_6',
    name: '18:6 Brûle-Graisse',
    fastingHours: 18,
    eatingHours: 6,
    emoji: '🔥',
    difficulty: 'Intermédiaire',
    desc: '18h de jeûne. Accélère la combustion des graisses, stabilise la glycémie et déclenche l\'autophagie.'
  },
  PLAN_20_4: {
    key: 'PLAN_20_4',
    name: '20:4 Warrior',
    fastingHours: 20,
    eatingHours: 4,
    emoji: '🛡️',
    difficulty: 'Avancé',
    desc: '20h de jeûne, fenêtre de 4h pour manger. Résultats métaboliques et détox intensifiés.'
  },
  PLAN_OMAD: {
    key: 'PLAN_OMAD',
    name: 'OMAD (23:1)',
    fastingHours: 23,
    eatingHours: 1,
    emoji: '👑',
    difficulty: 'Expert',
    desc: 'Un seul repas complet et nutritif par jour. Autophagie profonde et clarté mentale absolue.'
  },
  PLAN_FLEXIBLE_16_8: {
    key: 'PLAN_FLEXIBLE_16_8',
    name: '16:8 Flexible Week-End',
    fastingHours: 16,
    eatingHours: 8,
    emoji: '🌿',
    difficulty: 'Adaptatif',
    desc: '16:8 du Lundi au Vendredi, pause le week-end pour s\'adapter à la vie sociale.'
  }
};

export const METABOLIC_STAGES = [
  {
    id: 1,
    name: 'Digestion',
    startHour: 0,
    endHour: 4,
    emoji: '🥣',
    color: '#94A3B8',
    shortDesc: 'Assimilation du dernier repas',
    fullDesc: 'L\'estomac et l\'intestin absorbent les nutriments. Le pancréas sécrète de l\'insuline pour acheminer le glucose dans vos cellules.',
    effects: [
      'Niveau d\'insuline élevé pour stocker le glucose',
      'Le glucose est la source d\'énergie principale',
      'Satiété naturelle post-prandiale'
    ],
    tip: 'Hydratez-vous avec de l\'eau tempérée. Évitez tout grignotage.'
  },
  {
    id: 2,
    name: 'Baisse de l\'insuline',
    startHour: 4,
    endHour: 8,
    emoji: '📉',
    color: '#38BDF8',
    shortDesc: 'Fin du stockage, baisse glycémique',
    fullDesc: 'La glycémie redescend à son niveau de base. Le foie commence à décomposer le glycogène stocké pour fournir de l\'énergie.',
    effects: [
      'Chute de l\'insuline : arrêt du stockage adipeux',
      'Déstockage du glycogène hépatique',
      'Élimination de la rétention d\'eau résiduelle'
    ],
    tip: 'Si vous ressentez une légère faim, buvez un grand verre d\'eau ou un thé vert sans sucre.'
  },
  {
    id: 3,
    name: 'Combustion des graisses',
    startHour: 8,
    endHour: 12,
    emoji: '🔥',
    color: '#FB923C',
    shortDesc: 'Lipolyse active & boost HGH',
    fullDesc: 'Le glycogène s\'épuise. Le corps commence à puiser directement dans les cellules adipeuses pour produire son carburant.',
    effects: [
      'Lipolyse active (combustion des graisses ciblée)',
      'Hormone de croissance (HGH) en hausse continue',
      'Maintien de la masse musculaire grâce aux cétones'
    ],
    tip: 'Moment parfait pour une marche digestive ou une séance de sport au poids du corps.'
  },
  {
    id: 4,
    name: 'Cétose & Clarté Mentale',
    startHour: 12,
    endHour: 18,
    emoji: '🧠',
    color: '#A855F7',
    shortDesc: 'Carburant cétonique & focus maximal',
    fullDesc: 'Le foie convertit les acides gras en corps cétoniques (BHB). Le cerveau utilise ce super-carburant propre pour une énergie sans coup de barre.',
    effects: [
      'Production hépatique de corps cétoniques',
      'Énergie cérébrale constante et clarté mentale',
      'Diminution marquée de l\'inflammation générale'
    ],
    tip: 'Profitez de ce regain de concentration pour vos tâches créatives et professionnelles.'
  },
  {
    id: 5,
    name: 'Autophagie Cellulaire',
    startHour: 18,
    endHour: 24,
    emoji: '✨',
    color: '#10B981',
    shortDesc: 'Grand nettoyage et régénération',
    fullDesc: 'Le recyclage cellulaire interne s\'active : les cellules éliminent leurs protéines endommagées, toxines et organelles défectueuses.',
    effects: [
      'Recyclage des déchets protéiques cellulaires',
      'Réparation accélérée de l\'ADN',
      'Effet anti-âge et protection cellulaire profonde'
    ],
    tip: 'Buvez de l\'eau riche en minéraux ou des infusions d\'herbes légères.'
  },
  {
    id: 6,
    name: 'Régénération Profonde',
    startHour: 24,
    endHour: 72,
    emoji: '🛡️',
    color: '#F43F5E',
    shortDesc: 'Renouvellement des cellules souches',
    fullDesc: 'Le jeûne prolongé stimule la réinitialisation du système immunitaire et la prolifération des cellules souches hématopoïétiques.',
    effects: [
      'Activation puissante des cellules souches',
      'Renouvellement des globules blancs immunitaires',
      'Sensibilité optimale à l\'insuline'
    ],
    tip: 'Réservé aux jeûneurs expérimentés. Assurez un apport régulier en électrolytes.'
  }
];
