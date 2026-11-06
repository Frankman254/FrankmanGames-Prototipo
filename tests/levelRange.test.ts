// F20: cada monstruo sale en su rango de niveles y su tamaño cambia poco con el nivel.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { buildCompendium } from '../src/rpg/compendium';
import { clampToRange, levelRangeOf, sizeForLevel } from '../src/sim/levelRange';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { rollLevel } from '../src/sim/zones';

const data = loadGameData();
const al = data.zones.archetypeLevels!;
const base = (id: string): number => data.rpg.enemies[id]!.level;

describe('F20: rango de niveles por monstruo', () => {
  it('los datos lo traen y el Matón de la Tulivieja sale entre 3 y 6', () => {
    expect(al).toBeDefined();
    expect(levelRangeOf(al, 'grave_brute', base('grave_brute'))).toEqual({ min: 3, max: 6 });
  });

  it('el rango a mano sustituye al de por defecto', () => {
    expect(levelRangeOf(al, 'night_sato', base('night_sato'))).toEqual({ min: 1, max: 8 });
  });

  it('cada monstruo de cada zona puede salir dentro de la franja de su zona', () => {
    for (const z of data.zones.zones) {
      if (z.safe) continue;
      for (const s of z.spawns) {
        const r = levelRangeOf(al, s.archetype, base(s.archetype));
        expect(r.max >= z.levelMin && r.min <= z.levelMax, `${z.id}: ${s.archetype} ${r.min}–${r.max}`).toBe(true);
      }
    }
  });

  it('el nivel tirado queda en la parte común de la franja y el rango', () => {
    const zone = { ...data.zones.zones.find((z) => !z.safe)!, levelMin: 1, levelMax: 10 };
    delete (zone as { gradient?: unknown }).gradient;
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) seen.add(rollLevel(rng, zone, 0, undefined, { min: 3, max: 6 }));
    expect([...seen].sort((a, b) => a - b)).toEqual([3, 4, 5, 6]);
    // Sin parte común: el extremo del rango más cercano, más el extra de la entrada.
    expect(rollLevel(rng, zone, 1, undefined, { min: 15, max: 18 })).toBe(16);
    expect(clampToRange(30, { min: 15, max: 18 })).toBe(18);
  });

  it('el tamaño es 1 en el nivel base y cambia poco, con topes', () => {
    expect(sizeForLevel(al, 4, 4)).toBe(1);
    expect(sizeForLevel(al, 6, 4)).toBeCloseTo(1 + 2 * al.sizePerLevel);
    expect(sizeForLevel(al, 99, 4)).toBe(al.sizeMax);
    expect(sizeForLevel(al, 1, 40)).toBe(al.sizeMin);
    expect(al.sizeMax).toBeLessThanOrEqual(1.25);
  });

  it('el mundo pone el tamaño al nacer y respeta el rango en sus zonas', () => {
    const w = new World(data, { encounter: false });
    const e = w.spawnEnemy('grave_brute', { x: 10, y: 10 }, 6);
    expect(e.size).toBeCloseTo(sizeForLevel(al, 6, 4));
    expect(w.levelRangeOf('grave_brute')).toEqual({ min: 3, max: 6 });
  });

  it('el compendio muestra el rango', () => {
    const c = buildCompendium({
      content: data.rpg,
      archetypes: data.enemies.archetypes,
      zones: data.zones.zones,
      levelRange: (id, b) => levelRangeOf(al, id, b),
    });
    const brute = c.creatures.find((x) => x.id === 'grave_brute')!;
    expect([brute.levelMin, brute.levelMax]).toEqual([3, 6]);
  });
});
