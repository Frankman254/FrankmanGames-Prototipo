#!/usr/bin/env node
// Contrato de balance 1–100 aprobado por el creador (2026-11-15).
// Reescribe de forma determinista todas las piezas equipables: daño de arma
// base pequeño (después escala por estadísticas), tiradas redondas por nivel y
// líneas caras acotadas. No copia tablas externas; usa curvas propias.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const path = (name) => new URL(name, ROOT);
const itemsFile = path('data/rpg/items.json');
const setsFile = path('data/rpg/sets.json');
const itemsDoc = JSON.parse(readFileSync(itemsFile, 'utf8'));
const setsDoc = JSON.parse(readFileSync(setsFile, 'utf8'));
const WRITE = process.argv.includes('--write');

const ELEMENT_PRIMARY = {
    earth: 'strength',
    fire: 'intellect',
    air: 'agility',
    water: 'flow',
    frost: 'calm',
    lightning: 'will',
};
const SLOT_PRIMARY = {
    weapon: 'strength',
    offhand: 'vitality',
    head: 'calm',
    chest: 'vitality',
    hands: 'agility',
    feet: 'agility',
    back: 'will',
    waist: 'strength',
    ring: 'intellect',
    ring1: 'intellect',
    ring2: 'intellect',
    amulet: 'flow',
};
const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const STAT_ORDER = [
    'strength',
    'intellect',
    'agility',
    'flow',
    'calm',
    'will',
    'vitality',
    'maxHealth',
    'spirit',
    'maxResource',
    'power',
    'weaponPower',
    'critChance',
    'experienceGain',
    'critBonus',
    'healingPower',
    'resourceRegen',
    'healthRegen',
    'tackle',
    'escape',
    'moveSpeed',
    'slowResist',
    'castStability',
    'discovery',
    'carryCapacity',
    'pickupRadius',
];
const statOrder = (stat) =>
    stat.startsWith('damage.') ? 30 : stat.startsWith('resist.') ? 31 : STAT_ORDER.indexOf(stat) + 1 || 99;

function rangeFor(stat, level) {
    if (['strength', 'agility', 'intellect', 'calm', 'flow', 'will'].includes(stat)) {
        // Doce huecos optimizados no deben duplicar por sí solos la primaria base.
        const max = round5(level * 0.64);
        return [Math.max(1, max - round5(15 + level * 0.1)), max];
    }
    if (stat === 'vitality') return [round5(level * 0.3), round5(level * 0.5)];
    if (stat === 'spirit') return [round5(level * 0.22), round5(level * 0.32)];
    if (stat === 'maxHealth') return [round5(level * 0.55), round5(level * 1.05)];
    if (stat === 'maxResource') return [round5(level * 0.25), round5(level * 0.5)];
    if (stat === 'power' || stat === 'weaponPower') return [round5(level * 0.11), round5(level * 0.21)];
    if (stat.startsWith('damage.')) {
        const max = Math.max(1, Math.round(30 * (level / 200) ** 2));
        return [Math.max(1, Math.round(max * 0.5)), max];
    }
    if (stat.startsWith('resist.')) {
        const max = clamp(Math.round(level / 10), 2, 10);
        return [Math.max(1, Math.round(max * 0.6)), max];
    }
    if (stat === 'critChance') return level < 40 ? [0.01, 0.02] : level < 80 ? [0.01, 0.03] : [0.02, 0.04];
    if (stat === 'critBonus' || stat === 'cooldownReduction') return level < 60 ? [0.01, 0.02] : [0.02, 0.04];
    if (stat === 'tackle' || stat === 'escape') {
        const max = clamp(Math.round(level / 20), 2, 5);
        return [Math.max(1, max - 3), max];
    }
    if (stat === 'moveSpeed') return [Number((0.1 + level / 1000).toFixed(2)), Number((0.2 + level / 350).toFixed(2))];
    if (stat === 'carryCapacity') return [round5(level * 0.5), round5(level)];
    if (stat === 'healthRegen' || stat === 'resourceRegen') return [1, clamp(Math.round(level / 30), 1, 4)];
    if (stat === 'healingPower' || stat === 'slowResist' || stat === 'castStability')
        return [Math.max(1, Math.round(level * 0.04)), Math.max(2, Math.round(level * 0.08))];
    if (stat === 'discovery') return [Math.max(1, Math.round(level * 0.05)), Math.max(2, Math.round(level * 0.1))];
    if (stat === 'pickupRadius') return [0.2, Number((0.3 + level / 300).toFixed(1))];
    return [1, Math.max(2, Math.round(level / 10))];
}

function identityElement(item) {
    if (item.weapon?.element) return item.weapon.element;
    const stat = [...(item.rolls ?? []), ...(item.implicit ?? [])].find((line) =>
        /^(damage|resist)\./.test(line.stat),
    )?.stat;
    return stat?.split('.')[1] ?? 'earth';
}

function targetLineCount(item) {
    const band = clamp(Math.ceil(item.level / 20), 1, 5);
    return (item.category === 'weapon' ? [3, 4, 5, 6, 7] : [2, 3, 4, 5, 6])[band - 1];
}

function cappedImplicit(line, level) {
    const copy = { ...line };
    if (['carryCapacity', 'pickupRadius', 'slowResist', 'moveSpeed'].includes(copy.stat)) return copy;
    // Los rasgos fijos conservan su operación (por ejemplo, velocidad porcentual),
    // pero no pueden saltarse los mismos topes que una tirada.
    if (copy.op !== 'percent') {
        const [, max] = rangeFor(copy.stat, level);
        copy.value = Math.min(copy.value, max);
    } else if (copy.stat === 'power' || copy.stat === 'weaponPower')
        copy.value = Math.min(copy.value, rangeFor(copy.stat, level)[1]);
    return copy;
}

function normalizeItem(item) {
    if (!item.slot) return;
    // Las rutas 1–200 tienen su propio generador y contrato. En especial, los
    // sets de aprendizaje deben seguir sin estadísticas de combate.
    if (/^(route_|learning_)/.test(item.setId ?? '')) return;
    // Una montura es una identidad funcional completa, no una pieza con afijos:
    // su velocidad, altura y capacidad deben ser fijas y comparables.
    if (item.slot === 'mount') return;
    const element = identityElement(item);
    const primary =
        item.category === 'weapon' ? ELEMENT_PRIMARY[element] : (SLOT_PRIMARY[item.slot] ?? ELEMENT_PRIMARY[element]);
    const desired = [];
    const add = (stat) => {
        if (stat && !desired.includes(stat)) desired.push(stat);
    };

    // Conserva los rasgos implícitos como valores fijos y con su operación. Si
    // había un duplicado accidental, una sola línea acotada representa el rasgo.
    const fixed = [];
    for (const line of item.implicit ?? []) {
        if (!fixed.some((m) => m.stat === line.stat && m.op === line.op)) fixed.push(cappedImplicit(line, item.level));
    }
    for (const line of item.rolls ?? []) if (!fixed.some((m) => m.stat === line.stat)) add(line.stat);
    add(primary);
    if (item.category === 'weapon') add(`damage.${element}`);
    if (item.level >= 21) add('maxHealth');
    if (item.level >= 41) add(item.category === 'weapon' ? 'power' : 'spirit');
    if (item.level >= 61) add(item.category === 'weapon' ? 'spirit' : `resist.${element}`);
    if (item.level >= 81) add(item.slot === 'feet' || item.slot === 'back' ? 'escape' : 'tackle');
    const fallbacks = [
        'vitality',
        'spirit',
        `resist.${element}`,
        item.slot === 'feet' ? 'escape' : 'tackle',
        'power',
        'maxResource',
        'discovery',
    ];
    for (const stat of fallbacks) add(stat);

    const target = Math.max(1, targetLineCount(item) - fixed.length);
    const chosen = desired
        .filter((stat) => !fixed.some((m) => m.stat === stat))
        .slice(0, target)
        .sort((a, b) => statOrder(a) - statOrder(b) || a.localeCompare(b));
    item.implicit = fixed;
    item.rolls = chosen.map((stat) => {
        const [min, max] = rangeFor(stat, item.level);
        return { stat, op: 'flat', min, max };
    });

    if (item.weapon) {
        const speedFactor = clamp(1.2 / item.weapon.speed, 0.8, 1.25);
        item.weapon.min = Math.max(1, Math.round((item.level / 6) * speedFactor));
        item.weapon.max = Math.max(item.weapon.min + 1, Math.round((item.level / 4 + 1.5) * speedFactor));
    }
}

for (const item of Object.values(itemsDoc.items)) normalizeItem(item);

// Pieza patrón indicada por el creador: sirve de prueba de contrato para todas.
const staff = itemsDoc.items.tulivieja_staff;
staff.implicit = [];
staff.rolls = [
    { stat: 'intellect', op: 'flat', min: 46, max: 70 },
    { stat: 'power', op: 'flat', min: 11, max: 20 },
    { stat: 'critChance', op: 'flat', min: 0.02, max: 0.04 },
    { stat: 'maxHealth', op: 'flat', min: 51, max: 100 },
    { stat: 'spirit', op: 'flat', min: 21, max: 30 },
    { stat: 'tackle', op: 'flat', min: 2, max: 5 },
    { stat: 'damage.lightning', op: 'flat', min: 3, max: 7 },
];
staff.weapon.min = 16;
staff.weapon.max = 25;

// Los bonos de conjunto son fijos y acumulativos: cada línea queda por debajo
// de una pieza completa para que cinco piezas no alcancen topes por sí solas.
for (const set of Object.values(setsDoc.sets))
    for (const bonus of set.bonuses)
        for (const mod of bonus.modifiers) {
            if (mod.stat.startsWith('damage.')) mod.value = Math.min(mod.value, 7);
            else if (mod.stat.startsWith('resist.')) mod.value = Math.min(mod.value, 10);
            else if (mod.stat === 'critChance' || mod.stat === 'cooldownReduction')
                mod.value = Math.min(mod.value, 0.04);
            else if (mod.stat === 'critBonus') mod.value = Math.min(mod.value, 0.2);
            else if (mod.stat === 'power') mod.value = Math.min(mod.value, 20);
            else if (mod.stat === 'maxHealth' && mod.op === 'percent') mod.value = Math.min(mod.value, 10);
            else if (
                ['strength', 'agility', 'intellect', 'calm', 'flow', 'will', 'vitality', 'spirit'].includes(mod.stat)
            )
                mod.value = Math.min(mod.value, 30);
        }

const equipment = Object.values(itemsDoc.items).filter((item) => item.slot);
const rebalanced = equipment.filter((item) => item.slot !== 'mount');
const anomalies = [];
for (const item of equipment) {
    if (item.weapon && (item.weapon.min > item.level / 4 + 8 || item.weapon.max > item.level / 3 + 12))
        anomalies.push(`${item.name}: daño base ${item.weapon.min}-${item.weapon.max}`);
    for (const roll of item.rolls) {
        if (roll.stat.startsWith('resist.') && roll.max > 10) anomalies.push(`${item.name}: ${roll.stat} ${roll.max}`);
        if (roll.stat === 'critChance' && roll.max > 0.04) anomalies.push(`${item.name}: crítico ${roll.max}`);
        if (roll.stat.startsWith('damage.') && roll.max > 30) anomalies.push(`${item.name}: ${roll.stat} ${roll.max}`);
    }
}
if (anomalies.length) throw new Error(`Fuera de presupuesto:\n${anomalies.join('\n')}`);

console.log(
    `Equipo auditado: ${equipment.length} piezas; recalculadas: ${rebalanced.length}; Bastón de la quebrada ${staff.weapon.min}-${staff.weapon.max}; anomalías: 0`,
);
if (WRITE) {
    writeFileSync(itemsFile, `${JSON.stringify(itemsDoc, null, 2)}\n`);
    writeFileSync(setsFile, `${JSON.stringify(setsDoc, null, 2)}\n`);
}
