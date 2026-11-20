#!/usr/bin/env node
// Creador (2026-11-19): «la montura deberiamos hacer 6 falcopama cada una que de 200 de elemento
// con sus colores correspondientes, otra que de 100% de potencia y de velocidad de movimiento» y
// «agrega esos 6 slots para agregar items que nos potencien ya que estamos muy manquitos».
//
// Escribe en items.json las siete falcopamas (`mount_falcopama_*`) y seis huacas de muestra
// (`huaca_*`, figuras de oro precolombinas del istmo; el hueco es `huaca1..6`), su inglés en
// en.content.json y la paleta `pardo_tierra` en falcopama_variantes.json. Las +200 y el +100 %
// son del creador; nivel, rareza y las cifras de las huacas son PROPUESTA. No caen ni se venden
// todavía: se consiguen en las partidas de prueba (src/dev/presets.ts). Determinista e
// idempotente. Sin --write solo enseña lo que haría.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const file = (name) => new URL(name, ROOT);
const read = (name) => JSON.parse(readFileSync(file(name), 'utf8'));
const itemsDoc = read('data/rpg/items.json');
const i18nDoc = read('data/i18n/en.content.json');
const paletteDoc = read('data/art/falcopama_variantes.json');
const WRITE = process.argv.includes('--write');

const LEVEL = 60; // PROPUESTA
const MOUNT_BASE = structuredClone(itemsDoc.items.mount_dev_falcopama.mount);

// Paleta nueva para tierra (las otras cinco ya existen): pardo y ocre.
const PARDO_TIERRA = {
    plumaje_principal: '#e6d6b8',
    plumaje_secundario: '#8a5a2b',
    mascara_facial: '#3e2614',
    pecho_cresta: '#b98a4a',
    pico_garras: '#d49a3a',
    cuero_silla: '#5e3a24',
    herrajes: '#c9a24e',
};
paletteDoc.variantes.pardo_tierra = PARDO_TIERRA;
// La paleta va una variante por línea: se añade como texto para no reformatear el resto.
const paletteText = readFileSync(file('data/art/falcopama_variantes.json'), 'utf8').replace(
    /,\n    "pardo_tierra": \{[^\n]*\}/,
    '',
);
const lastVariant = paletteText.lastIndexOf('}\n  }');
const newPalette = `${paletteText.slice(0, lastVariant + 1)},\n    "pardo_tierra": ${JSON.stringify(PARDO_TIERRA)}${paletteText.slice(lastVariant + 1)}`;
JSON.parse(newPalette);

const MOUNT_DESC = {
    es: 'Falcopama teñida de su elemento: quien la monta pega con él. Vuela con Tab.',
    en: 'A Falcopama dyed in its element: whoever rides it strikes with it. Flies with Tab.',
};
const BRIO_DESC = {
    es: 'Falcopama de brío: empuja cada golpe y cada paso de su jinete. Vuela con Tab.',
    en: 'A spirited Falcopama: it drives every blow and every step of its rider. Flies with Tab.',
};
/** Elemento → característica (src/sim/damage.ts) y paleta del modelo. */
export const ELEMENTAL_MOUNTS = [
    { el: 'earth', stat: 'strength', variant: 'pardo_tierra', es: 'de Tierra', en: 'of Earth' },
    { el: 'fire', stat: 'intellect', variant: 'rojo_carmesi', es: 'de Fuego', en: 'of Fire' },
    { el: 'air', stat: 'agility', variant: 'verde_esmeralda', es: 'de Aire', en: 'of Air' },
    { el: 'water', stat: 'flow', variant: 'oceano_profundo', es: 'de Agua', en: 'of Water' },
    { el: 'frost', stat: 'calm', variant: 'azul_celeste', es: 'de Escarcha', en: 'of Frost' },
    { el: 'lightning', stat: 'will', variant: 'dorado_solar', es: 'de Rayo', en: 'of Lightning' },
];

const ids = [];
function mount(id, name, desc, variant, implicit) {
    const palette = paletteDoc.variantes[variant];
    itemsDoc.items[id] = {
        _nota: 'Creador 2026-11-19 (cifra del elemento o de potencia y velocidad); nivel y rareza PROPUESTA. scripts/balance/falcopamasHuacas.mjs.',
        weight: 1,
        name: name.es,
        description: desc.es,
        icon: '🪽',
        kind: 'mount',
        category: 'armor',
        slot: 'mount',
        rarity: 'legendary',
        level: LEVEL,
        value: 5000,
        maxStack: 1,
        implicit,
        rolls: [],
        mount: {
            ...MOUNT_BASE,
            color: palette.plumaje_secundario,
            accent: palette.mascara_facial,
            variant,
            variants: [variant],
        },
        dropWeight: 0,
    };
    i18nDoc[name.es] = name.en;
    i18nDoc[desc.es] = desc.en;
    ids.push(id);
}

for (const m of ELEMENTAL_MOUNTS)
    mount(`mount_falcopama_${m.el}`, { es: `Falcopama ${m.es}`, en: `Falcopama ${m.en}` }, MOUNT_DESC, m.variant, [
        { stat: m.stat, op: 'flat', value: 200 },
        { stat: 'moveSpeed', op: 'flat', value: 1.8 },
    ]);
mount('mount_falcopama_brio', { es: 'Falcopama de Brío', en: 'Spirited Falcopama' }, BRIO_DESC, 'violeta_arcano', [
    { stat: 'power', op: 'flat', value: 100 },
    { stat: 'moveSpeed', op: 'percent', value: 100 },
]);

// Huacas (PROPUESTA): una por motivo de la orfebrería de Gran Coclé, cada una con su potencia.
// La Potencia va con daño a todos los elementos (contrato de EQ-07).
const HUACA_DESC = {
    es: 'Figura de oro de los antiguos orfebres del istmo; potencia a quien la lleva. No se llevan dos iguales.',
    en: 'A gold figure by the ancient goldsmiths of the isthmus; it empowers whoever wears it. No two alike can be worn.',
};
const RESISTS = ['earth', 'fire', 'air', 'water', 'frost', 'lightning'];
export const HUACAS = [
    {
        id: 'rana',
        es: 'de la Rana de Oro',
        en: 'of the Golden Frog',
        mods: [
            ['power', 60],
            ['elementalDamage', 10],
        ],
    },
    {
        id: 'jaguar',
        es: 'del Jaguar',
        en: 'of the Jaguar',
        mods: [
            ['critChance', 0.08],
            ['critBonus', 0.15],
        ],
    },
    { id: 'aguila', es: 'del Águila', en: 'of the Eagle', mods: [['elementalDamage', 20]] },
    { id: 'caiman', es: 'del Caimán', en: 'of the Caiman', mods: [['maxHealth', 400]] },
    { id: 'tortuga', es: 'de la Tortuga', en: 'of the Turtle', mods: RESISTS.map((e) => [`resist.${e}`, 10]) },
    {
        id: 'murcielago',
        es: 'del Murciélago',
        en: 'of the Bat',
        mods: [
            ['cooldownReduction', 0.08],
            ['healthRegen', 6],
        ],
    },
];
for (const h of HUACAS) {
    const id = `huaca_${h.id}`;
    const name = { es: `Huaca ${h.es}`, en: `Huaca ${h.en}` };
    itemsDoc.items[id] = {
        _nota: 'PROPUESTA (creador 2026-11-19 pidió seis huecos de objetos raros que potencian; nombre y cifras por decidir). scripts/balance/falcopamasHuacas.mjs.',
        weight: 1,
        name: name.es,
        description: HUACA_DESC.es,
        icon: 'huaca',
        kind: 'huaca',
        category: 'jewel',
        slot: 'huaca',
        rarity: 'legendary',
        level: LEVEL,
        value: 4000,
        maxStack: 1,
        implicit: h.mods.map(([stat, value]) => ({ stat, op: 'flat', value })),
        rolls: [],
        dropWeight: 0,
    };
    i18nDoc[name.es] = name.en;
    ids.push(id);
}
i18nDoc[HUACA_DESC.es] = HUACA_DESC.en;

console.log(`${ids.length} objetos: ${ids.join(', ')}`);
if (WRITE) {
    writeFileSync(file('data/rpg/items.json'), `${JSON.stringify(itemsDoc, null, 2)}\n`);
    writeFileSync(file('data/i18n/en.content.json'), `${JSON.stringify(i18nDoc, null, 2)}\n`);
    writeFileSync(file('data/art/falcopama_variantes.json'), newPalette);
}
