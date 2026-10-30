import { describe, expect, it } from 'vitest';
import { StatSheet } from '../../src/rpg/stats';
import { resolveHit, type AttackerProfile, type DamageRules } from '../../src/sim/damage';
import { Rng } from '../../src/sim/rng';
import { content, fixedRng } from './helpers';

const rules = (): DamageRules => ({ elementStat: content().rules.elementStat, resistCap: 60 });

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
    // crítico (0.0 < 0.1): × (1 + 0.5) = 46; armadura 6: × 20/26 = 35; × (1 − 25/100) = 26
    const a = attacker({ strength: 10, power: 20, 'damage.physical': 3, critChance: 0.1, critBonus: 0.5 }, ['physical']);
    const d = defender({ armor: 6, 'resist.physical': 25 });
    const r = resolveHit(fixedRng(0.5, 0), { min: 10, max: 20, element: 'physical', scaling: 0.5, critChance: 0, critBonus: 0 }, a, d, rules());
    expect(r).toEqual({ amount: 26, crit: true });
  });

  it('la armadura sólo protege del físico y la resistencia tiene tope', () => {
    const a = attacker({ intellect: 0 });
    const d = defender({ armor: 50, 'resist.fire': 95 });
    const hit = { min: 100, max: 100, element: 'fire' as const, scaling: 0, critChance: 0, critBonus: 0 };
    expect(resolveHit(fixedRng(0.9), hit, a, d, rules()).amount).toBe(40); // 100 × (1 − 60/100)
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'physical' }, a, d, rules()).amount).toBe(28); // 100 × 20/70
  });

  it('cada elemento escala con su primaria', () => {
    const a = attacker({ intellect: 50, strength: 0, agility: 100 });
    const hit = { min: 10, max: 10, scaling: 0, critChance: 0, critBonus: 0 };
    a.mainStat = null;
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'frost' }, a, null, rules()).amount).toBe(15);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'storm' }, a, null, rules()).amount).toBe(20);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'earth' }, a, null, rules()).amount).toBe(10);
  });

  it('nunca falla: 1000 golpes contra mucha armadura hacen al menos 1', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const r = resolveHit(rng, { min: 1, max: 3, element: 'physical', scaling: 0, critChance: 0.5, critBonus: 1 }, null, defender({ armor: 99 }), rules());
      expect(r.amount).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('armadura con rendimiento decreciente', () => {
  it('a 20 de armadura un golpe hace la mitad y nunca se queda en 1 con armadura normal', () => {
    const hit = { min: 10, max: 10, element: 'physical' as const, scaling: 0, critChance: 0, critBonus: 0 };
    expect(resolveHit(fixedRng(0.9), hit, null, defender({ armor: 0 }), rules()).amount).toBe(10);
    expect(resolveHit(fixedRng(0.9), hit, null, defender({ armor: 20 }), rules()).amount).toBe(5);
    // Con 12 de armadura (Grito de hierro y escudo) un lobo de 10 sigue haciendo 6, no 1.
    expect(resolveHit(fixedRng(0.9), hit, null, defender({ armor: 12 }), rules()).amount).toBe(6);
  });
});
