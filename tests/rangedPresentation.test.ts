import { NullEngine, Scene } from '@babylonjs/core';
import { describe, expect, it, vi } from 'vitest';
import { loadGameData } from '../src/data';
import { loadFx } from '../src/data/fxSchema';
import { SpellFx } from '../src/render/fx/spellFx';
import { RpgSessionFactory } from '../src/rpg/session';
import { World } from '../src/sim/world';
import type { GameEvent } from '../src/sim/events';
import { HeightField } from '../src/world/terrain';
import { reachLevel } from './levels';

// NullEngine permite probar geometría y trayectorias sin ventana.
// Solo las partículas (que requieren canvas) se sustituyen por emisores inertes.
vi.mock('../src/render/fx/particles', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/render/fx/particles')>();
  return {
    ...original,
    BurstPool: class { burst(): void {} },
    trail: () => ({ emitter: null }),
    retire: () => {},
  };
});

function arena() {
  const w = new World(loadGameData(), { encounter: false });
  reachLevel(w.character, 6);
  w.character.give('cane_crossbow');
  const uid = w.character.inventory.slots.find((s) => s?.itemId === 'cane_crossbow')!.uid;
  expect(w.character.equip(uid).ok).toBe(true);
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  const a = w.spawnEnemy('melee', { x: 18, y: 10 });
  const b = w.spawnEnemy('melee', { x: 10, y: 18 });
  for (const e of [a, b]) { e.state = 'stagger'; e.stateTime = -1e9; e.health = 10000; }
  return { w, a, b };
}

describe('ballesta: presentación de disparos acumulados', () => {
  it('la ballesta de nivel 6 conserva arma y ataque tras guardar/cargar una sesión real', () => {
    const data = loadGameData();
    const factory = new RpgSessionFactory(data.rpg);
    const session = factory.newGame('ember_vanguard', 'Ballestera', 41);
    session.character.give('cane_crossbow');
    const uid = session.character.inventory.slots.find((s) => s?.itemId === 'cane_crossbow')!.uid;
    expect(session.equip(uid).ok).toBe(false); // no elude el requisito de nivel
    reachLevel(session.character, 6);
    expect(session.equip(uid).ok).toBe(true);
    const loaded = factory.load(JSON.parse(JSON.stringify(session.save())), 42);
    expect(loaded.character.weapon()?.id).toBe('cane_crossbow');
    expect(loaded.equipment()).toEqual(session.equipment());
    const world = new World(data, { encounter: false, character: loaded.character });
    expect(world.basicAttack().range).toBe(data.rpg.items['cane_crossbow']!.weapon!.range);
    expect(world.basicAttack().projectileSpeed).toBeGreaterThan(0);
  });

  it.each([
    { name: 'suceso antiguo', target: undefined, count: 1 },
    { name: 'objetivo explícitamente nulo', target: null, count: 0 },
  ])('respeta compatibilidad y ausencia de objetivo: $name', ({ target, count }) => {
    const { w, a } = arena();
    w.player.lastTarget = a.id;
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const ground = new HeightField(80, 80, 1, new Float32Array(81 * 81));
      const fx = new SpellFx(scene, loadFx(), ground, () => null, (v) => v.set(10, 1, 10));
      const event: GameEvent = { type: 'cast', ability: 'basic', ...(target === undefined ? {} : { targetId: target }) };
      fx.handleEvents(w, [event]);
      expect(scene.meshes.filter((m) => m.name === 'fxBolt')).toHaveLength(count);
    } finally { scene.dispose(); engine.dispose(); }
  });

  it('cada proyectil visual conserva el objetivo de su disparo aunque cambie la selección', () => {
    const { w, a, b } = arena();
    w.commandAttack(a.id);
    w.tick(1 / 60);
    // Se acumulan dos lanzamientos antes del siguiente fotograma de presentación.
    w.player.cooldowns = {};
    w.commandAttack(b.id);
    w.tick(1 / 60);
    expect(w.player.lastTarget).toBe(b.id);
    expect(w.missiles).toHaveLength(2);
    const events = w.drainEvents();
    expect(events.filter((e) => e.type === 'cast').map((e) => e.targetId)).toEqual([a.id, b.id]);
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const ground = new HeightField(80, 80, 1, new Float32Array(81 * 81));
      const fx = new SpellFx(scene, loadFx(), ground, () => null, (v) => v.set(10, 1, 10));
      fx.showRange = false;
      fx.handleEvents(w, events);
      fx.sync(w, 0.05);
      const bolts = scene.meshes.filter((m) => m.name === 'fxBolt');
      expect(bolts).toHaveLength(2);
      expect(bolts[0]!.position.x).toBeGreaterThan(10);
      expect(bolts[0]!.position.z).toBeCloseTo(10);
      expect(bolts[1]!.position.x).toBeCloseTo(10);
      expect(bolts[1]!.position.z).toBeGreaterThan(10);
    } finally { scene.dispose(); engine.dispose(); }
  });

  it('el básico consume carga, respeta el coste en datos y su daño llega después del lanzamiento', () => {
    const { w, a } = arena();
    const resource = w.player.resource;
    const charges = w.player.basicCharges;
    const health = a.health;
    const start = { ...w.player.pos };
    w.commandAttack(a.id);
    w.tick(1 / 60);
    expect(w.player.pos).toEqual(start);
    expect(w.player.basicCharges).toBe(charges - 1);
    expect(w.player.resource).toBe(resource - w.data.player.basicAttack.resourceCost);
    expect(a.health).toBe(health);
    expect(w.missiles).toHaveLength(1);
    for (let i = 0; i < 60 && a.health === health; i++) w.tick(1 / 60);
    expect(a.health).toBeLessThan(health);
    expect(w.drainEvents().some((e) => e.type === 'damage' && e.targetId === a.id)).toBe(true);
  });
});
