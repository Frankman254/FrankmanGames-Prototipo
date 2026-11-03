import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../../src/data';
import { loadWorldData } from '../../src/data/worldData';
import { Character } from '../../src/rpg/character';
import { GameSession } from '../../src/rpg/session';
import type { GameEvent } from '../../src/sim/events';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { waterPointAlongRay } from '../../src/render/waterView';

const DT = 1 / 60;

/** Arena de 80 m con el estanque traído a (40, 40), radio 6. */
function pond(seed = 1, withShoals = false): { w: World; s: GameSession; data: GameData } {
  const data = loadGameData();
  const spot = { ...Object.values(data.rpg.fishing.spots)[0]!, x: 40, y: 40, radius: 6 };
  // Estas pruebas tratan la picada; los bancos de peces tienen las suyas abajo.
  const rules = { ...data.rpg.fishing.rules, shoals: withShoals ? data.rpg.fishing.rules.shoals : null };
  data.rpg = { ...data.rpg, merchants: {}, fishing: { ...data.rpg.fishing, rules, spots: { [spot.id]: spot } } };
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

describe('clic sobre el agua', () => {
  const ponds = [{ x: 40, y: 40, radius: 6, level: -1 }];

  it('el rayo corta la superficie, no el fondo: el punto es el que se ve', () => {
    // Cámara a 10 m sobre el agua, a 10 m al sur, mirando en diagonal al centro.
    const hit = waterPointAlongRay(ponds, { x: 40, y: 9, z: 30 }, { x: 0, y: -10, z: 10 })!;
    expect(hit.x).toBeCloseTo(40);
    expect(hit.y).toBeCloseTo(40);
  });

  it('fuera del agua, o mirando hacia arriba, no hay punto', () => {
    expect(waterPointAlongRay(ponds, { x: 60, y: 9, z: 30 }, { x: 0, y: -10, z: 10 })).toBeNull();
    expect(waterPointAlongRay(ponds, { x: 40, y: 9, z: 30 }, { x: 0, y: 1, z: 1 })).toBeNull();
  });
});

describe('bancos de peces', () => {
  it('los datos definen bancos y aparecen dentro del agua, sin pisarse', () => {
    const { w } = pond(1, true);
    const list = w.shoals!.list;
    expect(list.length).toBeGreaterThan(1);
    for (const s of list) {
      expect(Math.hypot(s.x - 40, s.y - 40) + s.radius).toBeLessThanOrEqual(6 * 0.8 + 1e-6);
      expect(s.charges).toBeGreaterThan(0);
    }
  });

  it('fuera de un banco no se pesca y avisa; dentro, el corcho cae en él', () => {
    const { w } = pond(1, true);
    const s = w.shoals!.list[0]!;
    const fuera = { x: 40 + 5.5, y: 40 };
    if (!w.shoals!.at(fuera)) {
      expect(w.commandFish(fuera)).toBe(true);
      expect(w.fishing).toBeNull();
      expect(w.drainEvents().some((e) => e.type === 'fishNoShoal')).toBe(true);
    }
    expect(w.commandFish({ x: s.x, y: s.y })).toBe(true);
    expect(w.fishing?.bobber).toEqual({ x: s.x, y: s.y });
    expect(w.fishing?.shoalId).toBe(s.id);
  });

  it('con la tecla va al banco más cercano', () => {
    const { w } = pond(1, true);
    expect(w.commandFish(null)).toBe(true);
    const near = w.shoals!.nearest(w.fishing!.spotId, w.player.pos)!;
    expect(w.fishing!.bobber).toEqual({ x: near.x, y: near.y });
  });

  it('cada captura gasta el banco; al agotarse se va y vuelve en otro sitio', () => {
    const { w, data } = pond(1, true);
    const rules = data.rpg.fishing.rules.shoals!;
    const s = w.shoals!.list[0]!;
    const start = { x: s.x, y: s.y };
    for (let i = 0; i < rules.charges; i++) {
      expect(w.commandFish({ x: s.x, y: s.y })).toBe(true);
      until(w, (ev) => ev.some((e) => e.type === 'fishBite'));
      w.commandFish(null);
    }
    expect(s.respawn).toBeGreaterThan(0);
    expect(w.shoals!.at(start)?.id).not.toBe(s.id);
    for (let i = 0; i < (rules.respawnSeconds + 1) / DT; i++) w.tick(DT);
    expect(s.respawn).toBe(0);
    expect(s.charges).toBe(rules.charges);
    expect(w.shoals!.at({ x: s.x, y: s.y })).not.toBeNull();
  });

  it('dos mundos con la misma semilla ponen los bancos en el mismo sitio y no alteran la picada', () => {
    const a = pond(7, true).w.shoals!.list.map((s) => [s.x, s.y]);
    const b = pond(7, true).w.shoals!.list.map((s) => [s.x, s.y]);
    expect(a).toEqual(b);
  });

  it('en escenas interiores no hay bancos', () => {
    const { data } = pond(1, true);
    const inside = new World({ ...data, zone: { ...data.zone } }, { encounter: false, interior: true });
    expect(inside.shoals).toBeNull();
  });
});

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
