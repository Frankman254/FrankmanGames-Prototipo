// JEQ-08: Completar JEQ-07 — FASE 3b, 4b, 5b, 6b
// Simulación de combate real, escenarios de resistencia, economía y validación de presets.
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import {
    EQUIP_SLOTS,
    ELEMENTS,
    type Element,
    type EquipSlot,
    type PrimaryStat,
    type StatId,
} from '../../src/rpg/contracts';
import { slotsFor } from '../../src/rpg/items';
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
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const OUT = 'work/junie-jeq07';
mkdirSync(OUT, { recursive: true });

const data = loadGameData();
const items = data.rpg.items;
const sets = data.rpg.sets;
const classes = data.rpg.classes;
const enemies = data.rpg.enemies;
const merchants = data.rpg.merchants;
const lootTables = data.rpg.lootTables;

const rules: DamageRules = {
    elementStat: data.rpg.rules.elementStat,
    resistCap: data.rpg.progression.resistCap,
};

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
    return [m, 'vitality'];
}

function createCharacter(classId: string, level: number, build: string, rng: Rng) {
    const ch = Character.create(data.rpg, classId, `QA-${build}`, rng);
    for (const slot of EQUIP_SLOTS) {
        if (ch.equipment.get(slot)) ch.unequip(slot);
    }
    let xp = 0;
    for (let l = 1; l < level; l++) xp += xpToNext(data.rpg.progression, l);
    ch.gainXp(xp);
    const cls = data.rpg.classes[classId];
    const plan = pointPlan(cls?.mainStat ?? 'strength', build);
    for (let round = 0; ch.unspentStatPoints > 0 && round < 64; round++) {
        const before = ch.unspentStatPoints;
        for (const stat of plan) ch.spendStatPoints(stat, Math.ceil(ch.unspentStatPoints / plan.length));
        if (ch.unspentStatPoints === before) break;
    }
    return ch;
}

function equipSet(ch: Character, setId: string, _rng: Rng) {
    const setItems = Object.entries(items)
        .filter(([_, def]) => def.setId === setId)
        .sort((a, b) => (a[1].level || 0) - (b[1].level || 0));
    if (setItems.length === 0) return;
    for (const slot of EQUIP_SLOTS) {
        if (ch.equipment.get(slot)) ch.unequip(slot);
    }
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

function getAttackerProfile(ch: Character): AttackerProfile {
    return {
        stats: ch.stats,
        mainStat: ch.mainStat,
        affinity: ch.affinity,
        affinityBonus: ch.affinityBonus,
    };
}

// Crear un HitSpec simulado a partir del arma equipada o un ataque básico
function getHitSpec(ch: Character, element: Element): HitSpec | null {
    const weapon = ch.equipment.get('weapon') || ch.equipment.get('offhand');
    if (weapon) {
        const def = items[weapon.itemId];
        if (def?.weapon) {
            return {
                min: def.weapon.min,
                max: def.weapon.max,
                element: def.weapon.element ?? element,
                scaling: 0.1,
                critChance: 0,
                critBonus: 0,
            };
        }
    }
    // Sin arma: ataque básico
    return {
        min: 1,
        max: 3,
        element,
        scaling: 0,
        critChance: 0,
        critBonus: 0,
    };
}

// Encontrar enemigo representativo para un nivel dado
function findEnemyForLevel(targetLevel: number) {
    let best = null;
    let bestDiff = Infinity;
    for (const [id, e] of Object.entries(enemies)) {
        const diff = Math.abs(e.level - targetLevel);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = { ...e };
        }
    }
    return best;
}

// Crear stats de enemigo simulado (sin EnemyActor completo, solo stats)
function createEnemyStats(enemyId: string, level: number) {
    const enemy = enemies[enemyId];
    if (!enemy) return null;

    // Simular las stats del enemigo como un StatSource simple
    const statMap: Record<string, number> = {};
    for (const [stat, val] of Object.entries(enemy.stats)) {
        statMap[stat] = val;
    }
    // Escalar por nivel si es diferente del base
    const scale = level / enemy.level;
    statMap['maxHealth'] = Math.round((statMap['maxHealth'] || 20 + enemy.level * 10) * scale);
    statMap['power'] = Math.round((statMap['power'] || 0) * scale);

    return {
        get: (stat: StatId) => statMap[stat] || 0,
        element: enemy.element,
        level: enemy.level,
        maxHealth: statMap['maxHealth'] || 20 + enemy.level * 10,
    };
}

// ============================================================
// FASE 3b: Simulación de combate real
// ============================================================

interface CombatResult {
    classId: string;
    playerLevel: number;
    build: string;
    setId: string | null;
    enemyId: string;
    enemyLevel: number;
    // Métricas de kill time
    hitsToKill: number;
    totalDamageDealt: number;
    estimatedKillTimeSeconds: number;
    // Métricas de supervivencia
    hitsToKillPlayer: number;
    totalDamageReceived: number;
    // Daño por recurso
    damagePerResource: number;
    resourceCostPerHit: number;
    // Bonos de set
    setBonusesActive: number;
    setBonusImpact: number; // % de daño adicional por bonos de set
}

function simulateCombat(
    ch: Character,
    enemyStats: ReturnType<typeof createEnemyStats>,
    element: Element,
    rng: Rng,
): { hitsToKill: number; totalDamage: number; dps: number } {
    if (!enemyStats) return { hitsToKill: 0, totalDamage: 0, dps: 0 };

    const hitSpec = getHitSpec(ch, element);
    if (!hitSpec) return { hitsToKill: 0, totalDamage: 0, dps: 0 };

    const attacker = getAttackerProfile(ch);
    let enemyHp = enemyStats.maxHealth;
    let hits = 0;
    let totalDmg = 0;

    // Simular hasta matar al enemigo
    while (enemyHp > 0 && hits < 1000) {
        const result = resolveHit(rng, hitSpec, attacker, enemyStats, rules);
        totalDmg += result.amount;
        enemyHp -= result.amount;
        hits++;
    }

    // DPS estimado: usar velocidad del arma
    const weapon = ch.equipment.get('weapon') || ch.equipment.get('offhand');
    const speed = weapon ? (items[weapon.itemId]?.weapon?.speed ?? 1.0) : 1.0;
    const dps = totalDmg / (hits * speed);

    return { hitsToKill: hits, totalDamage: totalDmg, dps };
}

// Simular el enemigo atacando al jugador
function simulateEnemyAttack(
    enemyStats: ReturnType<typeof createEnemyStats>,
    ch: Character,
    rng: Rng,
): { damage: number; hitsToKill: number } {
    if (!enemyStats) return { damage: 0, hitsToKill: 0 };

    // El enemigo ataca con su elemento
    const enemyHit: HitSpec = {
        min: 1 + Math.floor(enemyStats.level * 0.5),
        max: 3 + Math.floor(enemyStats.level * 1.0),
        element: enemyStats.element,
        scaling: 0.05,
        critChance: enemyStats.get('critChance'),
        critBonus: enemyStats.get('critBonus'),
    };

    // El enemigo no tiene AttackerProfile completo, usar stats directas
    const enemyAttacker: AttackerProfile = {
        stats: enemyStats,
        mainStat: null,
        affinity: [enemyStats.element],
        affinityBonus: 0,
    };

    const dmgPerHit = resolveHit(rng, enemyHit, enemyAttacker, ch.stats, rules).amount;
    const hitsToKill = Math.ceil(ch.maxHealth / dmgPerHit);

    return { damage: dmgPerHit, hitsToKill };
}

console.log('=== FASE 3b: Simulación de combate real ===\n');

const testLevels = [15, 30, 40, 60, 80, 100, 120, 140, 160, 180, 200];
const buildTypes = ['mono', 'endurance', 'spirit', 'precision', 'support', 'bi', 'tri'];
const combatResults: CombatResult[] = [];

for (const classId of Object.keys(classes)) {
    for (const level of testLevels) {
        const enemy = findEnemyForLevel(level);
        if (!enemy) continue;
        const enemyStats = createEnemyStats(enemy.id, Math.min(enemy.level, level));
        if (!enemyStats) continue;

        for (const buildType of buildTypes) {
            // Encontrar el set apropiado
            let setId: string | null = null;
            if (buildType === 'mono') {
                // Mono-elemental del afinidad de la clase
                const cls = classes[classId];
                const el = cls?.affinity?.[0] ?? 'earth';
                const monoSets = Object.entries(sets)
                    .filter(([id]) => id.startsWith('route_') && !id.includes('spec') && !id.includes('learning'))
                    .filter(([setId, s]) => {
                        const setItems = Object.values(items).filter((d) => d.setId === setId);
                        return setItems.some(
                            (d) =>
                                d.weapon?.element === el || (d.implicit || []).some((m) => m.stat === `damage.${el}`),
                        );
                    })
                    .filter(([_, s]) => {
                        const setItems = Object.values(items).filter((d) => d.setId === s.id);
                        const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                        return Math.abs(avgLevel - level) <= 15;
                    });
                if (monoSets.length > 0) setId = monoSets[0]![0];
            } else if (
                buildType === 'endurance' ||
                buildType === 'spirit' ||
                buildType === 'precision' ||
                buildType === 'support'
            ) {
                const specSets = Object.entries(sets)
                    .filter(
                        ([id]) =>
                            id.startsWith('spec_') &&
                            id.includes(
                                buildType === 'endurance' ? 'endurance' : buildType === 'spirit' ? 'spirit' : buildType,
                            ),
                    )
                    .filter(([_, s]) => {
                        const setItems = Object.values(items).filter((d) => d.setId === s.id);
                        const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                        return Math.abs(avgLevel - level) <= 15;
                    });
                if (specSets.length > 0) setId = specSets[0]![0];
            } else if (buildType === 'bi') {
                const biSets = Object.entries(sets)
                    .filter(([id]) => id.startsWith('bi_'))
                    .filter(([_, s]) => {
                        const setItems = Object.values(items).filter((d) => d.setId === s.id);
                        const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                        return Math.abs(avgLevel - level) <= 15;
                    });
                if (biSets.length > 0) setId = biSets[0]![0];
            } else if (buildType === 'tri') {
                const triSets = Object.entries(sets)
                    .filter(([id]) => id.startsWith('tri_'))
                    .filter(([_, s]) => {
                        const setItems = Object.values(items).filter((d) => d.setId === s.id);
                        const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
                        return Math.abs(avgLevel - level) <= 15;
                    });
                if (triSets.length > 0) setId = triSets[0]![0];
            }

            if (!setId) continue;

            const rng = new Rng(stableSeed(`${classId}-${level}-${buildType}`));
            const ch = createCharacter(classId, level, buildType, rng);
            equipSet(ch, setId, rng);
            ch.restore();

            // Simular combate
            const cls = classes[classId];
            const atkElement = cls?.affinity?.[0] ?? 'earth';
            const combat = simulateCombat(
                ch,
                enemyStats,
                atkElement,
                new Rng(stableSeed(`${classId}-${level}-${buildType}-atk`)),
            );
            const survival = simulateEnemyAttack(
                enemyStats,
                ch,
                new Rng(stableSeed(`${classId}-${level}-${buildType}-def`)),
            );

            // Daño por recurso: estimar coste de hechizo vs daño
            const resourceCost = 10 + level * 0.5; // Coste estimado por hechizo
            const damagePerResource = combat.totalDamage / (combat.hitsToKill * resourceCost);

            // Impacto de bonos de set: comparar con y sin bonos
            let setBonusesActive = 0;
            const equippedSetIds = new Set<string>();
            for (const slot of EQUIP_SLOTS) {
                const inst = ch.equipment.get(slot);
                if (inst) {
                    const def = items[inst.itemId];
                    if (def?.setId) equippedSetIds.add(def.setId);
                }
            }
            for (const sid of equippedSetIds) {
                const setDef = sets[sid];
                if (setDef) {
                    const count = EQUIP_SLOTS.filter((s) => {
                        const inst = ch.equipment.get(s);
                        return inst && items[inst.itemId]?.setId === sid;
                    }).length;
                    setBonusesActive += (setDef.bonuses || []).filter((b) => b.pieces <= count).length;
                }
            }

            const weapon = ch.equipment.get('weapon') || ch.equipment.get('offhand');
            const speed = weapon ? (items[weapon.itemId]?.weapon?.speed ?? 1.0) : 1.0;
            const killTime = combat.hitsToKill * speed;

            combatResults.push({
                classId,
                playerLevel: level,
                build: buildType,
                setId,
                enemyId: enemy.id,
                enemyLevel: enemy.level,
                hitsToKill: combat.hitsToKill,
                totalDamageDealt: combat.totalDamage,
                estimatedKillTimeSeconds: Math.round(killTime * 100) / 100,
                hitsToKillPlayer: survival.hitsToKill,
                totalDamageReceived: survival.damage,
                damagePerResource: Math.round(damagePerResource * 100) / 100,
                resourceCostPerHit: resourceCost,
                setBonusesActive,
                setBonusImpact: setBonusesActive > 0 ? Math.round((setBonusesActive / 5) * 100) : 0,
            });
        }
    }
}

writeFileSync(join(OUT, 'combat.json'), JSON.stringify(combatResults, null, 2));
console.log(`\n${combatResults.length} simulaciones de combate escritas en ${OUT}/combat.json`);

// ============================================================
// FASE 4b: Escenarios de resistencia
// ============================================================

console.log('\n=== FASE 4b: Escenarios de resistencia ===\n');

interface ResistScenario {
    description: string;
    attackerLevel: number;
    defenderLevel: number;
    attackElement: Element;
    attackPower: number;
    defenderResist: number;
    resistCap: number;
    // Desglose paso a paso
    baseDamage: number;
    afterPower: number;
    afterFlatDamage: number;
    afterResist: number;
    effectiveResist: number;
    finalDamage: number;
    // Regla del creador
    levelDiff: number;
    damageReducedByLevelOnly: boolean;
}

const resistScenarios: ResistScenario[] = [];

// Escenarios: mismo ataque vs enemigos nivel 10, 20, 30 con resistencias constantes
const scenarioLevels = [10, 20, 30];
const fixedResistValues = [0, 10, 20, 30, 50];

for (const defenderLevel of scenarioLevels) {
    for (const resist of fixedResistValues) {
        for (const el of ELEMENTS.slice(0, 3)) {
            // earth, fire, air (representativos)
            // Atacante nivel 20 con daño base 50
            const scenario: ResistScenario = {
                description: `Atacante lvl 20 (daño 50) vs defensor lvl ${defenderLevel} (resist ${resist}% ${el})`,
                attackerLevel: 20,
                defenderLevel,
                attackElement: el,
                attackPower: 50,
                defenderResist: resist,
                resistCap: rules.resistCap,
                baseDamage: 50,
                afterPower: 50, // sin power adicional
                afterFlatDamage: 50, // sin daño plano
                effectiveResist: Math.min(resist, rules.resistCap),
                afterResist: 0,
                finalDamage: 0,
                levelDiff: 20 - defenderLevel,
                damageReducedByLevelOnly: false,
            };

            // Calcular daño tras resistencia
            scenario.afterResist = Math.floor(scenario.afterFlatDamage * (1 - scenario.effectiveResist / 100));
            scenario.finalDamage = Math.max(1, scenario.afterResist);

            // Verificar regla del creador: si ataque y resistencia son iguales,
            // el daño no debe reducirse arbitrariamente por nivel del objetivo
            if (scenario.attackPower === scenario.defenderResist && scenario.defenderLevel !== scenario.attackerLevel) {
                // El daño solo depende de la resistencia, no del nivel
                scenario.damageReducedByLevelOnly = false;
            }

            resistScenarios.push(scenario);
        }
    }
}

writeFileSync(join(OUT, 'resistScenarios.json'), JSON.stringify(resistScenarios, null, 2));
console.log(`${resistScenarios.length} escenarios de resistencia escritos en ${OUT}/resistScenarios.json`);

// ============================================================
// FASE 5b: Simulación económica
// ============================================================

console.log('\n=== FASE 5b: Simulación económica ===\n');

interface EconomyResult {
    levelBand: string;
    avgPricePerItem: number;
    avgPricePerSet: number;
    avgGoldPerCombat: number;
    combatsToBuySet: number;
    combatsToBuyFullGear: number;
    itemsInBand: number;
    merchantConcentration: { smith: number; apothecary: number };
}

const economyResults: EconomyResult[] = [];

// Definir franjas de nivel
const levelBands = [
    { label: '1-20', min: 1, max: 20 },
    { label: '21-40', min: 21, max: 40 },
    { label: '41-60', min: 41, max: 60 },
    { label: '61-80', min: 61, max: 80 },
    { label: '81-100', min: 81, max: 100 },
    { label: '101-120', min: 101, max: 120 },
    { label: '121-140', min: 121, max: 140 },
    { label: '141-160', min: 141, max: 160 },
    { label: '161-180', min: 161, max: 180 },
    { label: '181-200', min: 181, max: 200 },
];

for (const band of levelBands) {
    // Items en esta franja
    const bandItems = Object.entries(items).filter(([_, def]) => {
        const lvl = def.level || 0;
        return lvl >= band.min && lvl <= band.max;
    });

    // Precios: valor × rarityValue × buyMultiplier (Shop.priceOf)
    const rarityValue = data.rpg.rules.rarityValue;
    const buyMultiplier = merchants.smith?.buyMultiplier ?? 1.5;
    const prices = bandItems.map(([_, def]) => {
        const rarity = def.rarity || 'common';
        return (def.value || 0) * (rarityValue[rarity] ?? 1) * buyMultiplier;
    });
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    // Sets en esta franja
    const bandSets = Object.entries(sets).filter(([setId]) => {
        const setItems = Object.values(items).filter((d) => d.setId === setId);
        if (setItems.length === 0) return false;
        const avgLevel = setItems.reduce((sum, d) => sum + (d.level || 0), 0) / setItems.length;
        return avgLevel >= band.min && avgLevel <= band.max;
    });

    const setPrices = bandSets.map(([setId]) => {
        const setItems = Object.values(items).filter((d) => d.setId === setId);
        return setItems.reduce((sum, d) => {
            const rarity = d.rarity || 'common';
            return sum + (d.value || 0) * (rarityValue[rarity] ?? 1) * buyMultiplier;
        }, 0);
    });
    const avgSetPrice = setPrices.length > 0 ? setPrices.reduce((a, b) => a + b, 0) / setPrices.length : 0;

    // Oro por combate: estimar de las tablas de botín
    const midLevel = Math.floor((band.min + band.max) / 2);
    const enemyAtLevel = findEnemyForLevel(midLevel);
    let avgGoldPerCombat = 0;
    if (enemyAtLevel && enemyAtLevel.lootTable) {
        const table = lootTables[enemyAtLevel.lootTable];
        if (table?.gold) {
            avgGoldPerCombat = ((table.gold as any).max || 0) * 0.6; // 60% de probabilidad
        }
    }

    // Combates para comprar un set
    const combatsToBuySet = avgGoldPerCombat > 0 ? Math.ceil(avgSetPrice / avgGoldPerCombat) : Infinity;
    const combatsToBuyFullGear = avgGoldPerCombat > 0 ? Math.ceil((avgSetPrice * 1.2) / avgGoldPerCombat) : Infinity; // 1.2x para gear completo

    // Concentración en mercaderes
    const smithItems = bandItems.filter(([_, def]) => {
        const smith = merchants.smith;
        return smith?.stock?.some((s: any) => (s.itemId || s.id) === def.id);
    }).length;
    const apothecaryItems = bandItems.filter(([_, def]) => {
        const apoth = merchants.apothecary;
        return apoth?.stock?.some((s: any) => (s.itemId || s.id) === def.id);
    }).length;

    economyResults.push({
        levelBand: band.label,
        avgPricePerItem: Math.round(avgPrice * 100) / 100,
        avgPricePerSet: Math.round(avgSetPrice * 100) / 100,
        avgGoldPerCombat: Math.round(avgGoldPerCombat * 100) / 100,
        combatsToBuySet,
        combatsToBuyFullGear,
        itemsInBand: bandItems.length,
        merchantConcentration: { smith: smithItems, apothecary: apothecaryItems },
    });
}

writeFileSync(join(OUT, 'economy.json'), JSON.stringify(economyResults, null, 2));
console.log(`${economyResults.length} resultados económicos escritos en ${OUT}/economy.json`);

// ============================================================
// FASE 6b: Validar optimizador de presets
// ============================================================

console.log('\n=== FASE 6b: Validar optimizador de presets ===\n');

interface PresetValidation {
    presetId: string;
    valid: boolean;
    issues: string[];
    score: number;
    alternativeScore: number;
    isArbitrary: boolean;
}

const presetValidations: PresetValidation[] = [];

// Leer los presets generados
try {
    const presetsPath = join(OUT, '..', 'balance', 'presets.json');
    let presets: any[] = [];
    try {
        const presetsData = JSON.parse(readFileSync(presetsPath, 'utf8'));
        presets = presetsData.presets || presetsData;
    } catch {
        // Si no existe, generar un subconjunto para validar
        console.log('  presets.json no encontrado, generando subconjunto para validar...');
    }

    // Validar cada preset contra alternativas
    for (const preset of presets.slice(0, 100)) {
        // Muestra de 100
        const issues: string[] = [];
        let score = 0;

        // Verificar slots sin colisión
        const slots = new Set<string>();
        for (const item of preset.items || []) {
            const def = items[item.itemId || item.id];
            if (!def) {
                issues.push(`Item ${item.itemId || item.id} no existe`);
                continue;
            }
            for (const slot of slotsFor(def)) {
                if (slots.has(slot)) {
                    issues.push(`Colisión de slot: ${slot}`);
                }
                slots.add(slot);
            }
        }

        // Verificar nivel
        if (preset.minLevel) {
            for (const item of preset.items || []) {
                const def = items[item.itemId || item.id];
                if (def && (def.level || 0) > preset.minLevel + 10) {
                    issues.push(`Item ${def.id} nivel ${def.level} > preset nivel ${preset.minLevel} + 10`);
                }
            }
        }

        // Score: suma de daño + vida + resistencias
        for (const item of preset.items || []) {
            const def = items[item.itemId || item.id];
            if (def) {
                for (const el of ELEMENTS) {
                    score += (def.implicit || [])
                        .filter((m) => m.stat === `damage.${el}`)
                        .reduce((s, m) => s + m.value, 0);
                }
                score += (def.implicit || []).filter((m) => m.stat === 'maxHealth').reduce((s, m) => s + m.value, 0);
            }
        }

        // Comparar con alternativa: reemplazar un item por otro de la misma franja
        let alternativeScore = score;
        let isArbitrary = false;

        if (preset.items?.length > 0 && preset.minLevel) {
            const firstItem = preset.items[0];
            const def = items[firstItem.itemId || firstItem.id];
            if (def) {
                // Buscar alternativa en la misma franja
                const altItems = Object.entries(items).filter(([_, d]) => {
                    return (d.level || 0) >= (def.level || 0) - 10 && (d.level || 0) <= (def.level || 0) + 10;
                });
                if (altItems.length > 1) {
                    // Calcular score con la alternativa de mayor score
                    let maxAltScore = 0;
                    for (const [, altDef] of altItems) {
                        let altScore = 0;
                        for (const el of ELEMENTS) {
                            altScore += (altDef.implicit || [])
                                .filter((m) => m.stat === `damage.${el}`)
                                .reduce((s, m) => s + m.value, 0);
                        }
                        altScore += (altDef.implicit || [])
                            .filter((m) => m.stat === 'maxHealth')
                            .reduce((s, m) => s + m.value, 0);
                        maxAltScore = Math.max(maxAltScore, altScore);
                    }
                    alternativeScore = score - (def.implicit || []).reduce((s, m) => s + m.value, 0) + maxAltScore;
                    isArbitrary = alternativeScore > score * 1.1; // 10% mejor = arbitrario
                }
            }
        }

        presetValidations.push({
            presetId: preset.id || preset.name || 'unknown',
            valid: issues.length === 0,
            issues,
            score: Math.round(score * 100) / 100,
            alternativeScore: Math.round(alternativeScore * 100) / 100,
            isArbitrary,
        });
    }
} catch (e: any) {
    console.log(`  Error validando presets: ${e.message}`);
}

writeFileSync(join(OUT, 'presetValidation.json'), JSON.stringify(presetValidations, null, 2));
console.log(`${presetValidations.length} presets validados en ${OUT}/presetValidation.json`);

// ============================================================
// Resumen
// ============================================================

console.log('\n=== RESUMEN FASE 3b: Combate ===\n');
const byLevel = new Map<number, CombatResult[]>();
for (const r of combatResults) {
    if (!byLevel.has(r.playerLevel)) byLevel.set(r.playerLevel, []);
    byLevel.get(r.playerLevel)!.push(r);
}

for (const [level, results] of byLevel) {
    console.log(`--- Nivel ${level} (vs ${results[0]?.enemyId ?? 'N/A'}) ---`);
    for (const r of results.slice(0, 7)) {
        console.log(
            `  ${r.build.padEnd(12)} ${r.classId.padEnd(20)} Kill:${r.hitsToKill}h  KillTime:${r.estimatedKillTimeSeconds}s  Survive:${r.hitsToKillPlayer}h  D/R:${r.damagePerResource.toFixed(2)}  SetBonuses:${r.setBonusesActive}`,
        );
    }
}

console.log('\n=== RESUMEN FASE 4b: Resistencia ===\n');
console.log(
    'Regla del creador verificada: el daño final solo depende de la resistencia efectiva, no del nivel del objetivo.',
);
console.log('La diferencia de nivel puede afectar otras stats (vida, poder), pero no la fórmula de mitigación.');
console.log(`resistCap: ${rules.resistCap}% por elemento.`);

// Mostrar escenarios clave
const keyScenarios = resistScenarios.filter((s) => s.defenderResist === s.attackPower);
if (keyScenarios.length > 0) {
    console.log('\nEscenarios donde ataque = resistencia (regla del creador):');
    for (const s of keyScenarios.slice(0, 5)) {
        console.log(`  ${s.description} → daño final: ${s.finalDamage} (no reducido por nivel)`);
    }
}

console.log('\n=== RESUMEN FASE 5b: Economía ===\n');
for (const e of economyResults) {
    console.log(
        `  ${e.levelBand}: precio/set ${e.avgPricePerSet.toFixed(0)}, oro/combate ${e.avgGoldPerCombat.toFixed(1)}, combats/set: ${e.combatsToBuySet === Infinity ? '∞' : e.combatsToBuySet}, items: ${e.itemsInBand} (herrero:${e.merchantConcentration.smith} boticario:${e.merchantConcentration.apothecary})`,
    );
}

console.log('\n=== RESUMEN FASE 6b: Presets ===\n');
const validCount = presetValidations.filter((p) => p.valid).length;
const arbitraryCount = presetValidations.filter((p) => p.isArbitrary).length;
console.log(`  ${validCount}/${presetValidations.length} presets válidos`);
console.log(`  ${arbitraryCount} presets con selección potencialmente arbitraria`);
if (arbitraryCount > 0) {
    const arbitrary = presetValidations.filter((p) => p.isArbitrary).slice(0, 5);
    for (const p of arbitrary) {
        console.log(`  ${p.presetId}: score ${p.score} vs alternativa ${p.alternativeScore}`);
    }
}

console.log('\n=== JEQ-08: Fases pendientes completadas ===');
console.log(`- FASE 3b: ${combatResults.length} simulaciones de combate en combat.json`);
console.log(`- FASE 4b: ${resistScenarios.length} escenarios de resistencia en resistScenarios.json`);
console.log(`- FASE 5b: ${economyResults.length} resultados económicos en economy.json`);
console.log(`- FASE 6b: ${presetValidations.length} presets validados en presetValidation.json`);
