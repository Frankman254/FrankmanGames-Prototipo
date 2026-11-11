// V3 (QA): `double_monsoon`, hechizo de prueba de dos líneas (agua + tormenta).
// Contrato: un lanzamiento aplica TODAS las líneas de daño (la vieja `ability()`
// sólo exponía la primera); el crítico se tira UNA vez por blanco y todas las
// líneas del mismo impacto comparten el veredicto; la vista previa coincide con
// el golpe real (mismas fórmulas, mismo clamp de probabilidad).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { clampCritChance } from '../../src/sim/damage';
import type { GameEvent } from '../../src/sim/events';
import { Character } from '../../src/rpg/character';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { prepareSpells } from '../levels';

const DT = 1 / 60;
const data = loadGameData();

function arena(seed: number): { w: World; s: GameSession } {
  const rng = new Rng(seed);
  const s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', `S${seed}`, rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed });
  s.attach(w);
  prepareSpells(s.character, 'double_monsoon');
  w.player.pos = { x: 30, y: 30 };
  w.player.prevPos = { x: 30, y: 30 };
  return { w, s };
}

/** Enemigo quieto, con vida de sobra y resistencias por elemento. */
function dummy(w: World, x: number, resists: Partial<Record<'water' | 'lightning', number>>): { id: number; health: () => number } {
  const e = w.spawnEnemy('melee', { x, y: 30 });
  e.state = 'stagger';
  e.stateTime = -1e9;
  e.health = 1e6;
  const actor = w.enemyActor(e);
  for (const el of ['water', 'lightning'] as const) {
    const v = resists[el];
    if (v !== undefined) actor.stats.set(`qa-${el}`, [{ stat: `resist.${el}`, op: 'flat', value: v }]);
  }
  return { id: e.id, health: () => e.health };
}

/** Lanza el hechizo y devuelve los dos sucesos de daño del lanzamiento. */
function castOn(w: World, target: { id: number }): { amount: number; crit: boolean }[] {
  expect(w.commandCast('double_monsoon', { point: { x: 34, y: 30 }, targetId: target.id })).toBeNull();
  for (let i = 0; i < 90; i++) w.tick(DT);
  return w
    .drainEvents()
    .filter((ev): ev is Extract<GameEvent, { type: 'damage' }> => ev.type === 'damage' && ev.ability === 'double_monsoon' && !ev.toPlayer)
    .map((ev) => ({ amount: ev.amount, crit: ev.crit }));
}

// Líneas del hechizo (rango 1): agua 10–14 y tormenta 6–9, escalado 0.7 cada una.
const LINES = [
  { min: 10, max: 14, scaling: 0.7, el: 'water' as const },
  { min: 6, max: 9, scaling: 0.7, el: 'lightning' as const },
];

/** Esperado por línea: espejo exacto de `previewHit` (tirada exclusiva de max). */
function expected(w: World, resists: Partial<Record<'water' | 'lightning', number>>): { min: number; max: number; critMin: number; critMax: number } {
  const cap = data.rpg.progression.resistCap ?? 50;
  const k = 1 + (data.rpg.classes.ember_vanguard?.baseStats.critBonus ?? 0.5); // sin bonos de equipo
  let min = 0;
  let max = 0;
  let critMin = 0;
  let critMax = 0;
  for (const l of LINES) {
    const stat = w.character.stats.get(l.el === 'water' ? 'flow' : 'agility');
    const res = Math.min(resists[l.el] ?? 0, cap);
    const after = (v: number): number => Math.max(1, Math.floor(v * (1 - res / 100)));
    const lo = Math.floor(l.min + l.scaling * stat);
    const hi = Math.floor(l.max - 1e-9 + l.scaling * stat); // `Rng.range` nunca llega a max
    min += after(lo);
    max += after(hi);
    critMin += after(Math.floor(lo * k));
    critMax += after(Math.floor(hi * k));
  }
  return { min, max, critMin, critMax };
}

describe('V3 QA: hechizo multilínea `double_monsoon`', () => {
  it('todas las líneas viajan en el impacto y suman en la ficha', () => {
    const { w } = arena(7);
    const t = dummy(w, 34, {});
    const ab = w.ability('double_monsoon');
    expect(ab.damageMin).toBe(16); // 10 + 6: no sólo la primera línea
    expect(ab.damageMax).toBe(23); // 14 + 9
    const before = t.health();
    const hits = castOn(w, t);
    expect(hits).toHaveLength(2); // agua y tormenta, dos impactos del mismo lanzamiento
    expect(before - t.health()).toBe(hits.reduce((n, h) => n + h.amount, 0));
  });

  it('resistencias por elemento: cada línea usa la suya, con tope', () => {
    const { w } = arena(9);
    const t = dummy(w, 34, { water: 100 }); // el tope (resistCap %) es la regla
    const pv = w.previewDamage('double_monsoon', t.id)!;
    // Rangos 1 sin estadísticas: agua 10–13, tormenta 6–8 (la tirada exclusiva
    // de `Rng.range` deja el tope en max−1). Agua al tope 50 %: 5–6.
    const plain = expected(w, {});
    expect(plain).toEqual({ min: 16, max: 21, critMin: 24, critMax: 31 });
    expect(pv).toMatchObject({ ...expected(w, { water: 100 }), critChance: 0.15, immune: false });
    expect(expected(w, { water: 100 }).max).toBe(14); // 6 de agua + 8 de tormenta
    const stormCap = expected(w, { lightning: 100 });
    expect(stormCap.max).toBe(17); // 13 de agua + 4 de tormenta: el recorte es por línea
  });

  it('crítico compartido: entre las dos líneas del impacto nunca hay veredictos distintos', () => {
    let critCases = 0;
    let plainCases = 0;
    for (let seed = 1; seed <= 20 && (critCases === 0 || plainCases === 0); seed++) {
      const { w } = arena(seed);
      const t = dummy(w, 34, {});
      const hits = castOn(w, t);
      expect(hits).toHaveLength(2);
      expect(hits[0]!.crit).toBe(hits[1]!.crit); // una tirada, dos líneas
      if (hits[0]!.crit) critCases++;
      else plainCases++;
    }
    expect(critCases, 'algún lanzamiento de 20 debe criticar').toBeGreaterThan(0);
    expect(plainCases, 'y otro debe fallar el crítico').toBeGreaterThan(0);
  });

  it('la vista previa coincide con el golpe real (horquilla y crítico)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const { w } = arena(seed);
      const t = dummy(w, 34, {});
      const pv = w.previewDamage('double_monsoon', t.id)!;
      expect(pv).toMatchObject(expected(w, {}));
      const before = t.health();
      const hits = castOn(w, t);
      const dealt = before - t.health();
      expect(dealt).toBeGreaterThanOrEqual(pv.min);
      expect(dealt).toBeLessThanOrEqual(pv.critMax);
      // Cada línea concreta cae en su tramo (normal o crítico según el veredicto).
      const lineMin = [10, 6];
      const lineMax = [14, 9];
      hits.forEach((h, i) => {
        const lo = h.crit ? Math.floor(lineMin[i]! * 1.5) : lineMin[i]!;
        const hi = h.crit ? Math.floor(lineMax[i]! * 1.5) : lineMax[i]!;
        expect(h.amount, `línea ${i} seed ${seed}`).toBeGreaterThanOrEqual(lo);
        expect(h.amount).toBeLessThanOrEqual(hi);
      });
    }
  });

  it('el crítico propio del hechizo está en rango y es sólo de desarrollo', () => {
    const sp = data.rpg.spells.double_monsoon!;
    expect(sp.critChance).toBeGreaterThanOrEqual(0.05);
    expect(sp.critChance).toBeLessThanOrEqual(0.3);
    expect(sp.devOnly).toBe(true);
    expect(sp.classId).toBeNull();
    // Ninguna ruta normal lo enseña ni lo bucea.
    for (const it of Object.values(data.rpg.items)) expect(it.use?.kind === 'learnSpell' ? it.use.spellId : null).not.toBe('double_monsoon');
    for (const t of Object.values(data.rpg.lootTables)) {
      for (const e of t.entries) {
        const it = data.rpg.items[e.itemId];
        expect(it?.use?.kind === 'learnSpell' ? it.use.spellId : null).not.toBe('double_monsoon');
      }
    }
    for (const q of Object.values(data.rpg.quests)) expect(q.rewards.learnSpell).not.toBe('double_monsoon');
  });

  it('crítico: clamp idéntico en resolve y preview (regla única)', () => {
    expect(clampCritChance(-0.2)).toBe(0);
    expect(clampCritChance(1.7)).toBe(1);
    const { w } = arena(11);
    const t = dummy(w, 34, {});
    // El hechizo declara su propio crítico; la preview lo muestra clampado.
    expect(w.previewDamage('double_monsoon', t.id)!.critChance).toBe(0.15);
  });
});
