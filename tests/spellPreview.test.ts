// La vista previa de un hechizo (daño y a dónde cae cada cuerpo) debe coincidir
// con lo que pasa de verdad al lanzarlo, y no debe cambiar nada del mundo.
import { describe, expect, it } from 'vitest';
import { healthSegments } from '../src/ui/aimCards';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function arena(classId: string, spell: string): { w: World; s: GameSession } {
  const data = loadGameData();
  const rng = new Rng(1);
  const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed: 1 });
  s.attach(w);
  prepareSpells(s.character, spell);
  w.player.pos = { x: 30, y: 30 };
  w.player.prevPos = { x: 30, y: 30 };
  return { w, s };
}

const hold = (e: { state: string; stateTime: number; health: number }): void => {
  e.state = 'stagger';
  e.stateTime = -1e9;
  e.health = 1e6;
};

/** Lanza y deja pasar el tiempo justo para que lleguen los efectos. */
function castNow(w: World, spell: string, aim: { point: { x: number; y: number }; targetId: number | null }): void {
  expect(w.commandCast(spell, aim)).toBeNull();
  for (let i = 0; i < 90; i++) w.tick(DT);
}

const near = (a: { x: number; y: number }, b: { x: number; y: number }, eps = 0.05): void => {
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(eps);
};

describe('vista previa de hechizos', () => {
  it('blink: el lanzador cae donde dice la previa', () => {
    const { w } = arena('storm_weaver', 'lightning_step');
    const aim = { point: { x: 35, y: 33 }, targetId: null };
    const pv = w.previewSpell('lightning_step', aim);
    expect(pv.inRange).toBe(true);
    castNow(w, 'lightning_step', aim);
    near(w.player.pos, pv.casterTo!);
  });

  it('intercambio: lanzador y objetivo cambian como dice la previa', () => {
    const { w } = arena('storm_weaver', 'storm_swap');
    const e = w.spawnEnemy('melee', { x: 34, y: 30 });
    hold(e);
    const aim = { point: { ...e.pos }, targetId: e.id };
    const pv = w.previewSpell('storm_swap', aim);
    expect(pv.targets).toHaveLength(1);
    const from = { ...w.player.pos };
    near(pv.casterTo!, e.pos);
    near(pv.targets[0]!.to!, from);
    const want = { me: pv.casterTo!, it: pv.targets[0]!.to! };
    castNow(w, 'storm_swap', aim);
    near(w.player.pos, want.me);
    near(e.pos, want.it);
  });

  it('carga: se ve el daño, el empujón y el destino del lanzador', () => {
    const { w } = arena('ember_vanguard', 'charge');
    const e = w.spawnEnemy('melee', { x: 33, y: 30 });
    hold(e);
    const aim = { point: { x: 40, y: 30 }, targetId: null };
    const pv = w.previewSpell('charge', aim);
    const t = pv.targets.find((x) => x.id === e.id)!;
    expect(t.damage!.max).toBeGreaterThan(0);
    expect(t.to!.x).toBeGreaterThan(e.pos.x);
    const want = { me: pv.casterTo!, it: t.to! };
    castNow(w, 'charge', aim);
    near(w.player.pos, want.me, 0.15);
    near(e.pos, want.it, 0.15);
  });

  it('retroceso y atracción: los destinos coinciden', () => {
    const a = arena('ember_vanguard', 'frost_recoil');
    const aim = { point: { x: 34, y: 30 }, targetId: null };
    const pv = a.w.previewSpell('frost_recoil', aim);
    castNow(a.w, 'frost_recoil', aim);
    near(a.w.player.pos, pv.casterTo!, 0.15);

    const b = arena('ember_vanguard', 'ember_chain');
    const e = b.w.spawnEnemy('melee', { x: 35, y: 30 });
    hold(e);
    const aimB = { point: { ...e.pos }, targetId: e.id };
    const pvB = b.w.previewSpell('ember_chain', aimB);
    const want = pvB.targets[0]!.to!;
    castNow(b.w, 'ember_chain', aimB);
    near(e.pos, want, 0.15);
  });

  it('no toca nada: ni posiciones, ni vida, ni enfriamientos', () => {
    const { w } = arena('storm_weaver', 'storm_swap');
    const e = w.spawnEnemy('melee', { x: 34, y: 30 });
    hold(e);
    const before = JSON.stringify([w.player.pos, e.pos, e.health, w.player.cooldowns, w.player.resource]);
    w.drainEvents();
    w.previewSpell('storm_swap', { point: { ...e.pos }, targetId: e.id });
    expect(JSON.stringify([w.player.pos, e.pos, e.health, w.player.cooldowns, w.player.resource])).toBe(before);
    expect(w.drainEvents()).toEqual([]);
  });

  it('fuera de alcance se avisa', () => {
    const { w } = arena('storm_weaver', 'lightning_step');
    expect(w.previewSpell('lightning_step', { point: { x: 60, y: 60 }, targetId: null }).inRange).toBe(false);
  });
});

describe('barra de vida de la ficha', () => {
  it('reparte lo seguro, lo posible y lo que se pierde seguro', () => {
    expect(healthSegments({ value: 100, max: 100, lostMin: 20, lostMax: 30 })).toEqual({ safe: 70, maybe: 10, sure: 20 });
    expect(healthSegments({ value: 10, max: 100, lostMin: 20, lostMax: 30 })).toEqual({ safe: 0, maybe: 0, sure: 10 });
    expect(healthSegments({ value: 50, max: 100, lostMin: 0, lostMax: 0 })).toEqual({ safe: 50, maybe: 0, sure: 0 });
  });
});
