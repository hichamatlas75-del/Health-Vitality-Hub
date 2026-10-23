/**
 * FULL BODY 17 — BASE D'EXERCICES ÉTENDUE & SÉLECTION PAR NIVEAU
 * Catalogue d'exercices par difficulté (Débutant, Intermédiaire, Avancé) et routines personnalisées.
 */

export function renderExerciseMediaHtml(exercise) {
  const iconMap = {
    cardio: '⚡',
    lower_body: '🦵',
    upper_body: '💪',
    core: '🛡️',
    cooldown: '🧘'
  };
  const icon = iconMap[exercise?.category] || '🏋️';
  return `<div class="exercise-media-placeholder">
    <span class="ex-media-icon">${icon}</span>
    <span class="ex-media-name">${exercise?.name || 'Exercice'}</span>
    <span class="ex-media-tag">${exercise?.targetPrimary || 'Corps Entier'}</span>
  </div>`;
}

export const EXERCISES_DATA = [
  {
    id: 1,
    number: "01",
    name: "JUMPING JACK",
    subtitle: "Cardio dynamique & activation globale",
    duration: 30,
    level: "beginner",
    levelLabel: "Débutant",
    category: "cardio",
    image: "images/ex_1_jumping_jack.jpg",
    video: "videos/ex_1_jumping_jack.mp4",
    targetMuscles: "Mollets, Quadriceps, Épaules, Cardio",
    targetPrimary: "MOLLETS & CARDIO",
    cue: "Réception souple sur l'avant des pieds, genoux légèrement fléchis, rythme régulier et continu.",
    breathing: "Inspirez à l'ouverture des bras, expirez lors du resserrement.",
    description: "Sauts rythmés en écartant simultanément les bras au-dessus de la tête et les jambes. Parfait pour élever la fréquence cardiaque, réchauffer les articulations et stimuler l'organisme.",
    adaptation: "Débutant : Version sans saut (Side Jacks : pas de côté alterné en levant les bras). Avancé : Accélération de la cadence avec ouverture complète.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 2,
    number: "02",
    name: "SQUAT LIBRE",
    subtitle: "Poids du corps, dos droit",
    duration: 30,
    level: "beginner",
    levelLabel: "Tous Niveaux",
    category: "lower_body",
    image: "images/ex_2_squat.jpg",
    video: "videos/ex_2_squat.mp4",
    targetMuscles: "Quadriceps, Ischio-jambiers, Fessiers, Gainage",
    targetPrimary: "QUADRICEPS & FESSIERS",
    cue: "Pieds largeur d'épaules, genoux alignés avec les pointes de pieds, buste fier et regard vers l'avant.",
    breathing: "Inspirez à la descente, expirez en repoussant le sol par les talons.",
    description: "Fléchir les genoux en envoyant les hanches vers l'arrière comme pour s'asseoir sur une chaise. Descendez jusqu'à ce que les cuisses soient parallèles au sol.",
    adaptation: "Débutant : Faites le mouvement en effleurant une vraie chaise derrière vous. Avancé : Marquez 1 seconde de pause en position basse ou effectuez des jump squats.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 3,
    number: "03",
    name: "POMPES AU SOL",
    subtitle: "Poussée pectorale & gainage actif",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "upper_body",
    image: "images/ex_3_pushups.jpg",
    video: "videos/ex_3_pushups.mp4",
    targetMuscles: "Pectoraux, Triceps, Deltoïdes antérieurs, Abdominaux",
    targetPrimary: "PECTORAUX & TRICEPS",
    cue: "Corps parfaitement gainé en planche, coudes à 45° du corps, nuque neutre.",
    breathing: "Inspirez en descendant la poitrine vers le sol, expirez en repoussant.",
    description: "En appui facial, mains légèrement plus écartées que les épaules. Gardez les abdominaux et les fessiers contractés sans creuser le bas du dos.",
    adaptation: "Débutant : Pompes inclinées contre une table ou sur les genoux. Avancé : Descente ralentie en 3 secondes ou tempo explosif.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 4,
    number: "04",
    name: "CRUNCH & SCISSOR KICKS",
    subtitle: "Combo Abdominaux : haut & bas du ventre",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "core",
    image: "images/ex_4_crunch_scissor.jpg",
    video: "videos/ex_4_crunch_scissor.mp4",
    targetMuscles: "Grand droit, Abdominaux inférieurs, Obliques, Psoas",
    targetPrimary: "GRAND DROIT & ABDOS BAS",
    cue: "Bas du dos bien plaqué au sol, nombril rentré, jambes tendues et ciseaux contrôlés.",
    breathing: "Expirez lors de l'effort et de la contraction, inspirez régulièrement.",
    description: "Allongé sur le dos sur tapis : enroulement contrôlé du haut du buste combiné à des battements de jambes alternés en ciseaux pour un recrutement complet des abdominaux.",
    adaptation: "Débutant : Mains sous les fessiers pour soulager les lombaires et ciseaux plus hauts. Avancé : Épaules constamment décollées, jambes au ras du sol.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 5,
    number: "05",
    name: "MOUNTAIN CLIMBERS",
    subtitle: "Cardio dynamique & sangle abdominale",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "cardio",
    image: "images/ex_mountain_climbers.jpg",
    video: "videos/ex_mountain_climbers.mp4",
    targetMuscles: "Grand droit, Fléchisseurs de hanches, Épaules, Cardio",
    targetPrimary: "CARDIO & ABDOMINAUX",
    cue: "Dos plat aligné en planche, mains sous les épaules, ramenez les genoux vers la poitrine avec rythme.",
    breathing: "Respiration rythmée et dynamique en accord avec les montées de genoux.",
    description: "En position de pompe haute, amenez alternativement et rapidement les genoux vers le buste en gardant les abdominaux gainés et les hanches stables à hauteur d'épaules.",
    adaptation: "Débutant : Version pas à pas lente et contrôlée sans impulsion. Avancé : Vitesse maximale ou genoux croisés vers le coude opposé.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 6,
    number: "06",
    name: "PONT FESSIER",
    subtitle: "Extension pelvienne & chaîne postérieure",
    duration: 30,
    level: "beginner",
    levelLabel: "Débutant",
    category: "lower_body",
    image: "images/ex_5_bridge.jpg",
    video: "videos/ex_5_bridge.mp4",
    targetMuscles: "Grand fessier, Ischio-jambiers, Lombaires, Transverse",
    targetPrimary: "GRAND FESSIER & ISCHIOS",
    cue: "Poussez fermement sur les talons, contractez fort les fessiers en haut 1 à 2 secondes.",
    breathing: "Expirez en élevant le bassin, inspirez en redescendant sans poser le dos.",
    description: "Allongé sur le dos, genoux fléchis, pieds à plat au sol écartés de la largeur des hanches. Élevez le bassin jusqu'à former une ligne droite genoux-hanches-épaules.",
    adaptation: "Débutant : Amplitude confortable en posant le dos à chaque répétition. Avancé : Maintenez une jambe levée (unilatéral) 20s de chaque côté.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 7,
    number: "07",
    name: "EXTENSION DE HANCHE DEBOUT",
    subtitle: "Activation fessière & posture",
    duration: 30,
    level: "beginner",
    levelLabel: "Débutant",
    category: "lower_body",
    image: "images/ex_6_hip_ext.jpg",
    video: "videos/ex_6_hip_ext.mp4",
    targetMuscles: "Grand fessier, Ischio-jambiers, Érecteurs du rachis, Posture",
    targetPrimary: "FESSIERS & CHAÎNE POST.",
    cue: "Buste stable et gainé sans cambrer le bas du dos. Contractez le fessier en poussant la jambe vers l'arrière.",
    breathing: "Expirez lors de l'extension de jambe, inspirez au retour.",
    description: "Debout, en appui stable sur une jambe, étendre l'autre jambe vers l'arrière de manière contrôlée sans pencher excessivement le tronc. Alternez les jambes à mi-temps (20s / 20s).",
    adaptation: "Débutant : Prenez appui des deux mains sur le dossier d'une chaise ou un mur. Avancé : Sans aucun appui pour solliciter les stabilisateurs profonds.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 8,
    number: "08",
    name: "GAINAGE PLANCHE CLASSIQUE",
    subtitle: "Sangle abdominale profonde & transverse (30s - 2min)",
    duration: 45,
    isPlank: true,
    level: "beginner",
    levelLabel: "Tous Niveaux",
    category: "core",
    image: "images/ex_7_plank.jpg",
    video: "videos/ex_7_plank.mp4",
    targetMuscles: "Transverse, Grand droit, Obliques, Épaules, Fixateurs omoplates",
    targetPrimary: "TRANSVERSE & SANGLE ABD.",
    cue: "Corps rigide et aligné : rétroversion du bassin, nombril aspiré vers la colonne, regard au sol.",
    breathing: "Respiration continue, ventrale et fluide sans jamais bloquer le souffle.",
    description: "En appui sur les avant-bras et les pointes de pieds. Coudes placés sous les épaules à 90°. Maintenez l'alignement parfait chevilles-hanches-épaules sans cambrer.",
    adaptation: "30s : Débutant / Reprise • 45s : Standard régulier • 60s : Intermédiaire avancé • 2 min (120s) : Défi endurance.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 9,
    number: "09",
    name: "ÉTIREMENTS DYNAMIQUES",
    subtitle: "Mobilité, souplesse & retour au calme (1 série finale)",
    duration: 30,
    isCoolDown: true,
    level: "beginner",
    levelLabel: "Tous Niveaux",
    category: "full_body",
    image: "images/ex_8_stretching.jpg",
    video: "videos/ex_8_stretching.mp4",
    targetMuscles: "Chaîne postérieure, Cage thoracique, Épaules, Psoas",
    targetPrimary: "OUVERTURE THORACIQUE",
    cue: "Mouvements amples, lents et fluides. Ne forcez jamais dans la douleur.",
    breathing: "Respiration ventrale profonde et régénératrice.",
    description: "Enchaînement fluide : ouvertures de cage thoracique avec cercles de bras, rotations douces du buste, et flexions lentes de hanches pour relâcher les tensions musculaires.",
    adaptation: "Tous niveaux : Adaptez l'amplitude à votre souplesse naturelle. Favorisez l'oxygénation et la décompression vertébrale.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 10,
    number: "10",
    name: "FENTES ALTERNÉES",
    subtitle: "Renforcement unilatéral cuisses & équilibre",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "lower_body",
    image: "images/ex_10_lunges.jpg",
    video: "videos/ex_10_lunges.mp4",
    targetMuscles: "Quadriceps, Fessiers, Ischio-jambiers, Équilibre",
    targetPrimary: "CUISSES & ÉQUILIBRE",
    cue: "Grand pas en avant, genou arrière descendant à 90° sans toucher le sol brutalement, buste droit.",
    breathing: "Inspirez à la flexion, expirez en repoussant sur le talon avant pour revenir.",
    description: "Faites un pas vers l'avant, fléchissez les deux genoux jusqu'à 90°, puis repoussez sur le talon pour revenir en position initiale et alterner avec l'autre jambe.",
    adaptation: "Débutant : Fentes arrières statiques ou fentes avec appui sur une chaise. Avancé : Fentes sautées explosives.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 11,
    number: "11",
    name: "POMPES SUR LES GENOUX",
    subtitle: "Apprentissage de la poussée pectorale sans contrainte lombaire",
    duration: 30,
    level: "beginner",
    levelLabel: "Débutant",
    category: "upper_body",
    image: "images/ex_11_knee_pushups.jpg",
    video: "videos/ex_11_knee_pushups.mp4",
    targetMuscles: "Pectoraux, Triceps, Deltoïdes",
    targetPrimary: "PECTORAUX (ACCESSIBLE)",
    cue: "Genoux au sol, bassin aligné avec les épaules, coudes fléchis vers l'arrière.",
    breathing: "Inspirez en descendant la poitrine vers le sol, expirez en poussant.",
    description: "Variante idéale pour développer la force de poussée du haut du corps en toute sécurité et sans cambrer le bas du dos.",
    adaptation: "Débutant : Amplitude progressive. Avancé : Transition progressive vers les pompes sur pointes de pieds.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 12,
    number: "12",
    name: "POMPES DIAMANT",
    subtitle: "Poussée ciblée sur les triceps & centre des pectoraux",
    duration: 30,
    level: "advanced",
    levelLabel: "Avancé",
    category: "upper_body",
    image: "images/ex_12_diamond_pushups.jpg",
    video: "videos/ex_12_diamond_pushups.mp4",
    targetMuscles: "Triceps, Pectoraux faisceau sternal, Deltoïdes antérieurs",
    targetPrimary: "TRICEPS & FORCE HAUT DU CORPS",
    cue: "Pouces et index joints sous le sternum formant un losange, coudes proches du buste.",
    breathing: "Inspirez à la descente contrôlée, expirez lors de la poussée explosive.",
    description: "En position de planche, placez les mains l'une contre l'autre en diamant pour intensifier le travail de contraction des triceps et des pectoraux.",
    adaptation: "Intermédiaire : Exécuter sur les genoux. Avancé : Pieds surélevés sur un banc.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 13,
    number: "13",
    name: "BURPEES CARDIO",
    subtitle: "Puissance globale, cardio & explosivité",
    duration: 30,
    level: "advanced",
    levelLabel: "Avancé",
    category: "cardio",
    image: "images/ex_13_burpees.jpg",
    video: "videos/ex_13_burpees.mp4",
    targetMuscles: "Cardio, Pectoraux, Quadriceps, Sangle abdominale",
    targetPrimary: "CARDIO EXPLOSIF FULL BODY",
    cue: "Squat, pose des mains, saut arrière en planche, retour groupé et impulsion verticale.",
    breathing: "Rythme respiratoire régulier, expirez fort lors du saut vertical.",
    description: "Mouvement polyarticulaire complet combinant squat, saut en planche et impulsion vers le haut pour une dépense calorique maximale.",
    adaptation: "Intermédiaire : Burpees sans saut (Step-back burpees). Avancé : Ajout d'une pompe complète au sol.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 14,
    number: "14",
    name: "RUSSIAN TWISTS",
    subtitle: "Rotation du buste & renforcement des obliques",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "core",
    image: "images/ex_14_russian_twists.jpg",
    video: "videos/ex_14_russian_twists.mp4",
    targetMuscles: "Obliques internes/externes, Grand droit, Transverse",
    targetPrimary: "TAILLE & OBLIQUES",
    cue: "Assis sur les ischions, buste incliné à 45°, pivotez les épaules de gauche à droite sans à-coups.",
    breathing: "Expirez à chaque rotation latérale, inspirez au centre.",
    description: "En équilibre fessier, tournez le torse d'un côté puis de l'autre en touchant le sol de chaque côté pour sculpter la sangle abdominale oblique.",
    adaptation: "Débutant : Talons posés au sol. Avancé : Pieds surélevés décollés du sol avec tempo ralenti.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 15,
    number: "15",
    name: "GAINAGE LATÉRAL",
    subtitle: "Planche latérale & stabilisateurs profonds",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "core",
    image: "images/ex_15_side_plank.jpg",
    video: "videos/ex_15_side_plank.mp4",
    targetMuscles: "Obliques, Moyen fessier, Carré des lombes, Épaules",
    targetPrimary: "OBLIQUES & POSTURE LATÉRALE",
    cue: "Coude aligné sous l'épaule, bassin haut aligné avec la colonne (20s côté droit / 20s côté gauche).",
    breathing: "Respiration fluide et continue sans affaissement du bassin.",
    description: "Appui sur un avant-bras et la tranche des pieds pour renforcer la chaîne latérale et protéger la colonne lombaire.",
    adaptation: "Débutant : Genoux au sol fléchis à 90°. Avancé : Élévation de la jambe supérieure (Star Plank).",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 16,
    number: "16",
    name: "DIPS SUR CHAISE",
    subtitle: "Poussée arrière pour le galbe des triceps",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "upper_body",
    image: "images/ex_16_chair_dips.jpg",
    video: "videos/ex_16_chair_dips.mp4",
    targetMuscles: "Triceps, Deltoïdes antérieurs, Haut du dos",
    targetPrimary: "TRICEPS & ÉPAULES",
    cue: "Mains sur le bord de la chaise, dos rasant l'assise, flexion des coudes à 90°.",
    breathing: "Inspirez à la descente, expirez en repoussant sur les paumes de mains.",
    description: "Dos à une chaise ou table basse solide, descendez le bassin en fléchissant les coudes puis remontez en tendant les bras.",
    adaptation: "Débutant : Genoux fléchis à 90° pieds proches. Avancé : Jambes tendues devant soi ou pieds surélevés.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 17,
    number: "17",
    name: "BICYCLE CRUNCHES",
    subtitle: "Pédalage croisé dynamique des abdominaux",
    duration: 30,
    level: "intermediate",
    levelLabel: "Intermédiaire",
    category: "core",
    image: "images/ex_17_bicycle_crunches.jpg",
    video: "videos/ex_17_bicycle_crunches.mp4",
    targetMuscles: "Grand droit, Obliques, Fléchisseurs de hanche",
    targetPrimary: "ABDOMINAUX COMPLETS",
    cue: "Coude opposé vers genou opposé avec rotation contrôlée des épaules sans tirer sur la nuque.",
    breathing: "Respiration alternée et cadencée avec les changements de côté.",
    description: "Allongé sur le dos, effectuez un pédalage dynamique en amenant alternativement le coude droit vers le genou gauche et inversement.",
    adaptation: "Débutant : Mouvement lent avec pause au sol. Avancé : Cadence accélérée jambes tendues au ras du sol.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 18,
    number: "18",
    name: "MONTÉES DE GENOUX",
    subtitle: "Cardio haute intensité & dynamisme des jambes",
    duration: 30,
    level: "beginner",
    levelLabel: "Tous Niveaux",
    category: "cardio",
    image: "images/ex_18_high_knees.jpg",
    video: "videos/ex_18_high_knees.mp4",
    targetMuscles: "Cardio, Fléchisseurs de hanche, Mollets, Sangle abdominale",
    targetPrimary: "CARDIO & RÉACTIVITÉ",
    cue: "Genoux montés à hauteur de hanches, appuis légers sur pointes de pieds, buste haut.",
    breathing: "Rythme respiratoire profond et dynamique.",
    description: "Course sur place énergique en élevant alternativement les genoux vers la poitrine avec impulsion souple.",
    adaptation: "Débutant : Montées de genoux marchées sans impact. Avancé : Vitesse maximale avec bras actifs.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 19,
    number: "19",
    name: "SUPERMAN EXTENSION",
    subtitle: "Renforcement lombaire, dos & posture",
    duration: 30,
    level: "beginner",
    levelLabel: "Débutant",
    category: "core",
    image: "images/ex_19_superman.jpg",
    video: "videos/ex_19_superman.mp4",
    targetMuscles: "Érecteurs du rachis, Grand fessier, Fixateurs d'omoplates",
    targetPrimary: "DOS & POSTURE",
    cue: "Allongé sur le ventre, décollez simultanément poitrine et cuisses du sol sans forcer sur la nuque.",
    breathing: "Expirez en levant les membres, inspirez en redescendant doucement.",
    description: "Allongé à plat ventre, levez les bras tendus devant et les jambes tendues derrière pour renforcer toute la chaîne postérieure et la posture dorsale.",
    adaptation: "Débutant : Levez un bras et la jambe opposée en alternance. Avancé : Maintien isométrique 3 secondes en position haute.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  },
  {
    id: 20,
    number: "20",
    name: "CHAISE AU MUR",
    subtitle: "Isométrie & endurance des quadriceps",
    duration: 30,
    level: "beginner",
    levelLabel: "Débutant / Intermédiaire",
    category: "lower_body",
    image: "images/ex_20_wall_sit.jpg",
    video: "videos/ex_20_wall_sit.mp4",
    targetMuscles: "Quadriceps, Fessiers, Mollets, Endurance",
    targetPrimary: "ENDURANCE DES CUISSES",
    cue: "Dos parfaitement plaqué au mur, cuisses parallèles au sol à 90°, mains posées sur les cuisses ou le long du corps.",
    breathing: "Respiration ventrale lente et continue sans bloquer.",
    description: "Position statique adossé contre un mur simulant une chaise pour développer l'endurance et la stabilité des genoux sans impact articulaire.",
    adaptation: "Débutant : Angle plus ouvert (cuisses à 45°). Avancé : Chaise sur une seule jambe pendant 20 secondes par côté.",
    get illustrationHtml() {
      return renderExerciseMediaHtml(this);
    }
  }
];

// Routines prédéfinies par niveau d'utilisateur
export const ROUTINES_BY_LEVEL = {
  beginner: [1, 2, 11, 6, 19, 20, 8, 9], // 7 exercices adaptés + étirements
  intermediate: [1, 2, 3, 4, 6, 5, 16, 8, 9], // 8 exercices équilibrés (Pont fessier inclus) + étirements
  advanced: [18, 2, 12, 13, 14, 5, 15, 8, 9] // 8 exercices intensifs + étirements
};

// Fonctions utilitaires d'accès aux exercices
export function getAllExercises() {
  return EXERCISES_DATA;
}

export function getExerciseById(id) {
  return EXERCISES_DATA.find(e => e.id === Number(id)) || null;
}

export function getExercisesForLevel(level = 'intermediate') {
  const ids = ROUTINES_BY_LEVEL[level] || ROUTINES_BY_LEVEL.intermediate;
  return ids.map(id => getExerciseById(id)).filter(Boolean);
}

export function getActiveWorkoutExercises(prefs = {}) {
  const userLevel = prefs.userLevel || 'intermediate';
  if (userLevel === 'custom' && Array.isArray(prefs.customExerciseIds) && prefs.customExerciseIds.length > 0) {
    const list = prefs.customExerciseIds.map(id => getExerciseById(id)).filter(Boolean);
    if (list.length === 0) {
      return getExercisesForLevel('intermediate');
    }
    // Isoler le circuit principal et toujours positionner le retour au calme (ID 9) en étape finale
    const mainCircuit = list.filter(e => !e.isCoolDown);
    const coolDown = getExerciseById(9);
    if (coolDown) {
      return [...mainCircuit, coolDown];
    }
    return mainCircuit;
  }
  return getExercisesForLevel(userLevel);
}

// Structure du plan d'entraînement sur 8 semaines
export const PROGRAM_WEEKS = [
  { weeks: "Semaines 1-2", rounds: 2, title: "Prise en main & Régularité", desc: "2 tours complets à intensité modérée pour ancrer le rendez-vous de 17h." },
  { weeks: "Semaines 3-4", rounds: 2, title: "Qualité d'exécution & Abdominaux", desc: "2 tours avec amplitude complète et contrôle parfait du gainage et des abdos." },
  { weeks: "Semaines 5-6", rounds: 2, title: "Augmentation d'intensité", desc: "2 tours plus rythmés avec progression sur la durée du gainage (45s à 60s)." },
  { weeks: "Semaines 7-8", rounds: 3, title: "Passage au Niveau Supérieur", desc: "Possibilité d'activer 3 tours pour une séance complète avec renforcement abdominal renforcé." }
];

