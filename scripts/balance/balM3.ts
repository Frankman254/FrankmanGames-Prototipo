// BAL-M3: Vida de los monstruos por nivel frente al daño del jugador por nivel.
// Solo medición: no cambia cifras.
//
// Fórmulas (de src/sim/zones.ts y data/zones.json):
//   levelCurve(c, n) = (1 + c.linear*(n-1)) * (1 + c.compound)^(n-1)
//   HP_monstruo(n) = baseHP * levelCurve(maxHealth, n, 1) / levelCurve(maxHealth, baseLevel, 1)
//   Daño_monstruo(n) = baseDmg * levelCurve(damage, n, 1) / levelCurve(damage, baseLevel, 1)
//
// Jugador (de data/rpg/progression.json y classes.json):
//   HP_jugador = classBaseHP + healthPerLevel*level + vitality*5
//   Daño_hechizo = (min + perLevel*level) * power * rankScaling + scaling*elementStat
//   levelDiffMultiplier = 1 + perLevel*(attackerLevel - defenderLevel), con topes
//
// Se asume un jugador que invierte puntos de forma equilibrada (10/nivel, repartidos
// en vitalidad y la primaria del elemento del hechizo).

import * as fs from 'fs';
import * as path from 'path';

// ---- Datos de escalado de zonas ----
const scaling = {
    maxHealth: { linear: 0.08, compound: 0 },
    damage: { linear: 0.06, compound: 0 },
};

// ---- Datos de progresión ----
const healthPerLevel = 20; // data/rpg/progression.json
const statPointsPerLevel = 10;

// ---- Clases: baseStats y mainStat ----
interface ClassInfo {
    id: string;
    baseHP: number;
    mainStat: string;
    element: string;
}

const classes: ClassInfo[] = [
    { id: 'ember_vanguard', baseHP: 80, mainStat: 'strength', element: 'fire' },
    { id: 'mangrove_hunter', baseHP: 70, mainStat: 'agility', element: 'air' },
    { id: 'storm_weaver', baseHP: 65, mainStat: 'calm', element: 'water' },
];

// ---- Arquetipos enemigos representativos ----
interface ArchetypeInfo {
    id: string;
    baseHP: number;
    baseDmg: number;
    baseLevel: number;
}

const archetypes: ArchetypeInfo[] = [
    { id: 'melee', baseHP: 60, baseDmg: 12, baseLevel: 1 },
    { id: 'alpha_wolf', baseHP: 140, baseDmg: 18, baseLevel: 5 },
    { id: 'ranged', baseHP: 45, baseDmg: 10, baseLevel: 1 },
    { id: 'caster', baseHP: 50, baseDmg: 15, baseLevel: 3 },
];

// ---- Hechizos representativos por clase (daño base y perLevel) ----
interface SpellInfo {
    id: string;
    damageMin: number;
    damageMax: number;
    perLevel: number;
    elementStat: string;
    rank: number;
    maxRank: number;
    perRank: number;
}

const spellsByClass: Record<string, SpellInfo> = {
    ember_vanguard: {
        id: 'ember_whirl',
        damageMin: 20,
        damageMax: 28,
        perLevel: 0.15,
        elementStat: 'intellect',
        rank: 1,
        maxRank: 6,
        perRank: 0.25,
    },
    mangrove_hunter: {
        id: 'piercing_shot',
        damageMin: 18,
        damageMax: 24,
        perLevel: 0.12,
        elementStat: 'agility',
        rank: 1,
        maxRank: 6,
        perRank: 0.25,
    },
    storm_weaver: {
        id: 'glacial_lance',
        damageMin: 22,
        damageMax: 30,
        perLevel: 0.13,
        elementStat: 'calm',
        rank: 1,
        maxRank: 6,
        perRank: 0.25,
    },
};

// ---- levelCurve ----
function levelCurve(c: { linear: number; compound: number }, level: number): number {
    const n = Math.max(0, level - 1);
    return (1 + c.linear * n) * Math.pow(1 + c.compound, n);
}

function levelRatio(c: { linear: number; compound: number }, level: number, baseLevel: number): number {
    return levelCurve(c, level) / levelCurve(c, baseLevel);
}

// ---- levelDiffMultiplier ----
function levelDiffMultiplier(attackerLevel: number, defenderLevel: number): number {
    const perLevel = 0.05; // data/zones.json levelDifference.perLevel
    const maxBonus = 0.5;
    const maxPenalty = 0.85;
    const x = perLevel * (attackerLevel - defenderLevel);
    return x >= 0 ? 1 + Math.min(maxBonus, x) : 1 - Math.min(maxPenalty, -x);
}

// ---- Cálculo por nivel ----
interface Row {
    level: number;
    // Jugador
    playerHP: number;
    playerDPS: number; // daño por segundo estimado (hechizo principal, cooldown ~1.2s)
    playerPower: number;
    playerVitality: number;
    playerElementStat: number;
    // Monstruo (melee, nivel = jugador)
    enemyHP: number;
    enemyDPS: number;
    // Ratio
    killsPerSecond: number; // playerDPS / enemyHP
    timeToKill: number; // enemyHP / playerDPS
    damageTakenPerKill: number; // enemyDPS * timeToKill
    survivalRatio: number; // playerHP / damageTakenPerKill
}

/**
 * Simula un jugador que invierte puntos de forma equilibrada:
 * - 40% en vitalidad (+5 HP por punto)
 * - 40% en la stat del elemento del hechizo
 * - 20% en spirit (recurso para lanzar)
 */
function calcRow(level: number, cls: ClassInfo, spell: SpellInfo): Row {
    const pts = statPointsPerLevel * level;
    const vitality = Math.round(pts * 0.4);
    const elementStat = Math.round(pts * 0.4);
    const spirit = Math.round(pts * 0.2);

    // HP jugador: base + healthPerLevel*level + vitality*5
    const playerHP = cls.baseHP + healthPerLevel * level + vitality * 5;

    // Power: 1 + elementStat * basicScaling (0.3)
    const basicScaling = 0.3;
    const power = 1 + elementStat * basicScaling;

    // Rank del hechizo a este nivel (simplificado: rango 1 hasta nivel alto)
    // Con factores '6': [0.08, 0.20, 0.40, 0.65, 0.90]
    // rankAtLevel: rango r en U + ceil((M-U)*factor[r-1])
    // Para un hechizo aprendido en nivel 1, maxRank 6:
    // rango 2 en 1 + ceil(5*0.08) = 1 + 1 = 2
    // rango 3 en 1 + ceil(5*0.20) = 1 + 2 = 3
    // rango 4 en 1 + ceil(5*0.40) = 1 + 3 = 4
    // rango 5 en 1 + ceil(5*0.65) = 1 + 4 = 5
    // rango 6 en 1 + ceil(5*0.90) = 1 + 5 = 6
    let rank = 1;
    if (level >= 2) rank = 2;
    if (level >= 3) rank = 3;
    if (level >= 4) rank = 4;
    if (level >= 5) rank = 5;
    if (level >= 6) rank = 6;

    // Daño base del hechizo: promedio del rango + perLevel*level
    const avgBase = (spell.damageMin + spell.damageMax) / 2;
    const perLevelBonus = spell.perLevel * level;
    const rankScaling = 1 + (rank - 1) * spell.perRank;
    const spellDamage = (avgBase + perLevelBonus) * power * rankScaling;

    // Cooldown promedio ~1.2s para un hechizo de daño
    const cooldown = 1.2;
    const playerDPS = spellDamage / cooldown;

    // Monstruo melee a nivel del jugador
    const arch = archetypes[0]; // melee
    const enemyHP = Math.round(arch.baseHP * levelRatio(scaling.maxHealth, level, arch.baseLevel));
    const enemyDmg = arch.baseDmg * levelRatio(scaling.damage, level, arch.baseLevel);
    const enemyCooldown = 1.2;
    const enemyDPS = enemyDmg / enemyCooldown;

    // Time to kill
    const timeToKill = enemyHP / playerDPS;
    const killsPerSecond = playerDPS / enemyHP;

    // Daño recibido por kill
    const damageTakenPerKill = enemyDPS * timeToKill;

    // Ratio de supervivencia: cuántos enemigos de tu nivel puedes matar sin curar
    const survivalRatio = playerHP / damageTakenPerKill;

    return {
        level,
        playerHP: Math.round(playerHP),
        playerDPS: Math.round(playerDPS * 10) / 10,
        playerPower: Math.round(power * 100) / 100,
        playerVitality: vitality,
        playerElementStat: elementStat,
        enemyHP,
        enemyDPS: Math.round(enemyDPS * 10) / 10,
        killsPerSecond: Math.round(killsPerSecond * 100) / 100,
        timeToKill: Math.round(timeToKill * 100) / 100,
        damageTakenPerKill: Math.round(damageTakenPerKill * 10) / 10,
        survivalRatio: Math.round(survivalRatio * 100) / 100,
    };
}

// ---- Generar tabla ----
const levels = [];
for (let l = 1; l <= 200; l += 5) levels.push(l);
levels.push(200);

const rows: Row[] = [];
for (const cls of classes) {
    const spell = spellsByClass[cls.id];
    for (const level of levels) {
        rows.push(calcRow(level, cls, spell));
    }
}

// ---- Escribir informe ----
const lines: string[] = [];
lines.push('# BAL-M3: Vida de monstruos vs daño del jugador por nivel');
lines.push('');
lines.push('Medición estática de las curvas de vida y daño para identificar dónde se separan.');
lines.push('');
lines.push('## Fórmulas');
lines.push('');
lines.push('- **HP monstruo** (arquetipo melee, base 60 HP, nivel base 1):');
lines.push('  `HP(n) = 60 × (1 + 0.08×(n-1)) / (1 + 0.08×0)` = `60 × (1 + 0.08×(n-1))`');
lines.push('- **Daño monstruo** (ataque básico melee, base 12 dmg):');
lines.push('  `Dmg(n) = 12 × (1 + 0.06×(n-1))`');
lines.push('- **HP jugador** (Vanguardia, base 80 + 20/nivel + vitalidad×5):');
lines.push('  `HP(n) = 80 + 20×n + vitalidad×5`');
lines.push('  Con 40% de 10 pts/nivel en vitalidad: `vitalidad = 4×n` → `HP(n) = 80 + 20n + 20n = 80 + 40n`');
lines.push('- **Daño hechizo jugador** (promedio del rango + perLevel×nivel) × power × rankScaling:');
lines.push('  `Dmg(n) = (avgBase + perLevel×n) × (1 + elementStat×0.3) × rankScaling`');
lines.push('  Con 40% de 10 pts/nivel en stat elemental: `elementStat = 4×n` → `power = 1 + 1.2n`');
lines.push('- **LevelDiffMultiplier**: `1 + 0.05×(attackerLevel - defenderLevel)`, tope +50%, -85%');
lines.push('');
lines.push('## Supuestos');
lines.push('');
lines.push('- Jugador invierte 40% de puntos en vitalidad, 40% en stat elemental, 20% en spirit.');
lines.push('- Hechizo representativo por clase, rango escalado por nivel (D-01a).');
lines.push('- Cooldown hechizo: 1.2 s; cooldown ataque básico enemigo: 1.2 s.');
lines.push('- Monstruo melee a nivel del jugador (sin diferencia de nivel).');
lines.push('- Sin equipo, sin sets, sin mascotas, sin buffs.');
lines.push('');

// Tabla por clase
for (const cls of classes) {
    lines.push(`## ${cls.id}`);
    lines.push('');
    lines.push('| Nivel | HP Jugador | DPS Jugador | HP Monstruo | DPS Monstruo | TTK (s) | Daño recibido/kill | Kills sin curar |');
    lines.push('|-------|-----------|-------------|-------------|-------------|---------|-------------------|-----------------|');

    const clsRows = rows.filter((r, i) => {
        // Cada clase tiene levels.length filas, en orden
        const clsIndex = classes.indexOf(cls);
        return Math.floor(i / levels.length) === clsIndex;
    });

    for (const r of clsRows) {
        lines.push(
            `| ${r.level} | ${r.playerHP.toLocaleString('es-ES')} | ${r.playerDPS.toLocaleString('es-ES')} | ${r.enemyHP.toLocaleString('es-ES')} | ${r.enemyDPS.toLocaleString('es-ES')} | ${r.timeToKill} | ${r.damageTakenPerKill.toLocaleString('es-ES')} | ${r.survivalRatio} |`
        );
    }
    lines.push('');
}

// Análisis
lines.push('## Análisis: dónde se separan las curvas');
lines.push('');

// Calcular los puntos clave
for (const cls of classes) {
    const spell = spellsByClass[cls.id];
    lines.push(`### ${cls.id}`);
    lines.push('');

    // HP ratio: jugador / monstruo
    const arch = archetypes[0];
    let hpCrossover = -1;
    let dpsCrossover = -1;

    for (let l = 1; l <= 200; l++) {
        const r = calcRow(l, cls, spell);
        // HP crossover: donde el HP del jugador es igual al del monstruo
        if (hpCrossover < 0 && r.playerHP >= r.enemyHP && l > 1) {
            const prev = calcRow(l - 1, cls, spell);
            if (prev.playerHP < prev.enemyHP) {
                hpCrossover = l;
            }
        }
        // DPS crossover: donde el DPS del jugador mata en menos de 1 segundo
        if (dpsCrossover < 0 && r.timeToKill < 1.0 && l > 1) {
            dpsCrossover = l;
        }
    }

    // Survival ratio por tramos
    const tramos = [1, 10, 20, 50, 100, 150, 200];
    lines.push('| Nivel | HP Jug/Mon | DPS Jug/Mon | Kills sin curar |');
    lines.push('|-------|-----------|-------------|-----------------|');
    for (const l of tramos) {
        const r = calcRow(l, cls, spell);
        const hpRatio = (r.playerHP / r.enemyHP).toFixed(2);
        const dpsRatio = (r.playerDPS / r.enemyDPS).toFixed(2);
        lines.push(`| ${l} | ${hpRatio} | ${dpsRatio} | ${r.survivalRatio} |`);
    }
    lines.push('');

    if (hpCrossover > 0) {
        lines.push(`- HP del jugador supera al del monstruo desde el nivel **${hpCrossover}**. Antes, el monstruo tiene más vida.`);
    }
    if (dpsCrossover > 0) {
        lines.push(`- TTK baja de 1 segundo desde el nivel **${dpsCrossover}**. El jugador mata más rápido de lo que el monstruo ataca.`);
    }
    lines.push('');
}

// Conclusión general
lines.push('## Conclusión general');
lines.push('');

// Calcular los valores finales
const vanguard200 = calcRow(200, classes[0], spellsByClass[classes[0].id]);
const hunter200 = calcRow(200, classes[1], spellsByClass[classes[1].id]);
const weaver200 = calcRow(200, classes[2], spellsByClass[classes[2].id]);

lines.push(`A nivel 200 (sin equipo):`);
lines.push('');
lines.push(`| Clase | HP Jugador | HP Monstruo | Ratio HP | DPS Jugador | TTK (s) | Kills sin curar |`);
lines.push(`|-------|-----------|-------------|---------|-------------|---------|-----------------|`);
lines.push(`| Vanguardia | ${vanguard200.playerHP.toLocaleString('es-ES')} | ${vanguard200.enemyHP.toLocaleString('es-ES')} | ${(vanguard200.playerHP / vanguard200.enemyHP).toFixed(1)}x | ${vanguard200.playerDPS.toLocaleString('es-ES')} | ${vanguard200.timeToKill} | ${vanguard200.survivalRatio} |`);
lines.push(`| Cazador | ${hunter200.playerHP.toLocaleString('es-ES')} | ${hunter200.enemyHP.toLocaleString('es-ES')} | ${(hunter200.playerHP / hunter200.enemyHP).toFixed(1)}x | ${hunter200.playerDPS.toLocaleString('es-ES')} | ${hunter200.timeToKill} | ${hunter200.survivalRatio} |`);
lines.push(`| Tejedora | ${weaver200.playerHP.toLocaleString('es-ES')} | ${weaver200.enemyHP.toLocaleString('es-ES')} | ${(weaver200.playerHP / weaver200.enemyHP).toFixed(1)}x | ${weaver200.playerDPS.toLocaleString('es-ES')} | ${weaver200.timeToKill} | ${weaver200.survivalRatio} |`);
lines.push('');
lines.push('### Separación de curvas');
lines.push('');
lines.push('- **HP**: El jugador crece más rápido que el monstruo porque `healthPerLevel` (20/nivel) + vitalidad (4 pts/nivel × 5 = 20/nivel) = **40 HP/nivel** para el jugador vs **4.8 HP/nivel** (60 × 0.08) para el monstruo melee. La curva del jugador se separa claramente desde el nivel 2-3.');
lines.push('- **Daño**: El jugador crece con `power = 1 + 1.2×nivel` (lineal) mientras el monstruo crece con `1 + 0.06×(nivel-1)`. A nivel 200, el power del jugador es ~241x vs ~11.5x del monstruo. **El daño del jugador crece mucho más rápido** porque la inversión de puntos en stats elementales multiplica el daño base.');
lines.push('- **Equilibrio**: Sin equipo, el jugador a nivel 200 puede matar **cientos de enemigos** de su nivel sin curar. El equilibrio real depende del equipo (que da stats a ambos), de los jefes (que tienen más HP y daño que los normales) y de los grupos (múltiples enemigos atacando a la vez).');
lines.push('');
lines.push('### Observación clave');
lines.push('');
lines.push('La separación más crítica está en el **daño**: el jugador gana un multiplicador de power lineal con los puntos invertidos, mientras el monstruo solo escala por la curva de zonas. A nivel bajo (1-10) el equilibrio es razonable; a partir de nivel 50-100, el jugador sin equipo ya hace un daño desproporcionado frente a monstruos normales de su nivel. Los jefes y los grupos son los que mantienen la tensión.');

// Escribir archivo
const outPath = path.join('work', 'junie-balm3', 'INFORME.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
console.log(`Escrito: ${outPath}`);

// También escribir datos JSON para gráficos
const jsonOut: Array<{
    level: number;
    classId: string;
    playerHP: number;
    playerDPS: number;
    enemyHP: number;
    enemyDPS: number;
    timeToKill: number;
    survivalRatio: number;
}> = [];

for (const cls of classes) {
    const spell = spellsByClass[cls.id];
    for (const level of levels) {
        const r = calcRow(level, cls, spell);
        jsonOut.push({
            level: r.level,
            classId: cls.id,
            playerHP: r.playerHP,
            playerDPS: r.playerDPS,
            enemyHP: r.enemyHP,
            enemyDPS: r.enemyDPS,
            timeToKill: r.timeToKill,
            survivalRatio: r.survivalRatio,
        });
    }
}

const jsonPath = path.join('work', 'junie-balm3', 'datos.json');
fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2), 'utf-8');
console.log(`Escrito: ${jsonPath}`);
