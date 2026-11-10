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
    // Fuerza ya escaló la base y no se duplica: × (1 + (power 20 + afinidad 10)/100) = 26; + 3 = 29
    // crítico (0.0 < 0.1): × 1.5 = 43; × (1 − 25/100) = 32
    const a = attacker({ strength: 10, power: 20, 'damage.physical': 3, critChance: 0.1, critBonus: 0.5 }, ['physical']);
    const d = defender({ 'resist.physical': 25 });
    const r = resolveHit(fixedRng(0.5, 0), { min: 10, max: 20, element: 'physical', scaling: 0.5, critChance: 0, critBonus: 0 }, a, d, rules());
    expect(r).toEqual({ amount: 32, crit: true });
  });

  it('la primaria principal no se aplica dos veces al mismo golpe', () => {
    const a = attacker({ strength: 100, power: 0 });
    const hit = { min: 20, max: 20, element: 'physical' as const, scaling: 0.6, critChance: 0, critBonus: 0 };
    expect(resolveHit(fixedRng(0), hit, a, null, rules()).amount).toBe(80);
  });

  it('cada elemento escala con su primaria', () => {
    const a = attacker({ calm: 50, flow: 30, intellect: 0, strength: 0, agility: 100 });
    const hit = { min: 10, max: 10, scaling: 0.2, critChance: 0, critBonus: 0 };
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'frost' }, a, null, rules()).amount).toBe(20);
    // R10: el hielo escala con Calma y el agua con Caudal; el Intelecto ya sólo mueve el fuego.
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'water' }, a, null, rules()).amount).toBe(16);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'fire' }, a, null, rules()).amount).toBe(10);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'storm' }, a, null, rules()).amount).toBe(30);
    expect(resolveHit(fixedRng(0.9), { ...hit, element: 'earth' }, a, null, rules()).amount).toBe(10);
  });

  it('Agilidad no infla agua si Caudal es cero, pero Caudal sí', () => {
    const hit = { min: 15, max: 21, element: 'water' as const, scaling: 0.55, critChance: 0, critBonus: 0 };
    const noFlow = attacker({ agility: 235, flow: 0, power: 13, 'damage.water': 19 });
    const withFlow = attacker({ agility: 235, flow: 100, power: 13, 'damage.water': 19 });
    expect(previewHit(hit, noFlow, null, rules())).toMatchObject({ min: 35, max: 41 });
    expect(previewHit(hit, withFlow, null, rules()).min).toBeGreaterThan(90);
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
    // Fuego usa Intelecto (0), no la Fuerza principal: [10, 20) → 8..15 tras 20 % de resistencia.
    const p = previewHit({ min: 10, max: 20, element: 'fire', scaling: 0.5, critChance: 0, critBonus: 0 }, a, d, rules());
    expect(p).toEqual({ min: 8, max: 15, critMin: 12, critMax: 22, critChance: 0.1 });
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

describe('R10: hielo y agua con característica propia', () => {
  it('el contrato tiene agua, Calma y Caudal, y cada elemento apunta a una primaria', async () => {
    const { ELEMENTS, PRIMARY_STATS } = await import('../../src/rpg/contracts');
    const { content } = await import('./helpers');
    const map = content().rules.elementStat;
    expect(ELEMENTS).toContain('water');
    expect(PRIMARY_STATS).toEqual(expect.arrayContaining(['calm', 'flow']));
    expect(map.frost).toBe('calm');
    expect(map.water).toBe('flow');
    expect(map.fire).toBe('intellect');
    for (const el of ELEMENTS) expect(PRIMARY_STATS as readonly string[], el).toContain(map[el]);
  });

  it('cada clase tiene un hechizo de agua que deja Empapado, y Empapado abre hielo y tormenta', async () => {
    const { content } = await import('./helpers');
    const c = content();
    for (const cl of Object.values(c.classes)) {
      const water = Object.values(c.spells).filter((s) => s.classId === cl.id && s.element === 'water');
      expect(water.length, cl.id).toBeGreaterThanOrEqual(1);
      expect(water.some((s) => s.effects.some((e) => e.type === 'status' && e.statusId === 'soaked')), cl.id).toBe(true);
    }
    const soaked = c.statuses['soaked']!;
    expect(soaked.modifiers.map((m) => m.stat).sort()).toEqual(['resist.frost', 'resist.storm']);
    const hit = { min: 100, max: 100, scaling: 0, critChance: 0, critBonus: 0 };
    const dry = resolveHit(fixedRng(0.9), { ...hit, element: 'frost' }, null, defender({}), rules()).amount;
    const wet = resolveHit(fixedRng(0.9), { ...hit, element: 'frost' }, null, defender({ 'resist.frost': -10 }), rules()).amount;
    expect(dry).toBe(100);
    expect(wet).toBe(110);
  });
});
