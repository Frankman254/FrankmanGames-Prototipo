import { describe, expect, it } from 'vitest';
import { StatSheet } from '../../src/rpg/stats';
import { previewHit, resolveHit, type AttackerProfile, type DamageRules } from '../../src/sim/damage';
import { Rng } from '../../src/sim/rng';
import { content, fixedRng } from './helpers';

const rules = (): DamageRules => ({ elementStat: content().rules.elementStat, resistCap: 50 });

function attacker(mods: Record<string, number>, affinity: AttackerProfile['affinity'] = []): AttackerProfile {
  const s = new StatSheet();
  s.set('t', Object.entries(mods).map(([stat, value]) => ({ stat: stat as never, op: 'flat' as const, value })));
  return { stats: s, mainStat: 'strength', affinity, affinityBonus: 10 };
}

function defender(mods: Record<string, number>): StatSheet {
  const s = new StatSheet();
  s.set('t', Object.entries(mods).map(([stat, value]) => ({ stat: stat as never, op: 'flat' as const, value })));
  return s;
}

describe('tubería de daño', () => {
  it('sigue los pasos del diseño con redondeo hacia abajo', () => {
    // tirada 0.5 de [10, 20] = 15; + 0.5 · fuerza 10 = 20
    // × (1 + (fuerza 10 + power 20 + afinidad 10)/100) = 28; + damage.physical 3 = 31
    // crítico (0.0 < 0.1): × (1 + 0.5) = 46; × (1 − 25/100) = 34
    const a = attacker({ strength: 10, power: 20, 'damage.physical': 3, critChance: 0.1, critBonus: 0.5 }, ['physical']);
    const d = defender({ 'resist.physical': 25 });
    const r = resolveHit(fixedRng(0.5, 0), { min: 10, max: 20, element: 'physical', scaling: 0.5, critChance: 0, critBonus: 0 }, a, d, rules());
    expect(r).toEqual({ amount: 34, crit: true });
  });

  it('cada elemento escala con su primaria', () => {
    const a = attacker({ intellect: 50, strength: 0, agility: 100 });
    const hit = { min: 10, max: 10, scaling: 0, critChance: 0, critBonus: 0 };
    a.mainStat = null;
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'frost' }, a, null, rules()).amount).toBe(15);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'storm' }, a, null, rules()).amount).toBe(20);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'earth' }, a, null, rules()).amount).toBe(10);
  });

  it('nunca falla: 1000 golpes contra la resistencia máxima hacen al menos 1', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const r = resolveHit(rng, { min: 1, max: 3, element: 'physical', scaling: 0, critChance: 0.5, critBonus: 1 }, null, defender({ 'resist.physical': 99 }), rules());
      expect(r.amount).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('combate v2: sin armadura, sólo resistencias con tope del 50 %', () => {
  const hit = { min: 100, max: 100, element: 'physical' as const, scaling: 0, critChance: 0, critBonus: 0 };

  it('la estadística `armor` ya no existe: un valor suelto no reduce nada', () => {
    expect(resolveHit(fixedRng(0.9), hit, null, defender({ armor: 50 }), rules()).amount).toBe(100);
  });

  it('cada elemento sólo mira su resistencia', () => {
    const d = defender({ 'resist.fire': 30 });
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'fire' }, null, d, rules()).amount).toBe(70);
    expect(resolveHit(fixedRng(0.9), hit, null, d, rules()).amount).toBe(100);
  });

  it('la resistencia se queda en el 50 % por mucho que se acumule', () => {
    for (const r of [50, 60, 95, 1000]) expect(resolveHit(fixedRng(0.9), hit, null, defender({ 'resist.physical': r }), rules()).amount).toBe(50);
    expect(resolveHit(fixedRng(0.9), hit, null, defender({ 'resist.physical': 49 }), rules()).amount).toBe(51);
  });

  it('una resistencia negativa hace más daño (sin tope por abajo)', () => {
    expect(resolveHit(fixedRng(0.9), hit, null, defender({ 'resist.physical': -20 }), rules()).amount).toBe(120);
  });

  it('el tope de los datos es 50 y no hay armorHalf', () => {
    const c = content();
    expect(c.progression.resistCap).toBe(50);
    expect((c.progression as unknown as Record<string, unknown>)['armorHalf']).toBeUndefined();
  });
});

describe('vista previa de daño', () => {
  it('da la horquilla min–max y la del crítico tras las resistencias', () => {
    const a = attacker({ strength: 10, critChance: 0.1, critBonus: 0.5 });
    const d = defender({ 'resist.fire': 20 });
    // [10, 20) + 0.5 · 10 = 15..24 (la tirada es [min, max)); × 0.8 = 12..19; crítico × 1.5 = 22..36 → × 0.8 = 17..28
    const p = previewHit({ min: 10, max: 20, element: 'fire', scaling: 0.5, critChance: 0, critBonus: 0 }, a, d, rules());
    expect(p).toEqual({ min: 12, max: 19, critMin: 17, critMax: 28, critChance: 0.1 });
  });

  it('coincide con los extremos de resolveHit', () => {
    const a = attacker({ strength: 7, power: 13, 'damage.physical': 2, critBonus: 0.3 }, ['physical']);
    const d = defender({ 'resist.physical': 35 });
    const spec = { min: 6, max: 11, element: 'physical' as const, scaling: 0.4, critChance: 0, critBonus: 0.2 };
    const p = previewHit(spec, a, d, rules());
    expect(resolveHit(fixedRng(0), spec, a, d, rules()).amount).toBe(p.min);
    expect(resolveHit(fixedRng(0.999999), spec, a, d, rules()).amount).toBe(p.max);
    const crit = { ...spec, critChance: 1 };
    expect(resolveHit(fixedRng(0, 0), crit, a, d, rules()).amount).toBe(p.critMin);
    expect(resolveHit(fixedRng(0.999999, 0), crit, a, d, rules()).amount).toBe(p.critMax);
  });
});
