#!/usr/bin/env node
// Conjuntos trielementales tardíos: 4 sets con tres elementos cada uno.
// Cada set tiene 5 piezas y una franja de nivel propia (141-200).
// El pico de daño de cada elemento es menor que el mono-set de la misma franja.
// La suma de utilidad no convierte al trielemental en mejor opción universal.
// El generador es determinista e idempotente.
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

// 5 piezas por set trielemental.
const TRI_PIECES = [
    { suffix: 'head', noun: 'Sombrero', category: 'armor', slot: 'head', kind: 'hat', icon: 'head', weight: 4 },
    { suffix: 'chest', noun: 'Casaca', category: 'armor', slot: 'chest', kind: 'armor', icon: 'chest', weight: 8 },
    { suffix: 'hands', noun: 'Guantes', category: 'armor', slot: 'hands', kind: 'gloves', icon: 'hands', weight: 3 },
    { suffix: 'feet', noun: 'Botas', category: 'armor', slot: 'feet', kind: 'boots', icon: 'feet', weight: 5 },
    { suffix: 'back', noun: 'Mochila', category: 'armor', slot: 'back', kind: 'cape', icon: 'back', weight: 5 },
];

const NOUN_EN = {
    Sombrero: 'Hat',
    Casaca: 'Coat',
    Guantes: 'Gloves',
    Botas: 'Boots',
    Mochila: 'Backpack',
    Medalla: 'Medal',
};

// Los 4 conjuntos trielementales del documento de diseño.
// Compás del Istmo tiene 3 variantes (7 elementos combinados posibles, elegimos 3 representativas).
const TRI_ELEMENTAL_SETS = [
    {
        id: 'tri_tres_corrientes',
        levelMin: 152,
        levelMax: 166,
        elements: ['water', 'frost', 'lightning'],
        region: 'encuentro de montaña, río y tormenta',
        function: 'flexibilidad de control y recurso; menor pico elemental',
        name: { es: 'de las Tres Corrientes', en: 'of the Three Currents' },
    },
    {
        id: 'tri_tambor_azuero',
        levelMin: 164,
        levelMax: 178,
        elements: ['earth', 'fire', 'air'],
        region: 'Azuero; cuero, madera y resonancia',
        function: 'combate cercano móvil; daño repartido',
        name: { es: 'del Tambor de Azuero', en: 'of the Azuero Drum' },
    },
    {
        id: 'tri_dos_mares',
        levelMin: 176,
        levelMax: 188,
        elements: ['water', 'earth', 'lightning'],
        region: 'Canal y costas del mundo del juego',
        function: 'aguante, Hallazgo y Concentración',
        name: { es: 'de los Dos Mares', en: 'of the Two Seas' },
    },
    // Compás del Istmo: 3 variantes de elección de tres elementos.
    {
        id: 'tri_compas_tierra_fuego_agua',
        levelMin: 188,
        levelMax: 200,
        elements: ['earth', 'fire', 'water'],
        region: 'cierre de la progresión 1-200',
        function: 'amplitud final; fuerza, intelecto y caudal',
        name: { es: 'del Compás del Istmo (Tierra-Fuego-Agua)', en: 'of the Isthmus Compass (Earth-Fire-Water)' },
    },
    {
        id: 'tri_compas_aire_hielo_rayo',
        levelMin: 188,
        levelMax: 200,
        elements: ['air', 'frost', 'lightning'],
        region: 'cierre de la progresión 1-200',
        function: 'amplitud final; agilidad, calma y voluntad',
        name: { es: 'del Compás del Istmo (Aire-Hielo-Rayo)', en: 'of the Isthmus Compass (Air-Frost-Lightning)' },
    },
    {
        id: 'tri_compas_tierra_aire_rayo',
        levelMin: 188,
        levelMax: 200,
        elements: ['earth', 'air', 'lightning'],
        region: 'cierre de la progresión 1-200',
        function: 'amplitud final; fuerza, agilidad y voluntad',
        name: { es: 'del Compás del Istmo (Tierra-Aire-Rayo)', en: 'of the Isthmus Compass (Earth-Air-Lightning)' },
    },
];

const rarity = (level) => {
    if (level <= 40) return 'uncommon';
    if (level <= 80) return 'rare';
    if (level <= 140) return 'epic';
    return 'legendary';
};

const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
const range = (min, max) => ({ min: Math.max(1, Math.round(min)), max: Math.max(1, Math.round(max)) });
const generated = [];
const translate = (es, en) => {
    i18nDoc[es] = en;
};

// Retira únicamente una versión anterior de los sets trielementales.
for (const id of Object.keys(itemsDoc.items)) {
    if (id.startsWith('tri_')) delete itemsDoc.items[id];
}
for (const id of Object.keys(setsDoc.sets)) {
    if (id.startsWith('tri_')) delete setsDoc.sets[id];
}
for (const merchant of Object.values(merchantsDoc.merchants)) {
    merchant.stock = merchant.stock.filter((s) => !s.itemId.startsWith('tri_'));
}

// ─── Generación de los 7 sets trielementales ──────────────────────────────
// Cada set reparte primarias y daño entre tres elementos.
// El pico de cada elemento es ~40% del mono-set de la misma franja.
// Ningún set trielemental recibe experienceGain.
// La suma de utilidad es inferior a la de un mono-set completo + piezas sueltas.

for (const setDef of TRI_ELEMENTAL_SETS) {
    const { id, levelMin, levelMax, elements, region, function: func, name } = setDef;
    const level = Math.round((levelMin + levelMax) / 2);
    const [elem1, elem2, elem3] = elements;
    const identity1 = ELEMENTS[elem1];
    const identity2 = ELEMENTS[elem2];
    const identity3 = ELEMENTS[elem3];

    const setName = name.es;
    const desc = `Pieza trielemental de ${region.toLowerCase()}: ${func.toLowerCase()}.`;

    // Bonos de set: 2 piezas dan primaria combinada, 5 piezas dan daño triple + utilidad.
    setsDoc.sets[id] = {
        name: setName,
        _build: `Set trielemental ${elem1}+${elem2}+${elem3}, nivel ${levelMin}–${levelMax}: ${func}; daño triple inferior al mono-set.`,
        bonuses: [
            {
                pieces: 2,
                modifiers: [
                    { stat: identity1.primary, op: 'flat', value: round5(3 + level * 0.04) },
                    { stat: identity2.primary, op: 'flat', value: round5(2 + level * 0.03) },
                    { stat: identity3.primary, op: 'flat', value: round5(2 + level * 0.02) },
                ],
            },
            {
                pieces: 5,
                modifiers: [
                    { stat: `damage.${elem1}`, op: 'flat', value: Math.min(5, Math.max(1, Math.round(level / 50))) },
                    { stat: `damage.${elem2}`, op: 'flat', value: Math.min(4, Math.max(1, Math.round(level / 60))) },
                    { stat: `damage.${elem3}`, op: 'flat', value: Math.min(3, Math.max(1, Math.round(level / 70))) },
                    { stat: identity1.secondary, op: 'flat', value: Math.min(6, Math.max(1, Math.round(level / 40))) },
                    { stat: identity2.secondary, op: 'flat', value: Math.min(5, Math.max(1, Math.round(level / 50))) },
                ],
            },
        ],
    };
    translate(setName, name.en);
    translate(desc, `A tri-elemental piece from ${region.toLowerCase()}: ${func.toLowerCase()}.`);

    for (const piece of TRI_PIECES) {
        const pid = `${id}_${piece.suffix}`;

        // Primarias: ~40% del mono-set para cada elemento (repartido entre 3).
        const primary1 = range(level * 0.12, level * 0.18);
        const primary2 = range(level * 0.08, level * 0.14);
        const primary3 = range(level * 0.05, level * 0.1);

        // Daño elemental: ~40% del mono-set por elemento (repartido entre 3).
        const damage1 = range(Math.max(1, level / 80), Math.min(14, Math.max(1, 14 * (level / 200) ** 2)));
        const damage2 = range(Math.max(1, level / 100), Math.min(10, Math.max(1, 10 * (level / 200) ** 2)));
        const damage3 = range(Math.max(1, level / 120), Math.min(8, Math.max(1, 8 * (level / 200) ** 2)));

        // Vida y recurso: inferior al mono-set para mantener desventaja defensiva.
        const hp = range(level * 0.25, level * 0.45);
        const resource = range(level * 0.15, level * 0.25);

        // Secundarias y utilidad.
        const secondary1 = range(Math.max(1, level / 60), Math.min(8, Math.max(1, level / 35)));
        const secondary2 = range(Math.max(1, level / 70), Math.min(6, Math.max(1, level / 45)));
        const secondary3 = range(Math.max(1, level / 80), Math.min(5, Math.max(1, level / 50)));
        const resist1 = range(Math.max(1, level / 50), Math.min(8, Math.max(1, level / 30)));
        const resist2 = range(Math.max(1, level / 60), Math.min(6, Math.max(1, level / 40)));
        const resist3 = range(Math.max(1, level / 70), Math.min(5, Math.max(1, level / 45)));

        const rolls = [
            { stat: identity1.primary, op: 'flat', ...primary1 },
            { stat: identity2.primary, op: 'flat', ...primary2 },
            { stat: identity3.primary, op: 'flat', ...primary3 },
        ];

        // Daño triple desde el primer set — es la identidad trielemental.
        rolls.push({ stat: `damage.${elem1}`, op: 'flat', ...damage1 });
        rolls.push({ stat: `damage.${elem2}`, op: 'flat', ...damage2 });
        rolls.push({ stat: `damage.${elem3}`, op: 'flat', ...damage3 });

        if (level >= 141) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
        if (level >= 141) rolls.push({ stat: identity1.secondary, op: 'flat', ...secondary1 });
        if (level >= 141) rolls.push({ stat: identity2.secondary, op: 'flat', ...secondary2 });
        if (level >= 141) rolls.push({ stat: identity3.secondary, op: 'flat', ...secondary3 });
        if (level >= 141) rolls.push({ stat: `resist.${elem1}`, op: 'flat', ...resist1 });
        if (level >= 141) rolls.push({ stat: `resist.${elem2}`, op: 'flat', ...resist2 });
        if (level >= 141) rolls.push({ stat: `resist.${elem3}`, op: 'flat', ...resist3 });
        if (level >= 141) rolls.push({ stat: 'maxResource', op: 'flat', ...resource });
        if (level >= 141) rolls.push({ stat: 'spirit', op: 'flat', ...range(level * 0.12, level * 0.18) });

        const nameStr = `${piece.noun} ${setName}`;
        itemsDoc.items[pid] = {
            weight: piece.weight,
            name: nameStr,
            description: desc,
            icon: piece.icon,
            kind: piece.kind,
            category: piece.category,
            slot: piece.slot,
            rarity: rarity(level),
            level: Math.round(levelMin + (piece.weight / 25) * (levelMax - levelMin)),
            value: Math.round(15 + level * level * 0.07),
            maxStack: 1,
            setId: id,
            implicit: [],
            rolls,
            dropWeight: Math.max(1, 20 - Math.round(level / 15)),
        };
        translate(nameStr, `${NOUN_EN[piece.noun]} ${name.en}`);
        generated.push(pid);
    }
}

// Los trielementales van al herrero (combate).
merchantsDoc.merchants.smith.stock.push(...generated.map((itemId) => ({ itemId, quantity: null })));

console.log(`Trielementales tardíos: ${generated.length} piezas, ${TRI_ELEMENTAL_SETS.length} sets.`);
if (WRITE) {
    writeFileSync(itemsFile, `${JSON.stringify(itemsDoc, null, 2)}\n`);
    writeFileSync(setsFile, `${JSON.stringify(setsDoc, null, 2)}\n`);
    writeFileSync(merchantsFile, `${JSON.stringify(merchantsDoc, null, 2)}\n`);
    writeFileSync(i18nFile, `${JSON.stringify(i18nDoc, null, 2)}\n`);
}
