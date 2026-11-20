#!/usr/bin/env node
// EQ-10 (creador, 2026-11-19): «genera un set de 8 piezas de la diablica para nivel 50 que den
// stats razonables y se utilicen las piezas del propio npc para separarlas y guardarlas como
// items equipables».
//
// Escribe el conjunto `diablica_espeja` (sets.json), sus 8 piezas (items.json), el inglés
// (en.content.json) y, como PROPUESTA de obtención, las pone en el botín de La Espeja
// (`espejo_boss`). Las cifras que deja aquí son solo la semilla de qué líneas lleva cada pieza:
// `eq07Equipment.mjs --write` las reescribe con la curva de EQ-07, así que ejecútese siempre
// antes que él. Los modelos salen de `scripts/blender/equipo_diablica.py`.
//
// El id no empieza por `bi_` a propósito: `generateBiElementalSets.mjs` borra todo `bi_*` al
// regenerar. Determinista e idempotente. Sin --write solo enseña lo que haría.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const file = (name) => new URL(name, ROOT);
const read = (name) => JSON.parse(readFileSync(file(name), 'utf8'));
const itemsDoc = read('data/rpg/items.json');
const setsDoc = read('data/rpg/sets.json');
const lootDoc = read('data/rpg/loot.json');
const i18nDoc = read('data/i18n/en.content.json');
const WRITE = process.argv.includes('--write');

export const SET_ID = 'diablica_espeja';
const LEVEL = 50;
const SET_NAME = { es: 'de la Diablica Espeja', en: 'of the Mirror Diablica' };
const DESC = {
    es: 'Pieza del ajuar de La Diablica Espeja, tierra y aire: fuerza para el placaje y agilidad para el baile.',
    en: "A piece of the Mirror Diablica's costume, earth and air: strength to tackle and agility to dance.",
};

// Semilla de líneas: tierra + aire (Fuerza y Agilidad, daño de ambos) más una secundaria.
// EQ-07 pone las horquillas; aquí solo cuenta qué estadísticas lleva cada pieza.
const DUAL = [
    { stat: 'strength', op: 'flat', min: 1, max: 2 },
    { stat: 'agility', op: 'flat', min: 1, max: 2 },
    { stat: 'maxHealth', op: 'flat', min: 1, max: 2 },
    { stat: 'damage.earth', op: 'flat', min: 1, max: 2 },
    { stat: 'damage.air', op: 'flat', min: 1, max: 2 },
];
const plus = (stat) => [...DUAL, { stat, op: 'flat', min: 1, max: 2 }];

/** Las 8 piezas: cada una sale de una parte del modelo de La Espeja (equipo_diablica.py). */
export const PIECES = [
    { slot: 'head', kind: 'hat', icon: 'head', weight: 4, es: 'Tocado', en: 'Headdress', rolls: plus('tackle') },
    { slot: 'chest', kind: 'armor', icon: 'chest', weight: 6, es: 'Blusa', en: 'Blouse', rolls: plus('tackle') },
    { slot: 'amulet', kind: 'amulet', icon: 'amulet', weight: 1, es: 'Cuello', en: 'Collar', rolls: plus('critChance') },
    { slot: 'waist', kind: 'belt', icon: 'belt', weight: 3, es: 'Falda', en: 'Skirt', rolls: plus('escape') },
    { slot: 'hands', kind: 'gloves', icon: 'hands', weight: 2, es: 'Guantes', en: 'Gloves', rolls: plus('tackle') },
    { slot: 'feet', kind: 'boots', icon: 'feet', weight: 4, es: 'Zapatos', en: 'Shoes', rolls: plus('escape') },
    { slot: 'back', kind: 'cape', icon: 'back', weight: 2, es: 'Lazo', en: 'Ribbon', rolls: plus('escape') },
    {
        slot: 'weapon',
        kind: 'staff',
        icon: 'staff',
        weight: 6,
        es: 'Bastón',
        en: 'Cane',
        category: 'weapon',
        rolls: [
            { stat: 'strength', op: 'flat', min: 1, max: 2 },
            { stat: 'damage.earth', op: 'flat', min: 1, max: 2 },
        ],
        // Mismo alcance y ritmo que los bastones de su franja (cold_mist_staff, nivel 50);
        // EQ-07 pone el daño del arma.
        weapon: { min: 1, max: 2, element: 'earth', speed: 1.2, range: 1.5 },
    },
];

export const pieceId = (slot) => `${SET_ID}_${slot === 'weapon' ? 'staff' : slot}`;

// Bonos por escalón (PROPUESTA): del orden de bi_diablico_espejo (40) y route_03_fire (52).
setsDoc.sets[SET_ID] = {
    name: SET_NAME.es,
    _build: `EQ-10 (PROPUESTA). Ajuar de La Espeja, tierra+aire, nivel ${LEVEL}, 8 piezas sacadas de su modelo: Fuerza y Agilidad, placaje y huida.`,
    bonuses: [
        {
            pieces: 2,
            modifiers: [
                { stat: 'strength', op: 'flat', value: 5 },
                { stat: 'agility', op: 'flat', value: 5 },
            ],
        },
        {
            pieces: 4,
            modifiers: [
                { stat: 'damage.earth', op: 'flat', value: 1 },
                { stat: 'damage.air', op: 'flat', value: 1 },
            ],
        },
        {
            pieces: 6,
            modifiers: [
                { stat: 'tackle', op: 'flat', value: 2 },
                { stat: 'escape', op: 'flat', value: 2 },
            ],
        },
        {
            pieces: 8,
            modifiers: [
                { stat: 'critChance', op: 'flat', value: 0.02 },
                { stat: 'moveSpeed', op: 'percent', value: 3 },
            ],
        },
    ],
};
i18nDoc[SET_NAME.es] = SET_NAME.en;
i18nDoc[DESC.es] = DESC.en;

const ids = [];
for (const p of PIECES) {
    const id = pieceId(p.slot);
    const name = `${p.es} ${SET_NAME.es}`;
    itemsDoc.items[id] = {
        weight: p.weight,
        name,
        description: DESC.es,
        icon: p.icon,
        kind: p.kind,
        category: p.category ?? (p.slot === 'amulet' ? 'jewel' : 'armor'),
        slot: p.slot,
        rarity: 'rare',
        level: LEVEL,
        value: Math.round(15 + LEVEL * LEVEL * 0.07),
        maxStack: 1,
        setId: SET_ID,
        implicit: [],
        rolls: structuredClone(p.rolls),
        dropWeight: 17,
        ...(p.weapon ? { weapon: { ...p.weapon } } : {}),
    };
    i18nDoc[name] = `${p.en} ${SET_NAME.en}`;
    ids.push(id);
}

// Obtención (PROPUESTA, decisión pendiente del creador): su propio ajuar en el botín de La Espeja,
// con menos peso que el set del Diablico Espejo de nivel 40. Se edita como texto para no reformatear
// el resto de loot.json (tiene entradas escritas en una línea).
const lootText = readFileSync(file('data/rpg/loot.json'), 'utf8');
if (!(lootDoc.tables ?? lootDoc).espejo_boss) throw new Error('falta la tabla de botín espejo_boss');
const start = lootText.indexOf('"espejo_boss"');
const close = lootText.indexOf('\n      ]', lootText.indexOf('"entries"', start));
const body = lootText
    .slice(start, close)
    .replace(new RegExp(`,\\s*\\{\\s*"itemId": "${SET_ID}_[^}]*\\}`, 'g'), '');
const added = ids.map((itemId) => `,\n        {\n          "itemId": "${itemId}",\n          "weight": 1\n        }`).join('');
const newLoot = lootText.slice(0, start) + body + added + lootText.slice(close);
JSON.parse(newLoot);

console.log(`EQ-10: ${ids.length} piezas de ${SET_ID} (nivel ${LEVEL}); ejecuta luego eq07Equipment.mjs --write.`);
if (WRITE) {
    writeFileSync(file('data/rpg/items.json'), `${JSON.stringify(itemsDoc, null, 2)}\n`);
    writeFileSync(file('data/rpg/sets.json'), `${JSON.stringify(setsDoc, null, 2)}\n`);
    writeFileSync(file('data/rpg/loot.json'), newLoot);
    writeFileSync(file('data/i18n/en.content.json'), `${JSON.stringify(i18nDoc, null, 2)}\n`);
}
