#!/usr/bin/env node
// Matriz original 1–200: seis rutas mono-elementales, una ruta de aprendizaje
// y cuatro rutas especializadas (aguante, ánimo, precisión, apoyo) por cada
// franja de 20 niveles. El generador es determinista e idempotente.
// Las rutas de aprendizaje sacrifican TODAS las estadísticas de combate.
// Las rutas especializadas sacrifican pico elemental a cambio de su enfoque.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const file = (name) => new URL(name, ROOT);
const itemsFile = file('data/rpg/items.json');
const setsFile = file('data/rpg/sets.json');
const merchantsFile = file('data/rpg/merchants.json');
const i18nFile = file('data/i18n/en.content.json');
const itemsDoc = JSON.parse(readFileSync(itemsFile, 'utf8'));
const setsDoc = JSON.parse(readFileSync(setsFile, 'utf8'));
const merchantsDoc = JSON.parse(readFileSync(merchantsFile, 'utf8'));
const i18nDoc = JSON.parse(readFileSync(i18nFile, 'utf8'));
const WRITE = process.argv.includes('--write');

const ELEMENTS = {
  earth: { primary: 'strength', title: 'Tierra Labrada', secondary: 'tackle' },
  fire: { primary: 'intellect', title: 'Fogón Vivo', secondary: 'healingPower' },
  air: { primary: 'agility', title: 'Brisa Alta', secondary: 'escape' },
  water: { primary: 'flow', title: 'Marea Clara', secondary: 'discovery' },
  frost: { primary: 'calm', title: 'Sereno Frío', secondary: 'slowResist' },
  lightning: { primary: 'will', title: 'Relámpago Lejano', secondary: 'castStability' },
};
const BANDS = [
  'Senderos de Azuero', 'Faroles de Portobelo', 'Raíces del Darién', 'Vientos de Bocas', 'Lluvias de Bayano',
  'Sereno del Barú', 'Campanas de Cruces', 'Perlas de Coiba', 'Dos Mares', 'Compás del Istmo',
];
const BANDS_EN = [
  'Azuero Trails', 'Portobelo Lanterns', 'Darién Roots', 'Bocas Winds', 'Bayano Rains',
  'Barú Dew', 'Cruces Bells', 'Coiba Pearls', 'Two Seas', 'Isthmus Compass',
];
const LEARNING = [
  { es: 'del Cuaderno Prestado', en: 'of the Borrowed Notebook' },
  { es: 'de la Cartilla del Camino', en: 'of the Road Primer' },
  { es: 'de la Bitácora de Marea', en: 'of the Tide Logbook' },
  { es: 'de las Notas del Campanero', en: "of the Bell Keeper's Notes" },
  { es: 'del Manual del Aguacero', en: 'of the Downpour Manual' },
  { es: 'del Almanaque del Volcán', en: 'of the Volcano Almanac' },
  { es: 'del Archivo de Cruces', en: 'of the Cruces Archive' },
  { es: 'del Cuaderno de Coiba', en: 'of the Coiba Notebook' },
  { es: 'del Atlas de los Dos Mares', en: 'of the Two Seas Atlas' },
  { es: 'de la Memoria del Istmo', en: 'of the Isthmus Memoir' },
];

// Nombres originales para las cuatro familias especializadas por franja.
// Aguante (endurance): Vitalidad / Vida / resistencias, poco daño.
// Ánimo (spirit): Espíritu / recurso / regeneración, poco pico elemental.
// Precisión (precision): crítico / daño crítico / Concentración, frágil.
// Apoyo (support): curación / enfriamiento / escape, daño bajo.
const SPECIALIZED_NAMES = {
  endurance: [
    { es: 'del Escudo de Azuero', en: 'of the Azuero Shield' },
    { es: 'del Baluarte de Portobelo', en: 'of the Portobelo Bulwark' },
    { es: 'de la Coraza del Darién', en: 'of the Darién Carapace' },
    { es: 'del Refugio de Bocas', en: 'of the Bocas Refuge' },
    { es: 'de la Roca de Bayano', en: 'of the Bayano Rock' },
    { es: 'del Muro del Barú', en: 'of the Barú Wall' },
    { es: 'de la Fortaleza de Cruces', en: 'of the Cruces Fortress' },
    { es: 'del Bastión de Coiba', en: 'of the Coiba Bastion' },
    { es: 'de la Muralla de Dos Mares', en: 'of the Two Seas Rampart' },
    { es: 'del Cidra del Istmo', en: 'of the Isthmus Citadel' },
  ],
  spirit: [
    { es: 'del Viento de Azuero', en: 'of the Azuero Wind' },
    { es: 'de la Brisa de Portobelo', en: 'of the Portobelo Breeze' },
    { es: 'del Susurro del Darién', en: 'of the Darién Whisper' },
    { es: 'de la Corriente de Bocas', en: 'of the Bocas Current' },
    { es: 'del Aliento de Bayano', en: 'of the Bayano Breath' },
    { es: 'de la Niebla del Barú', en: 'of the Barú Mist' },
    { es: 'del Eco de Cruces', en: 'of the Cruces Echo' },
    { es: 'de la Marea de Coiba', en: 'of the Coiba Tide' },
    { es: 'del Pulso de Dos Mares', en: 'of the Two Seas Pulse' },
    { es: 'de la Cadencia del Istmo', en: 'of the Isthmus Cadence' },
  ],
  precision: [
    { es: 'del Ojo de Azuero', en: 'of the Azuero Eye' },
    { es: 'de la Mira de Portobelo', en: 'of the Portobelo Sight' },
    { es: 'del Filo del Darién', en: 'of the Darién Edge' },
    { es: 'de la Flecha de Bocas', en: 'of the Bocas Arrow' },
    { es: 'del Clavo de Bayano', en: 'of the Bayano Nail' },
    { es: 'de la Púa del Barú', en: 'of the Barú Thorn' },
    { es: 'del Dardo de Cruces', en: 'of the Cruces Dart' },
    { es: 'de la Aguja de Coiba', en: 'of the Coiba Needle' },
    { es: 'del Pico de Dos Mares', en: 'of the Two Seas Beak' },
    { es: 'de la Lanza del Istmo', en: 'of the Isthmus Lance' },
  ],
  support: [
    { es: 'del Sanador de Azuero', en: 'of the Azuero Healer' },
    { es: 'de la Curandera de Portobelo', en: 'of the Portobelo Healer' },
    { es: 'del Médico del Darién', en: 'of the Darién Medic' },
    { es: 'de la Herbolaria de Bocas', en: 'of the Bocas Herbalist' },
    { es: 'del Remedio de Bayano', en: 'of the Bayano Remedy' },
    { es: 'de la Infusión del Barú', en: 'of the Barú Infusion' },
    { es: 'del Consuelo de Cruces', en: 'of the Cruces Comfort' },
    { es: 'de la Tregua de Coiba', en: 'of the Coiba Truce' },
    { es: 'del Alivio de Dos Mares', en: 'of the Two Seas Relief' },
    { es: 'de la Paz del Istmo', en: 'of the Isthmus Peace' },
  ],
};
const SPECIALIZED_EN = {
  endurance: 'Endurance', spirit: 'Spirit', precision: 'Precision', support: 'Support',
};

const ELEMENT_EN = {
  earth: 'Tilled Earth', fire: 'Living Hearth', air: 'High Breeze', water: 'Clear Tide', frost: 'Cold Dew', lightning: 'Distant Lightning',
};
const NOUN_EN = { Sombrero: 'Hat', Casaca: 'Coat', Guantes: 'Gloves', Botas: 'Boots', Mochila: 'Backpack', Medalla: 'Medal' };
const PIECES = [
  { suffix: 'head', noun: 'Sombrero', category: 'armor', slot: 'head', kind: 'hat', icon: 'head', weight: 4 },
  { suffix: 'chest', noun: 'Casaca', category: 'armor', slot: 'chest', kind: 'armor', icon: 'chest', weight: 8 },
  { suffix: 'hands', noun: 'Guantes', category: 'armor', slot: 'hands', kind: 'gloves', icon: 'hands', weight: 3 },
  { suffix: 'feet', noun: 'Botas', category: 'armor', slot: 'feet', kind: 'boots', icon: 'feet', weight: 5 },
];
const STUDY_PIECES = [
  PIECES[0], PIECES[1],
  { suffix: 'back', noun: 'Mochila', category: 'armor', slot: 'back', kind: 'cape', icon: 'back', weight: 5 },
  { suffix: 'amulet', noun: 'Medalla', category: 'jewel', slot: 'amulet', kind: 'amulet', icon: 'amulet', weight: 1 },
];
const rarity = (band) => band <= 2 ? 'uncommon' : band <= 5 ? 'rare' : band <= 8 ? 'epic' : 'legendary';
const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
const range = (min, max) => ({ min: Math.max(1, Math.round(min)), max: Math.max(1, Math.round(max)) });
const generated = [];
const translate = (es, en) => { i18nDoc[es] = en; };

// Retira únicamente una versión anterior de esta matriz.
for (const id of Object.keys(itemsDoc.items)) {
  if (id.startsWith('route_') || id.startsWith('learning_') || id.startsWith('spec_')) delete itemsDoc.items[id];
}
for (const id of Object.keys(setsDoc.sets)) {
  if (id.startsWith('route_') || id.startsWith('learning_') || id.startsWith('spec_')) delete setsDoc.sets[id];
}
for (const merchant of Object.values(merchantsDoc.merchants)) {
  merchant.stock = merchant.stock.filter((s) => !s.itemId.startsWith('route_') && !s.itemId.startsWith('learning_') && !s.itemId.startsWith('spec_'));
}

for (let index = 0; index < BANDS.length; index++) {
  const band = index + 1;
  const level = 12 + index * 20;
  for (const [element, identity] of Object.entries(ELEMENTS)) {
    const setId = `route_${String(band).padStart(2, '0')}_${element}`;
    const setName = `de ${BANDS[index]}: ${identity.title}`;
    setsDoc.sets[setId] = {
      name: setName,
      _build: `Ruta mono-elemental ${element}, franja ${index * 20 + 1}–${band * 20}; ${identity.secondary} como secundaria.`,
      bonuses: [
        { pieces: 2, modifiers: [{ stat: identity.primary, op: 'flat', value: round5(3 + level * 0.08) }] },
        { pieces: 4, modifiers: [
          { stat: `damage.${element}`, op: 'flat', value: Math.min(7, Math.max(1, Math.round(level / 35))) },
          { stat: identity.secondary, op: 'flat', value: Math.min(10, Math.max(2, Math.round(level / 24))) },
        ] },
      ],
    };
    translate(setName, `of ${BANDS_EN[index]}: ${ELEMENT_EN[element]}`);
    for (const piece of PIECES) {
      const id = `${setId}_${piece.suffix}`;
      const primary = range(level * 0.28, level * 0.42);
      const hp = range(level * 0.45, level * 0.8);
      const damage = range(Math.max(1, level / 55), Math.min(30, Math.max(1, 30 * (level / 200) ** 2)));
      const rolls = [{ stat: identity.primary, op: 'flat', ...primary }];
      if (band >= 2) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
      if (band >= 3) rolls.push({ stat: identity.secondary, op: 'flat', ...range(level / 45, level / 24) });
      if (band >= 4) rolls.push({ stat: `damage.${element}`, op: 'flat', ...damage });
      if (band >= 6) rolls.push({ stat: `resist.${element}`, op: 'flat', ...range(level / 35, Math.min(10, level / 20)) });
      if (band >= 8) rolls.push({ stat: 'spirit', op: 'flat', ...range(level * 0.12, level * 0.18) });
      const name = `${piece.noun} de ${identity.title} — ${BANDS[index]}`;
      const description = `Pieza de ${BANDS[index]} dedicada a ${identity.title.toLowerCase()}.`;
      itemsDoc.items[id] = {
        weight: piece.weight, name, description,
        icon: piece.icon, kind: piece.kind, category: piece.category, slot: piece.slot, rarity: rarity(band), level,
        value: Math.round(15 + level * level * 0.08), maxStack: 1, setId, implicit: [], rolls, dropWeight: Math.max(1, 24 - band * 2),
      };
      translate(name, `${NOUN_EN[piece.noun]} of ${ELEMENT_EN[element]} — ${BANDS_EN[index]}`);
      translate(description, `A piece from ${BANDS_EN[index]} devoted to ${ELEMENT_EN[element].toLowerCase()}.`);
      generated.push(id);
    }
  }

  const learningSet = `learning_${String(band).padStart(2, '0')}`;
  const perPiece = 4 + band;
  setsDoc.sets[learningSet] = {
    name: LEARNING[index].es,
    _build: `Aprendizaje puro, franja ${index * 20 + 1}–${band * 20}: gana XP a cambio de ocupar cuatro huecos sin estadísticas de combate.`,
    bonuses: [
      { pieces: 2, modifiers: [{ stat: 'experienceGain', op: 'flat', value: 5 + band }] },
      { pieces: 4, modifiers: [{ stat: 'experienceGain', op: 'flat', value: 10 + band * 2 }] },
    ],
  };
  translate(LEARNING[index].es, LEARNING[index].en);
  for (const piece of STUDY_PIECES) {
    const id = `${learningSet}_${piece.suffix}`;
    const name = `${piece.noun} ${LEARNING[index].es}`;
    itemsDoc.items[id] = {
      weight: piece.weight, name, description: 'Ayuda a aprender más rápido, pero no protege ni aumenta el daño.',
      icon: piece.icon, kind: piece.kind, category: piece.category, slot: piece.slot, rarity: rarity(band), level,
      value: Math.round(12 + level * level * 0.06), maxStack: 1, setId: learningSet, implicit: [],
      rolls: [{ stat: 'experienceGain', op: 'flat', min: perPiece, max: perPiece }], dropWeight: Math.max(1, 20 - band),
    };
    translate(name, `${NOUN_EN[piece.noun]} ${LEARNING[index].en}`);
    translate('Ayuda a aprender más rápido, pero no protege ni aumenta el daño.', 'Helps you learn faster, but offers no protection or extra damage.');
    generated.push(id);
  }
}

// ─── Rutas especializadas (aguante, ánimo, precisión, apoyo) ──────────────
// Cada familia sacrifica pico elemental a cambio de su enfoque.
// Presupuesto de daño elemental: ~40 % del mono-elemental.
// Ninguna ruta especializada recibe experienceGain.

for (let index = 0; index < BANDS.length; index++) {
  const band = index + 1;
  const level = 12 + index * 20;

  // ── Aguante (endurance) ──
  // Vitalidad / Vida / resistencias múltiples; daño elemental muy bajo.
  {
    const setId = `spec_${String(band).padStart(2, '0')}_endurance`;
    const setName = SPECIALIZED_NAMES.endurance[index].es;
    const desc = `Pieza de ${BANDS[index]} enfocada en aguante y supervivencia.`;
    setsDoc.sets[setId] = {
      name: setName,
      _build: `Ruta especializada en aguante, franja ${index * 20 + 1}–${band * 20}: Vitalidad, Vida, resistencias; daño elemental reducido.`,
      bonuses: [
        { pieces: 2, modifiers: [{ stat: 'vitality', op: 'flat', value: round5(4 + level * 0.1) }] },
        { pieces: 4, modifiers: [
          { stat: 'maxHealth', op: 'percent', value: Math.min(15, Math.max(3, Math.round(level / 20))) },
          { stat: 'vitality', op: 'flat', value: round5(6 + level * 0.12) },
        ] },
      ],
    };
    translate(setName, SPECIALIZED_NAMES.endurance[index].en);
    translate(desc, `A piece from ${BANDS_EN[index]} focused on endurance and survival.`);
    for (const piece of PIECES) {
      const id = `${setId}_${piece.suffix}`;
      const vitality = range(level * 0.35, level * 0.55);
      const hp = range(level * 0.8, level * 1.4);
      const resist = range(Math.max(1, level / 50), Math.min(10, Math.max(1, level / 30)));
      const resist2 = range(Math.max(1, level / 60), Math.min(8, Math.max(1, level / 40)));
      const damage = range(1, Math.min(10, Math.max(1, 10 * (level / 200))));
      const rolls = [{ stat: 'vitality', op: 'flat', ...vitality }];
      if (band >= 1) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
      if (band >= 2) rolls.push({ stat: 'resist.earth', op: 'flat', ...resist });
      if (band >= 3) rolls.push({ stat: 'resist.fire', op: 'flat', ...resist2 });
      if (band >= 4) rolls.push({ stat: 'resist.air', op: 'flat', ...resist2 });
      if (band >= 5) rolls.push({ stat: 'resist.water', op: 'flat', ...resist2 });
      if (band >= 6) rolls.push({ stat: 'resist.frost', op: 'flat', ...resist2 });
      if (band >= 7) rolls.push({ stat: 'resist.lightning', op: 'flat', ...resist2 });
      if (band >= 8) rolls.push({ stat: 'damage.earth', op: 'flat', ...damage });
      const name = `${piece.noun} ${setName}`;
      itemsDoc.items[id] = {
        weight: piece.weight, name, description: desc,
        icon: piece.icon, kind: piece.kind, category: piece.category, slot: piece.slot, rarity: rarity(band), level,
        value: Math.round(12 + level * level * 0.06), maxStack: 1, setId, implicit: [], rolls, dropWeight: Math.max(1, 20 - band),
      };
      translate(name, `${NOUN_EN[piece.noun]} ${SPECIALIZED_NAMES.endurance[index].en}`);
      generated.push(id);
    }
  }

  // ── Ánimo (spirit) ──
  // Espíritu / recurso / regeneración; pico elemental muy bajo.
  {
    const setId = `spec_${String(band).padStart(2, '0')}_spirit`;
    const setName = SPECIALIZED_NAMES.spirit[index].es;
    const desc = `Pieza de ${BANDS[index]} enfocada en recurso y regeneración.`;
    setsDoc.sets[setId] = {
      name: setName,
      _build: `Ruta especializada en ánimo, franja ${index * 20 + 1}–${band * 20}: Espíritu, recurso, regeneración; daño elemental reducido.`,
      bonuses: [
        { pieces: 2, modifiers: [{ stat: 'spirit', op: 'flat', value: round5(3 + level * 0.08) }] },
        { pieces: 4, modifiers: [
          { stat: 'resourceRegen', op: 'flat', value: Math.min(5, Math.max(1, Math.round(level / 50))) },
          { stat: 'spirit', op: 'flat', value: round5(5 + level * 0.1) },
        ] },
      ],
    };
    translate(setName, SPECIALIZED_NAMES.spirit[index].en);
    translate(desc, `A piece from ${BANDS_EN[index]} focused on resource and regeneration.`);
    for (const piece of PIECES) {
      const id = `${setId}_${piece.suffix}`;
      const spirit = range(level * 0.3, level * 0.5);
      const resource = range(level * 0.2, level * 0.4);
      const regen = range(Math.max(1, level / 40), Math.min(8, Math.max(1, level / 25)));
      const hp = range(level * 0.25, level * 0.45);
      const damage = range(1, Math.min(8, Math.max(1, 8 * (level / 200))));
      const rolls = [{ stat: 'spirit', op: 'flat', ...spirit }];
      if (band >= 1) rolls.push({ stat: 'maxResource', op: 'flat', ...resource });
      if (band >= 2) rolls.push({ stat: 'resourceRegen', op: 'flat', ...regen });
      if (band >= 3) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
      if (band >= 4) rolls.push({ stat: 'healthRegen', op: 'flat', ...regen });
      if (band >= 5) rolls.push({ stat: 'cooldownReduction', op: 'flat', ...range(level / 120, Math.min(5, level / 60)) });
      if (band >= 7) rolls.push({ stat: 'damage.fire', op: 'flat', ...damage });
      const name = `${piece.noun} ${setName}`;
      itemsDoc.items[id] = {
        weight: piece.weight, name, description: desc,
        icon: piece.icon, kind: piece.kind, category: piece.category, slot: piece.slot, rarity: rarity(band), level,
        value: Math.round(12 + level * level * 0.06), maxStack: 1, setId, implicit: [], rolls, dropWeight: Math.max(1, 20 - band),
      };
      translate(name, `${NOUN_EN[piece.noun]} ${SPECIALIZED_NAMES.spirit[index].en}`);
      generated.push(id);
    }
  }

  // ── Precisión (precision) ──
  // Crítico / daño crítico / Concentración; frágil (poca vida).
  {
    const setId = `spec_${String(band).padStart(2, '0')}_precision`;
    const setName = SPECIALIZED_NAMES.precision[index].es;
    const desc = `Pieza de ${BANDS[index]} enfocada en golpes críticos y concentración.`;
    setsDoc.sets[setId] = {
      name: setName,
      _build: `Ruta especializada en precisión, franja ${index * 20 + 1}–${band * 20}: crítico, daño crítico, Concentración; vida reducida.`,
      bonuses: [
        { pieces: 2, modifiers: [{ stat: 'critChance', op: 'flat', value: Math.min(0.04, Math.max(0.01, Math.round(level / 50) / 100) * 100) / 100 }] },
        { pieces: 4, modifiers: [
          { stat: 'critBonus', op: 'flat', value: Math.min(15, Math.max(3, Math.round(level / 18))) },
          { stat: 'castStability', op: 'flat', value: Math.min(10, Math.max(2, Math.round(level / 30))) },
        ] },
      ],
    };
    translate(setName, SPECIALIZED_NAMES.precision[index].en);
    translate(desc, `A piece from ${BANDS_EN[index]} focused on critical hits and concentration.`);
    for (const piece of PIECES) {
      const id = `${setId}_${piece.suffix}`;
      const critMin = Math.max(0.01, Math.min(0.04, Math.round(level / 50) / 100));
      const critMax = Math.max(critMin, Math.min(0.04, Math.round(level / 30) / 100));
      const critBonus = range(Math.max(1, level / 30), Math.min(12, Math.max(1, level / 18)));
      const stability = range(Math.max(1, level / 40), Math.min(8, Math.max(1, level / 25)));
      const hp = range(level * 0.15, level * 0.3);
      const damage = range(1, Math.min(10, Math.max(1, 10 * (level / 200))));
      const rolls = [{ stat: 'critChance', op: 'flat', min: critMin, max: critMax }];
      if (band >= 1) rolls.push({ stat: 'critBonus', op: 'flat', ...critBonus });
      if (band >= 2) rolls.push({ stat: 'castStability', op: 'flat', ...stability });
      if (band >= 3) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
      if (band >= 4) rolls.push({ stat: 'power', op: 'flat', ...range(level / 50, Math.min(8, level / 30)) });
      if (band >= 6) rolls.push({ stat: 'damage.air', op: 'flat', ...damage });
      const name = `${piece.noun} ${setName}`;
      itemsDoc.items[id] = {
        weight: piece.weight, name, description: desc,
        icon: piece.icon, kind: piece.kind, category: piece.category, slot: piece.slot, rarity: rarity(band), level,
        value: Math.round(14 + level * level * 0.07), maxStack: 1, setId, implicit: [], rolls, dropWeight: Math.max(1, 22 - band),
      };
      translate(name, `${NOUN_EN[piece.noun]} ${SPECIALIZED_NAMES.precision[index].en}`);
      generated.push(id);
    }
  }

  // ── Apoyo (support) ──
  // Curación / enfriamiento / escape; daño ofensivo bajo.
  {
    const setId = `spec_${String(band).padStart(2, '0')}_support`;
    const setName = SPECIALIZED_NAMES.support[index].es;
    const desc = `Pieza de ${BANDS[index]} enfocada en curación y apoyo al grupo.`;
    setsDoc.sets[setId] = {
      name: setName,
      _build: `Ruta especializada en apoyo, franja ${index * 20 + 1}–${band * 20}: curación, enfriamiento, escape; daño ofensivo reducido.`,
      bonuses: [
        { pieces: 2, modifiers: [{ stat: 'healingPower', op: 'flat', value: round5(3 + level * 0.08) }] },
        { pieces: 4, modifiers: [
          { stat: 'cooldownReduction', op: 'flat', value: Math.min(0.05, Math.max(0.01, Math.round(level / 35) / 100) * 100) / 100 },
          { stat: 'healingPower', op: 'flat', value: round5(5 + level * 0.1) },
        ] },
      ],
    };
    translate(setName, SPECIALIZED_NAMES.support[index].en);
    translate(desc, `A piece from ${BANDS_EN[index]} focused on healing and group support.`);
    for (const piece of PIECES) {
      const id = `${setId}_${piece.suffix}`;
      const healing = range(level * 0.25, level * 0.45);
      const cdr = range(Math.max(1, level / 60), Math.min(8, Math.max(1, level / 35)));
      const escape = range(Math.max(1, level / 45), Math.min(6, Math.max(1, level / 30)));
      const hp = range(level * 0.3, level * 0.5);
      const spirit = range(level * 0.15, level * 0.3);
      const damage = range(1, Math.min(6, Math.max(1, 6 * (level / 200))));
      const rolls = [{ stat: 'healingPower', op: 'flat', ...healing }];
      if (band >= 1) rolls.push({ stat: 'cooldownReduction', op: 'flat', ...cdr });
      if (band >= 2) rolls.push({ stat: 'escape', op: 'flat', ...escape });
      if (band >= 3) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
      if (band >= 4) rolls.push({ stat: 'spirit', op: 'flat', ...spirit });
      if (band >= 5) rolls.push({ stat: 'resourceRegen', op: 'flat', ...range(level / 50, Math.min(5, level / 30)) });
      if (band >= 7) rolls.push({ stat: 'damage.water', op: 'flat', ...damage });
      const name = `${piece.noun} ${setName}`;
      itemsDoc.items[id] = {
        weight: piece.weight, name, description: desc,
        icon: piece.icon, kind: piece.kind, category: piece.category, slot: piece.slot, rarity: rarity(band), level,
        value: Math.round(12 + level * level * 0.06), maxStack: 1, setId, implicit: [], rolls, dropWeight: Math.max(1, 20 - band),
      };
      translate(name, `${NOUN_EN[piece.noun]} ${SPECIALIZED_NAMES.support[index].en}`);
      generated.push(id);
    }
  }
}

// El herrero agrupa rutas de combate y especializadas; el boticario conserva los cuadernos.
merchantsDoc.merchants.smith.stock.push(
  ...generated.filter((id) => id.startsWith('route_') || id.startsWith('spec_')).map((itemId) => ({ itemId, quantity: null }))
);
merchantsDoc.merchants.apothecary.stock.push(...generated.filter((id) => id.startsWith('learning_')).map((itemId) => ({ itemId, quantity: null })));

const specializedCount = BANDS.length * 4;
console.log(`Matriz 1–200: ${generated.length} piezas, ${Object.keys(ELEMENTS).length * BANDS.length} sets elementales, ${BANDS.length} sets de aprendizaje, ${specializedCount} sets especializados.`);
if (WRITE) {
  writeFileSync(itemsFile, `${JSON.stringify(itemsDoc, null, 2)}\n`);
  writeFileSync(setsFile, `${JSON.stringify(setsDoc, null, 2)}\n`);
  writeFileSync(merchantsFile, `${JSON.stringify(merchantsDoc, null, 2)}\n`);
  writeFileSync(i18nFile, `${JSON.stringify(i18nDoc, null, 2)}\n`);
}
