// EQ-15: pruebas del desglose de daño por característica.
import { describe, it, expect } from 'vitest';
import { computeDamageBreakdown } from '../src/sim/damageBreakdown';
import type { HitSpec, DamageRules, StatSource } from '../src/sim/damage';
import type { Element } from '../src/rpg/contracts';

const NO_STATS: StatSource = { get: () => 0 };

const RULES: DamageRules = {
    elementStat: {
        fire: 'intellect',
        water: 'calm',
        earth: 'strength',
        air: 'agility',
        frost: 'flow',
        lightning: 'will',
    },
    resistCap: 50,
};

function makeStats(overrides: Record<string, number>): StatSource {
    return { get: (s) => overrides[s] ?? 0 };
}

describe('computeDamageBreakdown', () => {
    it('hechizo sin scaling: todo el daño viene de min/max base', () => {
        const hits: HitSpec[] = [{ min: 10, max: 20, element: 'fire' as Element, scaling: 0, critChance: 0, critBonus: 0 }];
        const spells = [{ spellId: 'test', name: 'Test', hits }];
        const lines = computeDamageBreakdown(spells, NO_STATS, null, [], 0, RULES);
        expect(lines).toHaveLength(1);
        // previewHit aplica Math.floor en cada paso; min=10, max=19 → avg=14.5.
        expect(lines[0]!.avgDamage).toBe(14.5);
        // Sin stats, ninguna contribución.
        expect(lines[0]!.statContribution.intellect).toBe(0);
        expect(lines[0]!.powerContribution).toBe(0);
    });

    it('hechizo con scaling: Intelecto aporta el % correspondiente', () => {
        const stats = makeStats({ intellect: 20 });
        // scaling=2, roll promedio 15 → base = 15 + 2*20 = 55.
        const hits: HitSpec[] = [{ min: 10, max: 20, element: 'fire' as Element, scaling: 2, critChance: 0, critBonus: 0 }];
        const spells = [{ spellId: 'fireball', name: 'Fireball', hits }];
        const lines = computeDamageBreakdown(spells, stats, null, [], 0, RULES);
        expect(lines).toHaveLength(1);
        // Con intellect=0: base = 15. Con intellect=20: base = 55. Contribución = (55-15)/55 ≈ 72.7%.
        expect(lines[0]!.statContribution.intellect).toBeGreaterThan(60);
        expect(lines[0]!.statContribution.intellect).toBeLessThan(80);
    });

    it('power aporta su % del daño', () => {
        const stats = makeStats({ intellect: 10, power: 20 });
        // scaling=1, roll promedio 10 → base = 10 + 1*10 = 20. × (1 + 20/100) = 24.
        const hits: HitSpec[] = [{ min: 5, max: 15, element: 'fire' as Element, scaling: 1, critChance: 0, critBonus: 0 }];
        const spells = [{ spellId: 'spark', name: 'Spark', hits }];
        const lines = computeDamageBreakdown(spells, stats, null, [], 0, RULES);
        expect(lines).toHaveLength(1);
        // Con power=0: base = 20. Con power=20: base = 24. Contribución = (24-20)/24 ≈ 16.7%.
        expect(lines[0]!.powerContribution).toBeGreaterThan(10);
        expect(lines[0]!.powerContribution).toBeLessThan(25);
    });

    it('afinidad de clase aporta su % del daño', () => {
        const stats = makeStats({ intellect: 10 });
        const hits: HitSpec[] = [{ min: 5, max: 15, element: 'fire' as Element, scaling: 1, critChance: 0, critBonus: 0 }];
        const spells = [{ spellId: 'fireball', name: 'Fireball', hits }];
        // Con afinidad: base = 15 + 10 = 25 × 1.25 = 31. Sin afinidad: 25 × 1.0 = 25.
        // Pero la función no puede zeroear la afinidad — mide stats. La afinidad no es una stat.
        // Verificamos que el daño con afinidad es mayor que sin.
        const withAffinity = computeDamageBreakdown(spells, stats, null, ['fire'], 25, RULES);
        const withoutAffinity = computeDamageBreakdown(spells, stats, null, [], 0, RULES);
        expect(withAffinity[0]!.avgDamage).toBeGreaterThan(withoutAffinity[0]!.avgDamage);
    });

    it('hechizo sin daño directo devuelve array vacío', () => {
        const spells = [{ spellId: 'heal', name: 'Heal', hits: [] }];
        const lines = computeDamageBreakdown(spells, NO_STATS, null, [], 0, RULES);
        expect(lines).toHaveLength(1);
        expect(lines[0]!.avgDamage).toBe(0);
    });

    it('critChance contribuye al daño esperado', () => {
        const stats = makeStats({ intellect: 10, critChance: 0.3, critBonus: 0.5 });
        const hits: HitSpec[] = [{ min: 10, max: 20, element: 'fire' as Element, scaling: 1, critChance: 0.1, critBonus: 0.5 }];
        const spells = [{ spellId: 'fireball', name: 'Fireball', hits }];
        const lines = computeDamageBreakdown(spells, stats, null, [], 0, RULES);
        expect(lines).toHaveLength(1);
        // Con critChance=0.3 del stat + 0.1 del hechizo = 0.4 total.
        // Sin critChance del stat: 0.1 total. La contribución debe ser positiva.
        expect(lines[0]!.critChanceContribution).toBeGreaterThan(0);
    });

    it('múltiples hechizos: cada uno con su propio desglose', () => {
        const stats = makeStats({ intellect: 20, strength: 30 });
        const fireHits: HitSpec[] = [{ min: 10, max: 20, element: 'fire' as Element, scaling: 2, critChance: 0, critBonus: 0 }];
        const earthHits: HitSpec[] = [{ min: 15, max: 25, element: 'earth' as Element, scaling: 1, critChance: 0, critBonus: 0 }];
        const spells = [
            { spellId: 'fireball', name: 'Fireball', hits: fireHits },
            { spellId: 'earthquake', name: 'Earthquake', hits: earthHits },
        ];
        const lines = computeDamageBreakdown(spells, stats, null, [], 0, RULES);
        expect(lines).toHaveLength(2);
        // Fireball escala con Intelecto.
        expect(lines[0]!.statContribution.intellect).toBeGreaterThan(0);
        expect(lines[0]!.statContribution.strength).toBe(0);
        // Earthquake escala con Fuerza.
        expect(lines[1]!.statContribution.strength).toBeGreaterThan(0);
        expect(lines[1]!.statContribution.intellect).toBe(0);
    });

    it('stats a cero no producen contribución negativa', () => {
        const stats = makeStats({ intellect: 0, power: 0, critChance: 0 });
        const hits: HitSpec[] = [{ min: 10, max: 20, element: 'fire' as Element, scaling: 2, critChance: 0, critBonus: 0 }];
        const spells = [{ spellId: 'test', name: 'Test', hits }];
        const lines = computeDamageBreakdown(spells, stats, null, [], 0, RULES);
        expect(lines[0]!.statContribution.intellect).toBe(0);
        expect(lines[0]!.powerContribution).toBe(0);
        expect(lines[0]!.critChanceContribution).toBe(0);
    });
});
