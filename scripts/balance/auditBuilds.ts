// JEQ-07: Auditoría integral de balance — Fase 3, 4, 5, 6
// Simula builds completas usando las fórmulas reales del juego.
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import {
    EQUIP_SLOTS,
    ELEMENTS,
    type Element,
    type EquipSlot,
    type ItemDef,
    type ItemSetDef,
    type PrimaryStat,
    type StatId,
} from '../../src/rpg/contracts';
import { slotsFor, kindOf } from '../../src/rpg/items';
import { xpToNext } from '../../src/rpg/progression';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import {
    resolveHit,
    previewHit,
    effectiveResist,
    type DamageRules,
    type HitSpec,
    type AttackerProfile,
} from '../../src/sim/damage';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT = 'work/junie-jeq07';
mkdirSync(OUT, { recursive: true });

const data = loadGameData();
const items = data.rpg.items;
const sets = data.rpg.sets;
const classes = data.rpg.classes;
const merchants = data.rpg.merchants;

// ============================================================
// Helpers
// ============================================================

function stableSeed(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    return h >>> 0;
}

function pointPlan(main: PrimaryStat | null, build: string): PrimaryStat[] {
    const m = main ?? 'strength';
    if (build === 'endurance') return ['vitality'];
    if (build === 'spirit') return ['spirit'];
    if (build === 'precision') return [m];
    if (build === 'support') return ['spirit', 'vitality'];
    if (build === 'learning') return ['spirit'];
    // Default: offense
    return [m, 'vitality'];
}

function createCharacter(data: any, classId: string, level: number, build: string, rng: Rng) {
    const ch = Character.create(data.rpg, classId, `QA-${build}`, rng);
    // Unequip starting gear
    for (const slot of EQUIP_SLOTS) {
        if (ch.equipment.get(slot)) ch.unequip(slot);
    }
    // Level up
    let xp = 0;
    for (let l = 1; l < level; l++) xp += xpToNext(data.rpg.progression, l);
    ch.gainXp(xp);
    // Distribute stat points
    const cls = data.rpg.classes[classId];
    const plan = pointPlan(cls?.mainStat ?? 'strength', build);
    for (let round = 0; ch.unspentStatPoints > 0 && round < 64; round++) {
        const before = ch.unspentStatPoints;
        for (const stat of plan) ch.spendStatPoints(stat, Math.ceil(ch.unspentStatPoints / plan.length));
        if (ch.unspentStatPoints === before) break;
    }
    return ch;
}

// ============================================================
// Phase 3: Build simulation
// ============================================================

interface BuildMetrics {
    classId: string;
    level: number;
    build: string;
    setId: string | null;
    maxHealth: number;
    maxResource: number;
    healthRegen: number;
    resourceRegen: number;
    strength: number;
    agility: number;
    intellect: number;
    vitality: number;
    spirit: number;
    flow: number;
    calm: number;
    will: number;
    power: number;
    critChance: number;
    critBonus: number;
    damageByElement: Record<Element, number>;
    resistByElement: Record<Element, number>;
    effectiveResistByElement: Record<Element, number>;
    dpsSustainable: Record<Element, number>;
    dpsBurst: Record<Element, number>;
    healPower: number;
    cooldownReduction: number;
    moveSpeed: number;
    carryCapacity: number;
    experienceGain: number;
    setBonusesActive: number;
    totalResist: number;
    totalDamage: number;
}

function computeBuildMetrics(session: GameSession, rules: DamageRules, build: string): BuildMetrics {
    const ch = session.character;
    const stats = ch.stats;
    const m = (s: StatId) => stats.get(s);

    const byElement = (): Record<Element, number> =>
        Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<Element, number>;
    const damageByElement = byElement();
    const resistByElement = byElement();
    const effectiveResistByElement = byElement();
    const dpsSustainable = byElement();
    const dpsBurst = byElement();

    for (const el of ELEMENTS) {
        const dmgStat = `damage.${el}` as StatId;
        damageByElement[el] = m(dmgStat);
        resistByElement[el] = m(`resist.${el}` as StatId);
        effectiveResistByElement[el] = effectiveResist(stats, el, rules);

        // DPS: use average weapon damage + elemental stat scaling
        // Simplified: base DPS from equipped weapon
        const weapon = ch.equipment.get('weapon') || ch.equipment.get('offhand');
        const weaponDef = weapon ? items[weapon.itemId] : null;
        if (weaponDef?.weapon) {
            const avgBase = (weaponDef.weapon.min + weaponDef.weapon.max) / 2;
            const elStat = rules.elementStat[el];
            const scaling = 0.1; // typical spell scaling
            const base = Math.floor(avgBase + scaling * m(elStat));
            const withPower = Math.floor(base * (1 + m('power') / 100));
            const withFlatDmg = withPower + m(dmgStat);
            const afterResist = Math.max(1, Math.floor(withFlatDmg * (1 - effectiveResistByElement[el] / 100)));
            const speed = weaponDef.weapon.speed || 1.0;
            dpsSustainable[el] = Math.round((afterResist / speed) * 100) / 100;
            dpsBurst[el] = afterResist;
        } else {
            dpsSustainable[el] = m(dmgStat);
            dpsBurst[el] = m(dmgStat);
        }
    }

    // Count active set bonuses
    let setBonusesActive = 0;
    const equippedSetIds = new Set<string>();
    for (const slot of EQUIP_SLOTS) {
        const inst = ch.equipment.get(slot);
        if (inst) {
            const def = items[inst.itemId];
            if (def?.setId) equippedSetIds.add(def.setId);
        }
    }
    for (const setId of equippedSetIds) {
        const setDef = sets[setId];
        if (setDef) {
            const count = EQUIP_SLOTS.filter((s) => {
                const inst = ch.equipment.get(s);
                return inst && items[inst.itemId]?.setId === setId;
            }).length;
            setBonusesActive += (setDef.bonuses || []).filter((b) => b.pieces <= count).length;
        }
    }

    return {
        classId: ch.classDef?.id ?? 'unknown',
        level: ch.level,
        build,
        setId: null, // will be set by caller
        maxHealth: m('maxHealth'),
        maxResource: m('maxResource'),
        healthRegen: m('healthRegen'),
        resourceRegen: m('resourceRegen'),
        strength: m('strength'),
        agility: m('agility'),
        intellect: m('intellect'),
        vitality: m('vitality'),
        spirit: m('spirit'),
        flow: m('flow'),
        calm: m('calm'),
        will: m('will'),
        power: m('power'),
        critChance: m('critChance'),
        critBonus: m('critBonus'),
        damageByElement,
        resistByElement,
        effectiveResistByElement,
        dpsSustainable,
        dpsBurst,
        healPower: m('healingPower'),
        cooldownReduction: m('cooldownReduction'),
        moveSpeed: m('moveSpeed'),
        carryCapacity: m('carryCapacity'),
        experienceGain: m('experienceGain'),
        setBonusesActive,
        totalResist: ELEMENTS.reduce((s, el) => s + resistByElement[el], 0),
        totalDamage: ELEMENTS.reduce((s, el) => s + damageByElement[el], 0),
    };
}

// ============================================================
// Equip a character with a specific set
// ============================================================

function equipSet(ch: Character, setId: string, rng: Rng) {
    // Find items for this set
    const setItems = Object.entries(items)
        .filter(([_, def]) => def.setId === setId)
        .sort((a, b) => (a[1].level || 0) - (b[1].level || 0));

    if (setItems.length === 0) return;

    // Unequip current gear
    for (const slot of EQUIP_SLOTS) {
        if (ch.equipment.get(slot)) ch.unequip(slot);
    }

    // Equip set items
    const equippedSlots = new Set<EquipSlot>();
    for (const [, def] of setItems) {
        const availableSlots = slotsFor(def).filter((s) => !equippedSlots.has(s));
        if (availableSlots.length === 0) continue;
        const slot = availableSlots[0]!;
        ch.give(def.id);
        const inst = ch.inventory.slots.find(
            (x) => x?.itemId === def.id && !Object.values(ch.equipment.slots).some((e) => e?.uid === x.uid),
        );
        if (inst && ch.equip(inst.uid, slot).ok) {
            equippedSlots.add(slot);
        }
    }
}

// ============================================================
// Run the audit
// ============================================================

const rules: DamageRules = {
    elementStat: data.rpg.rules.elementStat,
    resistCap: data.rpg.progression.resistCap,
};

// Levels to test
const testLevels = [15, 30, 40, 60, 80, 100, 120, 140, 160, 180, 200];

// Build types to test
const buildTypes = ['none', 'mono', 'bi', 'tri', 'endurance', 'spirit', 'precision', 'support', 'learning'];

const results: BuildMetrics[] = [];

console.log('=== JEQ-07: Simulación de builds completas ===\n');

for (const classId of Object.keys(classes)) {
    const cls = classes[classId]!;
    const mainStat = cls.mainStat ?? 'strength';

    for (const level of testLevels) {
        // 1. No equipment
        {
            const rng = new Rng(stableSeed(`${classId}-${level}-none`));
            const ch = createCharacter(data, classId, level, 'none', rng);
            const session = new GameSession(data.rpg, ch, rng);
            const metrics = computeBuildMetrics(session, rules, 'none');
            results.push(metrics);
        }

        // 2. Mono-elemental sets (find the best one for this level)
        for (const el of ELEMENTS) {
            // Find mono-set for this element and level band
            const monoSets = Object.entries(sets)
                .filter(([id]) => id.startsWith('route_') && !id.includes('spec') && !id.includes('learning'))
                .filter(([setId, s]) => {
                    // Check if this set's element matches
                    const setItems = Object.values(items).filter((d) => d.setId === setId);
                    return setItems.some(
                        (d) => d.weapon?.element === el || (d.implicit || []).some((m) => m.stat === `damage.${el}`),
                    );
                })
                .filter(([_, s]) => {
                    // Check level range
                    const setItems = Object.values(items).filter((d) => d.setId === s.id);
                    const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                    return Math.abs(avgLevel - level) <= 15;
                });

            for (const [setId] of monoSets.slice(0, 1)) {
                const rng = new Rng(stableSeed(`${classId}-${level}-mono-${el}`));
                const ch = createCharacter(data, classId, level, 'mono', rng);
                equipSet(ch, setId, rng);
                ch.restore();
                const session = new GameSession(data.rpg, ch, rng);
                const metrics = computeBuildMetrics(session, rules, `mono-${el}`);
                metrics.setId = setId;
                results.push(metrics);
            }
        }

        // 3. Specialized sets
        for (const specType of ['endurance', 'spirit', 'precision', 'support']) {
            const specSets = Object.entries(sets)
                .filter(([id]) => id.startsWith('spec_'))
                .filter(([id]) => id.includes(specType))
                .filter(([_, s]) => {
                    const setItems = Object.values(items).filter((d) => d.setId === s.id);
                    const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                    return Math.abs(avgLevel - level) <= 15;
                });

            for (const [setId] of specSets.slice(0, 1)) {
                const rng = new Rng(stableSeed(`${classId}-${level}-${specType}`));
                const ch = createCharacter(data, classId, level, specType, rng);
                equipSet(ch, setId, rng);
                ch.restore();
                const session = new GameSession(data.rpg, ch, rng);
                const metrics = computeBuildMetrics(session, rules, specType);
                metrics.setId = setId;
                results.push(metrics);
            }
        }

        // 4. Learning sets
        {
            const learnSets = Object.entries(sets)
                .filter(([id]) => id.startsWith('learning_'))
                .filter(([_, s]) => {
                    const setItems = Object.values(items).filter((d) => d.setId === s.id);
                    const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                    return Math.abs(avgLevel - level) <= 15;
                });

            for (const [setId] of learnSets.slice(0, 1)) {
                const rng = new Rng(stableSeed(`${classId}-${level}-learning`));
                const ch = createCharacter(data, classId, level, 'learning', rng);
                equipSet(ch, setId, rng);
                ch.restore();
                const session = new GameSession(data.rpg, ch, rng);
                const metrics = computeBuildMetrics(session, rules, 'learning');
                metrics.setId = setId;
                results.push(metrics);
            }
        }

        // 5. Bi-elemental sets (if available for this level)
        {
            const biSets = Object.entries(sets)
                .filter(([id]) => id.startsWith('bi_'))
                .filter(([_, s]) => {
                    const setItems = Object.values(items).filter((d) => d.setId === s.id);
                    const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                    return Math.abs(avgLevel - level) <= 15;
                });

            for (const [setId] of biSets.slice(0, 1)) {
                const rng = new Rng(stableSeed(`${classId}-${level}-bi`));
                const ch = createCharacter(data, classId, level, 'bi', rng);
                equipSet(ch, setId, rng);
                ch.restore();
                const session = new GameSession(data.rpg, ch, rng);
                const metrics = computeBuildMetrics(session, rules, 'bi');
                metrics.setId = setId;
                results.push(metrics);
            }
        }

        // 6. Tri-elemental sets (if available for this level)
        {
            const triSets = Object.entries(sets)
                .filter(([id]) => id.startsWith('tri_'))
                .filter(([_, s]) => {
                    const setItems = Object.values(items).filter((d) => d.setId === s.id);
                    const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                    return Math.abs(avgLevel - level) <= 15;
                });

            for (const [setId] of triSets.slice(0, 1)) {
                const rng = new Rng(stableSeed(`${classId}-${level}-tri`));
                const ch = createCharacter(data, classId, level, 'tri', rng);
                equipSet(ch, setId, rng);
                ch.restore();
                const session = new GameSession(data.rpg, ch, rng);
                const metrics = computeBuildMetrics(session, rules, 'tri');
                metrics.setId = setId;
                results.push(metrics);
            }
        }
    }
}

// ============================================================
// Write results
// ============================================================

writeFileSync(join(OUT, 'builds.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length} builds simuladas, escritas en ${OUT}/builds.json`);

// ============================================================
// Summary statistics
// ============================================================

console.log('\n=== RESUMEN POR NIVEL Y BUILD ===\n');

for (const level of testLevels) {
    const levelResults = results.filter((r) => r.level === level);
    console.log(`--- Nivel ${level} ---`);

    // Group by build type
    const groups: Record<string, BuildMetrics[]> = {};
    for (const r of levelResults) {
        const key = r.build.startsWith('mono-') ? 'mono' : r.build;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    }

    for (const build of ['none', 'mono', 'endurance', 'spirit', 'precision', 'support', 'learning', 'bi', 'tri']) {
        const buildResults = groups[build];
        if (!buildResults || buildResults.length === 0) continue;

        // Show one representative per class
        const shown = new Set<string>();
        for (const r of buildResults) {
            if (shown.has(r.classId)) continue;
            shown.add(r.classId);
            const maxDmg = Math.max(...ELEMENTS.map((el) => r.damageByElement[el]));
            const maxResist = Math.max(...ELEMENTS.map((el) => r.resistByElement[el]));
            console.log(
                `  ${r.build.padEnd(15)} ${r.classId.padEnd(20)} HP:${r.maxHealth.toString().padStart(5)}  R:${maxResist.toString().padStart(3)}%  D:${maxDmg.toString().padStart(3)}  Crit:${(r.critChance * 100).toFixed(1)}%  XP:${(r.experienceGain * 100).toFixed(0)}%`,
            );
        }
    }
    console.log();
}

// ============================================================
// Phase 4: Resistance inflation analysis
// ============================================================

console.log('\n=== INFLACIÓN DE RESISTENCIAS ===\n');

for (const level of [10, 20, 30, 50, 100, 150, 200]) {
    const levelResults = results.filter((r) => r.level === level && r.build !== 'none');
    if (levelResults.length === 0) continue;

    const avgResist = levelResults.reduce((s, r) => s + r.totalResist, 0) / levelResults.length;
    const maxResist = Math.max(...levelResults.map((r) => r.totalResist));
    console.log(
        `Nivel ${level.toString().padStart(3)}: resistencia total promedio=${avgResist.toFixed(1)}, max=${maxResist}`,
    );
}

console.log('\nAuditoría completada.');
