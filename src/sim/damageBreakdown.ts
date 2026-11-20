// Desglose de daño por característica (EQ-15): para cada hechizo aprendido,
// cuánto daño hace y qué porcentaje aporta cada stat. Función pura sin DOM ni Babylon.
import type { Element, PrimaryStat, StatId } from '../rpg/contracts';
import type { DamageRules, HitSpec, StatSource } from './damage';
import { previewHit } from './damage';

/** Línea de un hechizo en el desglose. */
export interface SpellDamageLine {
    spellId: string;
    name: string;
    /** Daño esperado (promedio de min y max, sin crítico). */
    avgDamage: number;
    /** Daño crítico esperado. */
    avgCritDamage: number;
    /** Probabilidad de crítico (0..1). */
    critChance: number;
    /** % del daño que aporta cada característica primaria (sin power/crit). */
    statContribution: Partial<Record<PrimaryStat, number>>;
    /** % del daño que aporta power. */
    powerContribution: number;
    /** % del daño que aporta critChance. */
    critChanceContribution: number;
    /** % del daño que aporta critBonus. */
    critBonusContribution: number;
}

/** Datos mínimos de un hechizo para calcular el desglose. */
export interface SpellHitData {
    spellId: string;
    name: string;
    /** Efectos de daño del hechizo (ya escalados por rango y power del hechizo). */
    hits: HitSpec[];
}

/**
 * Calcula el desglose de daño por característica para cada hechizo.
 * Para cada stat, mide cuánto baja el daño al ponerla a 0 y expresa la
 * diferencia como porcentaje del daño total.
 */
export function computeDamageBreakdown(
    spells: SpellHitData[],
    stats: StatSource,
    mainStat: PrimaryStat | null,
    affinity: readonly Element[],
    affinityBonus: number,
    rules: DamageRules,
): SpellDamageLine[] {
    const baseProfile = {
        stats,
        mainStat,
        affinity,
        affinityBonus,
    };
    const noDefender: StatSource = { get: () => 0 };

    return spells.map((sp) => {
        // Daño base con todas las stats.
        const basePreview = sp.hits.map((h) => previewHit(h, baseProfile, noDefender, rules));
        const baseAvg = basePreview.reduce((s, p) => s + (p.min + p.max) / 2, 0);
        const baseCritAvg = basePreview.reduce((s, p) => s + (p.critMin + p.critMax) / 2, 0);
        const baseCritChance = basePreview.reduce((s, p) => Math.max(s, p.critChance), 0);

        // Para cada stat primaria, calcular el daño con esa stat a 0.
        const statContribution: Partial<Record<PrimaryStat, number>> = {};
        const allPrimaryStats: PrimaryStat[] = [
            'strength',
            'agility',
            'intellect',
            'calm',
            'flow',
            'will',
            'vitality',
            'spirit',
        ];

        for (const ps of allPrimaryStats) {
            const currentVal = stats.get(ps);
            if (currentVal === 0) {
                statContribution[ps] = 0;
                continue;
            }
            // Stat a 0.
            const zeroedStats: StatSource = {
                get: (s: StatId) => (s === ps ? 0 : stats.get(s)),
            };
            const zeroedProfile = { ...baseProfile, stats: zeroedStats };
            const zeroedPreview = sp.hits.map((h) => previewHit(h, zeroedProfile, noDefender, rules));
            const zeroedAvg = zeroedPreview.reduce((s, p) => s + (p.min + p.max) / 2, 0);
            const diff = baseAvg - zeroedAvg;
            statContribution[ps] = baseAvg > 0 ? Math.max(0, (diff / baseAvg) * 100) : 0;
        }

        // Power: poner power a 0.
        const powerVal = stats.get('power');
        let powerContribution = 0;
        if (powerVal !== 0 && baseAvg > 0) {
            const zeroedPower: StatSource = {
                get: (s: StatId) => (s === 'power' ? 0 : stats.get(s)),
            };
            const zeroedProfile = { ...baseProfile, stats: zeroedPower };
            const zeroedPreview = sp.hits.map((h) => previewHit(h, zeroedProfile, noDefender, rules));
            const zeroedAvg = zeroedPreview.reduce((s, p) => s + (p.min + p.max) / 2, 0);
            powerContribution = Math.max(0, ((baseAvg - zeroedAvg) / baseAvg) * 100);
        }

        // CritChance: poner a 0.
        const critChanceVal = stats.get('critChance');
        let critChanceContribution = 0;
        if (critChanceVal !== 0 && baseAvg > 0) {
            const zeroedCC: StatSource = {
                get: (s: StatId) => (s === 'critChance' ? 0 : stats.get(s)),
            };
            const zeroedProfile = { ...baseProfile, stats: zeroedCC };
            const zeroedPreview = sp.hits.map((h) => previewHit(h, zeroedProfile, noDefender, rules));
            const zeroedAvg = zeroedPreview.reduce((s, p) => s + (p.min + p.max) / 2, 0);
            // critChance no afecta el daño directo, solo el crítico; la contribución
            // se mide como la diferencia entre daño promedio con crítico y sin.
            // Pero previewHit no incluye el crítico en min/max, solo en critMin/critMax.
            // La contribución de critChance es el incremento en daño esperado por crítico.
            const baseExpected = baseAvg * (1 - baseCritChance) + baseCritAvg * baseCritChance;
            const zeroedCritChance = zeroedPreview.reduce((s, p) => Math.max(s, p.critChance), 0);
            const zeroedExpected = baseAvg * (1 - zeroedCritChance) + baseCritAvg * zeroedCritChance;
            const expectedDiff = baseExpected - zeroedExpected;
            critChanceContribution = baseExpected > 0 ? Math.max(0, (expectedDiff / baseExpected) * 100) : 0;
        }

        // CritBonus: poner a 0.
        const critBonusVal = stats.get('critBonus');
        let critBonusContribution = 0;
        if (critBonusVal !== 0 && baseAvg > 0) {
            const zeroedCB: StatSource = {
                get: (s: StatId) => (s === 'critBonus' ? 0 : stats.get(s)),
            };
            const zeroedProfile = { ...baseProfile, stats: zeroedCB };
            const zeroedPreview = sp.hits.map((h) => previewHit(h, zeroedProfile, noDefender, rules));
            const zeroedCritAvg = zeroedPreview.reduce((s, p) => s + (p.critMin + p.critMax) / 2, 0);
            // El critBonus solo afecta el multiplicador de crítico.
            const baseExpected = baseAvg * (1 - baseCritChance) + baseCritAvg * baseCritChance;
            const zeroedExpected = baseAvg * (1 - baseCritChance) + zeroedCritAvg * baseCritChance;
            const expectedDiff = baseExpected - zeroedExpected;
            critBonusContribution = baseExpected > 0 ? Math.max(0, (expectedDiff / baseExpected) * 100) : 0;
        }

        return {
            spellId: sp.spellId,
            name: sp.name,
            avgDamage: Math.round(baseAvg * 10) / 10,
            avgCritDamage: Math.round(baseCritAvg * 10) / 10,
            critChance: Math.round(baseCritChance * 1000) / 1000,
            statContribution,
            powerContribution: Math.round(powerContribution * 10) / 10,
            critChanceContribution: Math.round(critChanceContribution * 10) / 10,
            critBonusContribution: Math.round(critBonusContribution * 10) / 10,
        };
    });
}
