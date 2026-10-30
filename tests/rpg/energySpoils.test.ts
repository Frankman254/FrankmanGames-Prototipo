import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Energy } from '../../src/rpg/energy';
import { Encounter, distribute, shares } from '../../src/rpg/spoils';
import { Rng } from '../../src/sim/rng';

describe('Pulso', () => {
  const def = () => loadGameData().rpg.energy;

  it('pierde al morir, se recupera y mantiene la penalización hasta el umbral', () => {
    const e = new Energy(def());
    for (let i = 0; i < 5; i++) e.die();
    expect(e.value).toBe(0);
    expect(e.exhausted).toBe(true);
    expect(e.penaltyMods()).not.toHaveLength(0);
    e.gain(def().penalty.clearAt - 1);
    expect(e.exhausted).toBe(true);
    e.gain(1);
    expect(e.exhausted).toBe(false);
    expect(e.penaltyMods()).toHaveLength(0);
  });

  it('se guarda y carga sin curarse por accidente', () => {
    const first = new Energy(def());
    first.die();
    const loaded = new Energy(def(), first.toSave());
    expect(loaded.value).toBe(first.value);
    expect(loaded.exhausted).toBe(first.exhausted);
  });
});

describe('botín de fin de combate', () => {
  const rules = () => loadGameData().rpg.spoils;

  it('pondera daño, curación y tiempo y conserva el total de monedas', () => {
    const parts = new Map([
      ['a', { damage: 900, healing: 0, time: 10 }],
      ['b', { damage: 100, healing: 300, time: 10 }],
    ]);
    const split = shares(parts, rules().weights);
    expect([...split.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const out = distribute(new Rng(3), { gold: 101, xp: 100, kills: 1, items: [] }, parts, rules());
    expect(out.reduce((n, x) => n + x.gold, 0)).toBe(101);
    expect(out.every((x) => x.xp >= 25)).toBe(true);
  });

  it('termina tras calma o al caer todo el grupo', () => {
    const encounter = new Encounter(rules(), new Rng(9));
    encounter.damage('player', 12);
    encounter.addKill(10, 7, []);
    expect(encounter.tick(rules().calmSeconds - 0.1, 0, ['player'])).toBeNull();
    const done = encounter.tick(0.2, 0, ['player']);
    expect(done?.kills).toBe(1);
    encounter.damage('player', 1);
    expect(encounter.tick(0.01, 1, [])?.wiped).toBe(true);
  });
});
