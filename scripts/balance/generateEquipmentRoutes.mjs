#!/usr/bin/env node
// Matriz original 1–200: seis rutas mono-elementales y una ruta de aprendizaje
// por cada franja de 20 niveles. El generador es determinista e idempotente.
// Las rutas de aprendizaje sacrifican TODAS las estadísticas de combate.
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
for (const id of Object.keys(itemsDoc.items)) if (id.startsWith('route_') || id.startsWith('learning_')) delete itemsDoc.items[id];
for (const id of Object.keys(setsDoc.sets)) if (id.startsWith('route_') || id.startsWith('learning_')) delete setsDoc.sets[id];
for (const merchant of Object.values(merchantsDoc.merchants)) merchant.stock = merchant.stock.filter((s) => !s.itemId.startsWith('route_') && !s.itemId.startsWith('learning_'));

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

// El herrero agrupa rutas de combate; el boticario conserva los cuadernos.
merchantsDoc.merchants.smith.stock.push(...generated.filter((id) => id.startsWith('route_')).map((itemId) => ({ itemId, quantity: null })));
merchantsDoc.merchants.apothecary.stock.push(...generated.filter((id) => id.startsWith('learning_')).map((itemId) => ({ itemId, quantity: null })));

console.log(`Matriz 1–200: ${generated.length} piezas, ${Object.keys(ELEMENTS).length * BANDS.length} sets elementales, ${BANDS.length} sets de aprendizaje.`);
if (WRITE) {
  writeFileSync(itemsFile, `${JSON.stringify(itemsDoc, null, 2)}\n`);
  writeFileSync(setsFile, `${JSON.stringify(setsDoc, null, 2)}\n`);
  writeFileSync(merchantsFile, `${JSON.stringify(merchantsDoc, null, 2)}\n`);
  writeFileSync(i18nFile, `${JSON.stringify(i18nDoc, null, 2)}\n`);
}
