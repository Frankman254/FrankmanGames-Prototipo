#!/usr/bin/env node
// Conjuntos bielementales regionales: 10 sets con dos elementos cada uno.
// Cada set tiene 5 piezas y una franja de nivel propia (no uniforme).
// El pico de daño de cada elemento es menor que el mono-set de la misma franja.
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

// 5 piezas por set bielemental (incluye arma o escudo adicional).
const BI_PIECES = [
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

// Los 10 conjuntos bielementales del documento de diseño.
// Cada uno: nivel min, nivel max, elementos [primaria, secundaria], región, función.
const BI_ELEMENTAL_SETS = [
    {
        id: 'bi_diablico_sucio',
        levelMin: 28,
        levelMax: 38,
        elements: ['water', 'lightning'],
        region: 'tradición fantástica propia de los Diablicos del juego',
        function: 'Caudal, Voluntad, recurso y Concentración',
        name: { es: 'del Diablico Sucio', en: 'of the Dirty Diablico' },
    },
    {
        id: 'bi_diablico_espejo',
        levelMin: 38,
        levelMax: 48,
        elements: ['earth', 'fire'],
        region: 'línea de la máscara y el disfraz',
        function: 'Fuerza, Intelecto, Placaje y ruptura ofensiva',
        name: { es: 'del Diablico Espejo', en: 'of the Mirror Diablico' },
    },
    {
        id: 'bi_mangle_rojo',
        levelMin: 52,
        levelMax: 64,
        elements: ['earth', 'water'],
        region: 'Darién; raíces, lodo y mareas',
        function: 'Fuerza, Caudal, resistencia y Hallazgo',
        name: { es: 'del Mangle Rojo', en: 'of the Red Mangrove' },
    },
    {
        id: 'bi_bocas',
        levelMin: 64,
        levelMax: 72,
        elements: ['water', 'lightning'],
        region: 'Bocas; tormenta costera',
        function: 'recurso, daño dual y crítico moderado',
        name: { es: 'de Bocas del Vendaval', en: 'of the Bocas Gale' },
    },
    {
        id: 'bi_nube_baru',
        levelMin: 72,
        levelMax: 84,
        elements: ['air', 'frost'],
        region: 'Chiriquí; altura y sereno',
        function: 'Agilidad, Calma, Huida y Templanza',
        name: { es: 'de la Nube del Barú', en: 'of the Barú Cloud' },
    },
    {
        id: 'bi_tulivieja',
        levelMin: 92,
        levelMax: 100,
        elements: ['frost', 'lightning'],
        region: 'Cripta y relato propio del juego',
        function: 'Calma, Voluntad y control',
        name: { es: 'de la Tulivieja', en: 'of the Old Tuli' },
    },
    {
        id: 'bi_mareas_altas',
        levelMin: 94,
        levelMax: 100,
        elements: ['water', 'earth'],
        region: 'istmo y dos costas',
        function: 'Caudal, Fuerza y aguante',
        name: { es: 'de Mareas Altas', en: 'of the High Tides' },
    },
    {
        id: 'bi_campanas_portobelo',
        levelMin: 116,
        levelMax: 130,
        elements: ['fire', 'lightning'],
        region: 'Colona; metal, sal y fortaleza',
        function: 'Intelecto, Voluntad y apoyo de grupo',
        name: { es: 'de las Campanas de Portobelo', en: 'of the Portobelo Bells' },
    },
    {
        id: 'bi_camino_cruces',
        levelMin: 128,
        levelMax: 142,
        elements: ['earth', 'air'],
        region: 'tránsito histórico reinterpretado en el mundo propio',
        function: 'Fuerza, Agilidad, carga y movilidad',
        name: { es: 'del Camino de Cruces', en: 'of the Cruces Road' },
    },
    {
        id: 'bi_perla_coiba',
        levelMin: 140,
        levelMax: 154,
        elements: ['water', 'air'],
        region: 'Veraguas insular',
        function: 'Caudal, Agilidad, Hallazgo y Huida',
        name: { es: 'de la Perla de Coiba', en: 'of the Coiba Pearl' },
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

// Retira únicamente una versión anterior de los sets bielementales.
for (const id of Object.keys(itemsDoc.items)) {
    if (id.startsWith('bi_')) delete itemsDoc.items[id];
}
for (const id of Object.keys(setsDoc.sets)) {
    if (id.startsWith('bi_')) delete setsDoc.sets[id];
}
for (const merchant of Object.values(merchantsDoc.merchants)) {
    merchant.stock = merchant.stock.filter((s) => !s.itemId.startsWith('bi_'));
}

// ─── Generación de los 10 sets bielementales ──────────────────────────────
// Cada set reparte primarias y daño entre dos elementos.
// El pico de cada elemento es ~60% del mono-set de la misma franja.
// Ningún set bielemental recibe experienceGain.

for (const setDef of BI_ELEMENTAL_SETS) {
    const { id, levelMin, levelMax, elements, region, function: func, name } = setDef;
    const level = Math.round((levelMin + levelMax) / 2);
    const [elem1, elem2] = elements;
    const identity1 = ELEMENTS[elem1];
    const identity2 = ELEMENTS[elem2];

    const setName = name.es;
    const desc = `Pieza bielemental de ${region.toLowerCase()}: ${func.toLowerCase()}.`;

    // Bonos de set: 2 piezas dan primaria combinada, 5 piezas dan daño dual + utilidad.
    setsDoc.sets[id] = {
        name: setName,
        _build: `Set bielemental ${elem1}+${elem2}, nivel ${levelMin}–${levelMax}: ${func}; daño dual inferior al mono-set.`,
        bonuses: [
            {
                pieces: 2,
                modifiers: [
                    { stat: identity1.primary, op: 'flat', value: round5(3 + level * 0.06) },
                    { stat: identity2.primary, op: 'flat', value: round5(2 + level * 0.04) },
                ],
            },
            {
                pieces: 5,
                modifiers: [
                    { stat: `damage.${elem1}`, op: 'flat', value: Math.min(6, Math.max(1, Math.round(level / 40))) },
                    { stat: `damage.${elem2}`, op: 'flat', value: Math.min(5, Math.max(1, Math.round(level / 50))) },
                    { stat: identity1.secondary, op: 'flat', value: Math.min(8, Math.max(2, Math.round(level / 30))) },
                ],
            },
        ],
    };
    translate(setName, name.en);
    translate(desc, `A bi-elemental piece from ${region.toLowerCase()}: ${func.toLowerCase()}.`);

    for (const piece of BI_PIECES) {
        const pid = `${id}_${piece.suffix}`;

        // Primarias: ~60% del mono-set para cada elemento.
        const primary1 = range(level * 0.17, level * 0.25);
        const primary2 = range(level * 0.1, level * 0.17);

        // Daño elemental: ~60% del mono-set por elemento.
        const damage1 = range(Math.max(1, level / 70), Math.min(18, Math.max(1, 18 * (level / 200) ** 2)));
        const damage2 = range(Math.max(1, level / 90), Math.min(14, Math.max(1, 14 * (level / 200) ** 2)));

        // Vida y recurso.
        const hp = range(level * 0.35, level * 0.6);
        const resource = range(level * 0.15, level * 0.3);

        // Secundarias y utilidad.
        const secondary1 = range(Math.max(1, level / 50), Math.min(8, Math.max(1, level / 30)));
        const secondary2 = range(Math.max(1, level / 60), Math.min(6, Math.max(1, level / 40)));
        const resist1 = range(Math.max(1, level / 40), Math.min(8, Math.max(1, level / 25)));
        const resist2 = range(Math.max(1, level / 50), Math.min(6, Math.max(1, level / 35)));

        const rolls = [
            { stat: identity1.primary, op: 'flat', ...primary1 },
            { stat: identity2.primary, op: 'flat', ...primary2 },
        ];

        // Daño dual desde el primer set — es la identidad bielemental.
        rolls.push({ stat: `damage.${elem1}`, op: 'flat', ...damage1 });
        rolls.push({ stat: `damage.${elem2}`, op: 'flat', ...damage2 });

        if (level >= 28) rolls.push({ stat: 'maxHealth', op: 'flat', ...hp });
        if (level >= 30) rolls.push({ stat: identity1.secondary, op: 'flat', ...secondary1 });
        if (level >= 35) rolls.push({ stat: identity2.secondary, op: 'flat', ...secondary2 });
        if (level >= 40) rolls.push({ stat: `resist.${elem1}`, op: 'flat', ...resist1 });
        if (level >= 50) rolls.push({ stat: `resist.${elem2}`, op: 'flat', ...resist2 });
        if (level >= 60) rolls.push({ stat: 'maxResource', op: 'flat', ...resource });
        if (level >= 70) rolls.push({ stat: 'spirit', op: 'flat', ...range(level * 0.1, level * 0.15) });

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

// Los bielementales van al herrero (combate).
merchantsDoc.merchants.smith.stock.push(...generated.map((itemId) => ({ itemId, quantity: null })));

console.log(`Bielementales regionales: ${generated.length} piezas, ${BI_ELEMENTAL_SETS.length} sets.`);
if (WRITE) {
    writeFileSync(itemsFile, `${JSON.stringify(itemsDoc, null, 2)}\n`);
    writeFileSync(setsFile, `${JSON.stringify(setsDoc, null, 2)}\n`);
    writeFileSync(merchantsFile, `${JSON.stringify(merchantsDoc, null, 2)}\n`);
    writeFileSync(i18nFile, `${JSON.stringify(i18nDoc, null, 2)}\n`);
}
