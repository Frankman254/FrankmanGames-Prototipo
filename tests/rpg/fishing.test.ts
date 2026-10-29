import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../../src/data';
import { loadWorldData } from '../../src/data/worldData';
import { Character } from '../../src/rpg/character';
import { GameSession } from '../../src/rpg/session';
import type { GameEvent } from '../../src/sim/events';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';

const DT = 1 / 60;

/** Arena de 80 m con el estanque traído a (40, 40), radio 6. */
function pond(seed = 1): { w: World; s: GameSession; data: GameData } {
  const data = loadGameData();
  const spot = { ...Object.values(data.rpg.fishing.spots)[0]!, x: 40, y: 40, radius: 6 };
  data.rpg = { ...data.rpg, merchants: {}, fishing: { ...data.rpg.fishing, spots: { [spot.id]: spot } } };
  const rng = new Rng(seed);
  const s = new GameSession(data.rpg, Character.create(data.rpg, 'storm_weaver', 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed });
  s.attach(w);
  w.player.pos = { x: 40, y: 50 };
  w.player.prevPos = { x: 40, y: 50 };
  return { w, s, data };
}

function until(w: World, pred: (ev: GameEvent[]) => boolean, seconds = 20): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < seconds / DT; i++) {
    w.tick(DT);
    const ev = w.drainEvents();
    all.push(...ev);
    if (pred(ev)) break;
  }
  return all;
}

describe('pesca', () => {
  it('cada estanque de pesca coincide con uno del terreno', () => {
    const terrain = loadWorldData().terrain;
    const spots = Object.values(loadGameData().rpg.fishing.spots);
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      expect(terrain.ponds.some((p) => p.x === s.x && p.y === s.y && p.radius === s.radius), s.id).toBe(true);
    }
  });

  it('el agua no se pisa', () => {
    const { w } = pond();
    expect(w.grid.walkable({ x: 40, y: 40 })).toBe(false);
    expect(w.grid.walkable({ x: 40, y: 50 })).toBe(true);
  });

  it('lanzar → pica → clic a tiempo: pez a la mochila', () => {
    const { w, s } = pond();
    const before = s.inventory().slots.filter(Boolean).length + s.player().gold;
    expect(w.commandFish({ x: 40, y: 42 })).toBe(true);
    expect(w.fishing?.state).toBe('waiting');
    // El corcho cae dentro del agua.
    expect(Math.hypot(w.fishing!.bobber.x - 40, w.fishing!.bobber.y - 40)).toBeLessThanOrEqual(6);
    const ev = until(w, (e) => e.some((x) => x.type === 'fishBite'));
    expect(ev.some((e) => e.type === 'fishBite')).toBe(true);
    expect(w.commandFish(null)).toBe(true);
    const caught = w.drainEvents().find((e) => e.type === 'fishCatch');
    expect(caught).toBeDefined();
    expect(w.fishing).toBeNull();
    const after = s.inventory().slots.filter(Boolean).length + s.player().gold;
    // Ha entrado algo (un pez nuevo, más en una pila existente o monedas).
    const fishCount = ['fish_silver_perch', 'fish_moss_carp', 'fish_storm_eel', 'fish_lantern', 'old_boot', 'jade_ring', 'scroll_wolf_spirit']
      .reduce((n, id) => n + s.character.inventory.count(id), 0);
    expect(fishCount + after - before).toBeGreaterThan(0);
  });

  it('sacar antes de que pique asusta al pez; tarde, se escapa', () => {
    const a = pond(2);
    a.w.commandFish({ x: 40, y: 42 });
    a.w.commandFish(null);
    expect(a.w.drainEvents()).toContainEqual({ type: 'fishEscape', reason: 'early' });
    expect(a.w.fishing).toBeNull();

    const b = pond(3);
    b.w.commandFish({ x: 40, y: 42 });
    const ev = until(b.w, (e) => e.some((x) => x.type === 'fishEscape'));
    expect(ev).toContainEqual({ type: 'fishEscape', reason: 'late' });
    expect(b.w.fishing).toBeNull();
  });

  it('lejos de la orilla: camina hasta ella y lanza solo; moverse recoge el sedal', () => {
    const { w } = pond(4);
    w.player.pos = { x: 40, y: 70 };
    w.player.prevPos = { x: 40, y: 70 };
    expect(w.commandFish({ x: 40, y: 38 })).toBe(true);
    expect(w.fishing).toBeNull();
    const ev = until(w, (e) => e.some((x) => x.type === 'fishCast'));
    expect(ev.some((e) => e.type === 'fishCast')).toBe(true);
    expect(Math.hypot(w.player.pos.x - 40, w.player.pos.y - 40) - 6).toBeLessThanOrEqual(6.05);
    w.commandMove({ x: 40, y: 70 });
    expect(w.fishing).toBeNull();
    expect(w.drainEvents()).toContainEqual({ type: 'fishStop' });
  });

  it('un clic fuera del agua no es una orden de pesca', () => {
    const { w } = pond();
    expect(w.commandFish({ x: 10, y: 10 })).toBe(false);
    expect(w.fishing).toBeNull();
  });
});
