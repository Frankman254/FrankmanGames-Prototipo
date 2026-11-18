#!/usr/bin/env node
// EQ-07 (creador, 2026-11-18): contrato único del equipo 1–200.
//
// Cifras del creador para una pieza principal de nivel 200 (docs/diseno/00_DECISIONES.md):
// Vida 300–500; daño fijo 9–20 por elemento; primaria mín. 50–70 / máx. 80–120;
// resistencia 7–10 %; Espíritu mín. 30–50 / máx. 50–70; Potencia (solo piezas de
// los seis elementos) como la primaria, con daño 9–20 a todos; crítico mín. 3–5 % /
// máx. 6–10 %; Hallazgo 2–5 desde nivel 1 y mín. 10–15 / máx. 21–30 en 200.
// Multielemento: elementos distintos; tri al 60–70 % por primaria; el crítico puede
// ir en cualquier ranura pero no en todas las piezas de un conjunto; sin azar al caer.
//
// Lo demás (curva lineal desde nivel 1, factor por ranura, secundarias) es PROPUESTA
// documentada en docs/diseno/07_EQUIPO_Y_CONJUNTOS.md. Sustituye a las cifras que
// escribían rebalanceEquipment.mjs y los generadores de rutas, bi- y trielementales:
// ejecútese siempre después de ellos. Determinista. Sin --write solo audita.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const file = (name) => new URL(name, ROOT);
const itemsDoc = JSON.parse(readFileSync(file('data/rpg/items.json'), 'utf8'));
const setsDoc = JSON.parse(readFileSync(file('data/rpg/sets.json'), 'utf8'));
const merchantsDoc = JSON.parse(readFileSync(file('data/rpg/merchants.json'), 'utf8'));
const i18nDoc = JSON.parse(readFileSync(file('data/i18n/en.content.json'), 'utf8'));
const WRITE = process.argv.includes('--write');
const items = itemsDoc.items;

export const ELEMENTS = ['earth', 'fire', 'air', 'water', 'frost', 'lightning'];
export const ELEMENT_PRIMARY = {
    earth: 'strength',
    fire: 'intellect',
    air: 'agility',
    water: 'flow',
    frost: 'calm',
    lightning: 'will',
};
const PRIMARY_ELEMENT = Object.fromEntries(Object.entries(ELEMENT_PRIMARY).map(([e, s]) => [s, e]));
const PRIMARIES = Object.values(ELEMENT_PRIMARY);

const CURVE_DOC = JSON.parse(readFileSync(file('data/balance/equipmentCurve.json'), 'utf8'));
/** Peso de cada ranura frente a una pieza principal. */
export const SLOT_FACTOR = CURVE_DOC.slotFactor;
/** Parte de la primaria según cuántos elementos da la pieza (creador: tri 60–70 %). */
export const ELEMENT_SHARE = CURVE_DOC.elementShare;
/** Curva de una pieza principal: [mínLo, mínHi, máxLo, máxHi] en nivel 1 y en 200. */
export const CURVE = CURVE_DOC.curve;
/** Estadísticas que se guardan en fracción 0..1 (la curva va en %). */
const FRACTION = new Set(CURVE_DOC.fraction);

export function curveOf(stat) {
    if (PRIMARIES.includes(stat)) return 'primary';
    if (stat.startsWith('damage.') || stat === 'elementalDamage') return 'damage';
    if (stat.startsWith('resist.')) return 'resist';
    if (stat === 'escape') return 'tackle';
    if (['slowResist', 'castStability', 'healingPower'].includes(stat)) return 'percentUtility';
    if (stat === 'healthRegen' || stat === 'resourceRegen') return 'regen';
    return CURVE[stat] ? stat : null;
}

/** Horquilla de una línea: curva × ranura × parte; `h1`, `h2` en [0,1] eligen dentro de cada intervalo. */
export function lineRange(stat, level, factor, h1, h2) {
    const name = curveOf(stat);
    if (!name) return null;
    const [lo, hi] = CURVE[name];
    const t = Math.max(0, Math.min(1, (level - 1) / 199));
    const at = (i) => lo[i] + (hi[i] - lo[i]) * t;
    const mn = (at(0) + (at(1) - at(0)) * h1) * factor;
    const mx = (at(2) + (at(3) - at(2)) * h2) * factor;
    let min = Math.max(1, Math.round(mn));
    let max = Math.max(min + 1, Math.round(mx));
    if (FRACTION.has(stat)) return { min: min / 100, max: max / 100 };
    return { min, max };
}

/** Hash determinista de una cadena a [0,1). */
function hash01(s) {
    let h = 2166136261;
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return (h % 10007) / 10007;
}

const isLearning = (item) => /^learning_/.test(item.setId ?? '');
/** Pieza patrón aprobada (Bastón de la quebrada, nivel 96, 16–25 de rayo): no se toca. */
export const PATTERN = new Set(['tulivieja_staff']);
/** Conjuntos elementales que siempre llevan su daño fijo; el resto solo si ya lo daba. */
const ELEMENTAL_SET = /^(route_\d\d_|bi_|tri_)/;
const linesOf = (item) => [...(item.implicit ?? []), ...(item.rolls ?? [])];

/** Rasgos fijos que no son poder de combate y se conservan tal cual. */
const FUNCTIONAL = new Set(['moveSpeed', 'carryCapacity', 'pickupRadius']);

function elementsOf(item) {
    if (item.weapon?.element) return [item.weapon.element];
    const route = /^route_\d\d_(\w+)$/.exec(item.setId ?? '');
    if (route) return [route[1]];
    const out = [];
    for (const line of linesOf(item)) {
        const e = PRIMARY_ELEMENT[line.stat] ?? (line.stat.startsWith('damage.') ? line.stat.slice(7) : null);
        if (e && ELEMENTS.includes(e) && !out.includes(e)) out.push(e);
    }
    return out.slice(0, 3).sort((a, b) => ELEMENTS.indexOf(a) - ELEMENTS.indexOf(b));
}

/** Familias sin elemento: aguante, espíritu y apoyo; precisión pasa a ser de Potencia (seis elementos). */
function familyOf(item) {
    const spec = /^spec_\d\d_(\w+)$/.exec(item.setId ?? '');
    return spec ? spec[1] : null;
}

const ORDER = [
    ...PRIMARIES,
    'power',
    'maxHealth',
    'spirit',
    'maxResource',
    'critChance',
    'critBonus',
    'elementalDamage',
    'healingPower',
    'resourceRegen',
    'healthRegen',
    'cooldownReduction',
    'tackle',
    'escape',
    'slowResist',
    'castStability',
    'discovery',
    'carryCapacity',
];
const orderOf = (stat) =>
    stat.startsWith('damage.')
        ? 40 + ELEMENTS.indexOf(stat.slice(7))
        : stat.startsWith('resist.')
          ? 50 + ELEMENTS.indexOf(stat.slice(7))
          : ORDER.indexOf(stat) >= 0
            ? ORDER.indexOf(stat)
            : 60;

/** Identidad de cada familia sin elemento (JEQ-01): siempre la lleva y no se recorta. */
const FAMILY_CORE = {
    endurance: ['maxHealth'],
    spirit: ['spirit', 'maxResource', 'resourceRegen'],
    precision: ['critChance', 'critBonus', 'castStability'],
    support: ['healingPower', 'cooldownReduction', 'escape'],
};

/** Prioridad al recortar líneas: lo primero se conserva. */
function keepPriority(stat, family) {
    if (FAMILY_CORE[family]?.includes(stat)) return 0;
    if (PRIMARIES.includes(stat) || stat === 'power') return 0;
    if (stat.startsWith('damage.') || stat === 'elementalDamage') return 1;
    if (stat === 'maxHealth') return 2;
    if (stat === 'discovery') return 3;
    if (stat === 'spirit' || stat === 'critChance') return 4;
    return 5;
}

function weaponDamage(item) {
    const speedFactor = Math.max(0.8, Math.min(1.25, 1.2 / item.weapon.speed));
    const min = Math.max(1, Math.round((item.level / 6) * speedFactor));
    const max = Math.max(min + 1, Math.round((item.level / 4 + 1.5) * speedFactor));
    return { min, max };
}

function rebuild(item, id) {
    const factor = SLOT_FACTOR[item.slot] ?? 1;
    const family = familyOf(item);
    const omni = family === 'precision';
    const elements = family ? [] : elementsOf(item);
    const share = ELEMENT_SHARE[Math.max(1, elements.length)] ?? 0.65;

    const fixed = (item.implicit ?? []).filter((l) => FUNCTIONAL.has(l.stat));
    const fixedRolls = (item.rolls ?? []).filter((l) => FUNCTIONAL.has(l.stat));
    const wanted = [];
    const add = (stat) => {
        if (!wanted.includes(stat)) wanted.push(stat);
    };
    for (const e of elements) add(ELEMENT_PRIMARY[e]);
    if (omni) add('power');
    for (const stat of FAMILY_CORE[family] ?? []) add(stat);
    const old = linesOf(item).map((l) => (l.stat === 'vitality' ? 'maxHealth' : l.stat));
    const hadDamage = old.some((s) => s.startsWith('damage.'));
    if (hadDamage || ELEMENTAL_SET.test(item.setId ?? '')) for (const e of elements) add(`damage.${e}`);
    if (omni) add('elementalDamage');

    let resists = 0;
    const maxResists = family === 'endurance' || item.slot === 'offhand' ? 6 : 2;
    for (const stat of old) {
        if (FUNCTIONAL.has(stat)) continue;
        if (PRIMARIES.includes(stat) || stat === 'power' || stat.startsWith('damage.')) continue;
        if (stat === 'elementalDamage' || stat === 'weaponPower' || stat === 'experienceGain') continue;
        if (stat.startsWith('resist.')) {
            if (resists >= maxResists) continue;
            resists++;
        }
        add(stat);
    }
    if (item.slot !== 'weapon' || old.includes('maxHealth')) add('maxHealth');
    if (elements.includes('water')) add('discovery');

    const core = elements.length * 2 + (omni ? 2 : 0) + (FAMILY_CORE[family]?.length ?? 0) + 1;
    const cap = Math.max(core + 1, 4 + Math.floor(item.level / 40));
    const kept = wanted
        .filter((stat) => curveOf(stat))
        .map((stat, i) => ({ stat, i }))
        .sort((a, b) => keepPriority(a.stat, family) - keepPriority(b.stat, family) || a.i - b.i)
        .slice(0, cap)
        .map((x) => x.stat);

    const resistShare = maxResists > 2 ? 0.5 : 1;
    item.implicit = fixed;
    item.rolls = kept
        .sort((a, b) => orderOf(a) - orderOf(b))
        .map((stat) => {
            const part = PRIMARIES.includes(stat)
                ? share
                : stat === 'discovery'
                  ? share
                  : stat.startsWith('resist.')
                    ? resistShare
                    : 1;
            // La tirada se elige por familia (tipo, elementos, línea), no por id: así una
            // pieza de más nivel de la misma familia nunca sale por debajo de la anterior.
            const key = `${item.kind ?? item.slot}:${elements.join('+')}:${family ?? ''}:${stat}`;
            const r = lineRange(stat, item.level, factor * part, hash01(`${key}:a`), hash01(`${key}:b`));
            return { stat, op: 'flat', min: r.min, max: r.max };
        })
        .concat(fixedRolls);
    if (item.weapon) Object.assign(item.weapon, weaponDamage(item));
}

// ─── 1. Cobertura: anillo, amuleto, cinturón y capa en cada ruta elemental ───────
const ACCESSORIES = [
    { slot: 'ring', kind: 'ring', icon: 'ring', noun: 'Anillo', en: 'Ring', weight: 1 },
    { slot: 'amulet', kind: 'amulet', icon: 'amulet', noun: 'Amuleto', en: 'Amulet', weight: 1 },
    { slot: 'waist', kind: 'belt', icon: 'belt', noun: 'Cinturón', en: 'Belt', weight: 2 },
    { slot: 'back', kind: 'cape', icon: 'cape', noun: 'Capa', en: 'Cape', weight: 3 },
];
const added = [];
for (const setId of Object.keys(setsDoc.sets).filter((s) => /^route_\d\d_/.test(s))) {
    const head = items[`${setId}_head`];
    if (!head) throw new Error(`${setId}: falta la pieza de cabeza que da el patrón`);
    const tail = head.name.replace(/^\S+/, '');
    const enHead = i18nDoc[head.name];
    if (!enHead) throw new Error(`${setId}: la cabeza no tiene inglés en en.content.json`);
    for (const a of ACCESSORIES) {
        i18nDoc[`${a.noun}${tail}`] = enHead.replace(/^\S+/, a.en);
        const id = `${setId}_${a.slot}`;
        if (!items[id]) added.push(id);
        items[id] = {
            weight: a.weight,
            name: `${a.noun}${tail}`,
            description: head.description,
            icon: a.icon,
            kind: a.kind,
            category: 'armor',
            slot: a.slot,
            rarity: head.rarity,
            level: head.level,
            value: head.value,
            maxStack: 1,
            setId,
            implicit: [],
            rolls: [],
            dropWeight: head.dropWeight,
        };
    }
}
// Se venden donde se venden las demás piezas de su ruta.
for (const m of Object.values(merchantsDoc.merchants)) {
    const ids = new Set(m.stock.map((s) => s.itemId));
    const stock = [];
    for (const s of m.stock) {
        stock.push(s);
        const feet = /^(route_\d\d_\w+)_feet$/.exec(s.itemId);
        if (!feet) continue;
        for (const a of ACCESSORIES) {
            const id = `${feet[1]}_${a.slot}`;
            if (!ids.has(id)) stock.push({ itemId: id, quantity: s.quantity });
        }
    }
    m.stock = stock;
}

// Armas que faltaban para que cada elemento tenga una por franja (nombres provisionales).
const COVERAGE_WEAPONS = [
    {
        id: 'cold_mist_staff',
        from: 'corindon_staff',
        level: 50,
        rarity: 'rare',
        value: 325,
        name: 'Bastón de niebla fría',
        en: 'Cold-mist staff',
        description: 'Suda escarcha aunque haga calor.',
        enDescription: 'It sweats frost even on hot days.',
    },
    {
        id: 'guayacan_bow',
        from: 'darien_bow',
        level: 70,
        rarity: 'rare',
        value: 455,
        name: 'Arco de guayacán',
        en: 'Guayacan bow',
        description: 'Madera tan dura que hunde el hacha.',
        enDescription: 'Wood so hard it sinks the axe.',
    },
    {
        id: 'nazareno_bow',
        from: 'darien_bow',
        level: 90,
        rarity: 'epic',
        value: 640,
        name: 'Arco de nazareno',
        en: 'Purpleheart bow',
        description: 'Se vuelve morado al tensarlo.',
        enDescription: 'It turns purple when drawn.',
    },
];
for (const w of COVERAGE_WEAPONS) {
    const base = items[w.from];
    if (!base?.weapon) throw new Error(`${w.id}: falta el arma modelo ${w.from}`);
    if (!items[w.id]) added.push(w.id);
    const { setId: _set, ...rest } = structuredClone(base);
    const el = base.weapon.element;
    items[w.id] = {
        ...rest,
        name: w.name,
        description: w.description,
        rarity: w.rarity,
        level: w.level,
        value: w.value,
        implicit: [],
        rolls: [
            { stat: ELEMENT_PRIMARY[el], op: 'flat', min: 1, max: 2 },
            { stat: `damage.${el}`, op: 'flat', min: 1, max: 2 },
        ],
    };
    i18nDoc[w.name] = w.en;
    i18nDoc[w.description] = w.enDescription;
    const smith = merchantsDoc.merchants.smith;
    if (!smith.stock.some((st) => st.itemId === w.id)) smith.stock.push({ itemId: w.id, quantity: null });
}

// ─── 2. Reescritura de todas las piezas ─────────────────────────────────────────
let rebuilt = 0;
for (const [id, item] of Object.entries(items)) {
    if (!item.slot || item.slot === 'mount' || isLearning(item) || PATTERN.has(id)) continue;
    rebuild(item, id);
    rebuilt++;
}

// ─── 3. Crítico: nunca en todas las piezas de un conjunto ───────────────────────
const DROP_CRIT_FIRST = ['chest', 'back', 'feet', 'head', 'waist', 'offhand', 'hands', 'amulet', 'ring', 'weapon'];
const bySet = new Map();
for (const [id, item] of Object.entries(items)) {
    if (!item.setId || !item.slot || item.slot === 'mount') continue;
    bySet.set(item.setId, [...(bySet.get(item.setId) ?? []), [id, item]]);
}
for (const pieces of bySet.values()) {
    if (pieces.length < 2 || !pieces.every(([, i]) => i.rolls.some((r) => r.stat === 'critChance'))) continue;
    const [, victim] = [...pieces].sort(
        ([a, x], [b, y]) => DROP_CRIT_FIRST.indexOf(x.slot) - DROP_CRIT_FIRST.indexOf(y.slot) || a.localeCompare(b),
    )[0];
    victim.rolls = victim.rolls.filter((r) => r.stat !== 'critChance');
}

// ─── 4. Auditoría del contrato ──────────────────────────────────────────────────
const problems = [];
for (const [id, item] of Object.entries(items)) {
    if (!item.slot || item.slot === 'mount' || isLearning(item) || PATTERN.has(id)) continue;
    const stats = linesOf(item).map((l) => l.stat);
    const dup = stats.filter((s, i) => stats.indexOf(s) !== i);
    if (dup.length) problems.push(`${id}: repite ${dup.join(', ')}`);
    if (item.weapon && !stats.includes(ELEMENT_PRIMARY[item.weapon.element]))
        problems.push(`${id}: su primaria no es la de su elemento`);
    if (stats.includes('power') && PRIMARIES.some((p) => stats.includes(p)))
        problems.push(`${id}: Potencia junto a primarias`);
}
if (problems.length) throw new Error(`EQ-07 fuera de contrato:\n${problems.slice(0, 30).join('\n')}`);

console.log(
    `EQ-07: ${rebuilt} piezas reescritas; ${added.length} piezas nuevas (accesorios de ruta y armas de cobertura); contrato limpio.`,
);
if (WRITE) {
    writeFileSync(file('data/rpg/items.json'), `${JSON.stringify(itemsDoc, null, 2)}\n`);
    writeFileSync(file('data/rpg/merchants.json'), `${JSON.stringify(merchantsDoc, null, 2)}\n`);
    writeFileSync(file('data/i18n/en.content.json'), `${JSON.stringify(i18nDoc, null, 2)}\n`);
}
