import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Rng } from '../src/sim/rng';
import { rollLevel, ZoneMap } from '../src/sim/zones';

const data = loadGameData();
const map = new ZoneMap(data.zones);
const VILLAGE = { x: 127, y: 131 };

describe('zona inicial y Herrera', () => {
  it('nada alrededor del pueblo supera el nivel 10', () => {
    for (let x = 0; x <= 256; x += 8) {
      for (let y = 0; y <= 256; y += 8) {
        const z = map.zoneAt({ x, y })!;
        expect(z.safe || z.levelMax <= 10, `${x},${y} ${z.id}`).toBe(true);
      }
    }
  });

  it('junto al pueblo salen los niveles más bajos, y suben al alejarse', () => {
    const rng = new Rng(5);
    const azuero = data.zones.zones.find((z) => z.id === 'azuero')!;
    const sabanas = data.zones.zones.find((z) => z.id === 'sabanas')!;
    for (let i = 0; i < 200; i++) expect(rollLevel(rng, azuero, 0, { x: VILLAGE.x + 20, y: VILLAGE.y })).toBeLessThanOrEqual(2);
    for (let i = 0; i < 200; i++) expect(rollLevel(rng, sabanas, 0, { x: VILLAGE.x + 240, y: VILLAGE.y })).toBeLessThanOrEqual(7);
    for (let i = 0; i < 200; i++) expect(rollLevel(rng, sabanas, 0, { x: -500, y: 0 })).toBeGreaterThanOrEqual(9);
  });

  it('sin gradiente, cada zona tira en toda su franja', () => {
    const rng = new Rng(9);
    const z = data.zones.zones.find((q) => q.id === 'parrita')!;
    const seen = new Set(Array.from({ length: 400 }, () => rollLevel(rng, z, 0, { x: 0, y: 450 })));
    expect(Math.min(...seen)).toBe(25);
    expect(Math.max(...seen)).toBe(40);
  });

  it('Herrera va del 10 al 80, y la capital es segura', () => {
    const zones = ['cane_pese', 'parrita', 'ocua', 'macanas', 'sarigua'].map((id) => data.zones.zones.find((z) => z.id === id)!);
    expect(zones.map((z) => [z.levelMin, z.levelMax])).toEqual([[10, 25], [25, 40], [40, 55], [55, 65], [65, 80]]);
    expect(map.zoneAt({ x: 10, y: 490 })?.id).toBe('chitri');
    expect(map.zoneAt({ x: 10, y: 490 })?.safe).toBe(true);
    expect(data.rpg.progression.maxLevel).toBeGreaterThanOrEqual(80);
  });
});
