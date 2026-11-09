// Ataque básico automático (decisión del creador, 2026-11-09): un clic sigue golpeando al
// objetivo, limitado por el enfriamiento del arma, las cargas y el recurso. Configurable en
// data/player.json y apagado hasta validar valores: hoy un clic sigue siendo un golpe.
import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import type { BasicAttackDef } from '../src/data/schema';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

const DT = 1 / 60;
const base = loadGameData();

function withBasic(over: Partial<BasicAttackDef>): GameData {
  return { ...base, player: { ...base.player, basicAttack: { ...base.player.basicAttack, ...over } } };
}

function arena(data: GameData, classId = 'ember_vanguard'): { w: World; s: GameSession } {
  const rng = new Rng(1);
  const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed: 1 });
  s.attach(w);
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return { w, s };
}

function run(w: World, seconds: number): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.tick(DT);
    out.push(...w.drainEvents());
  }
  return out;
}

/** Enemigo quieto y sin morir: no se mueve ni ataca. */
function dummy(w: World, x = 11.6, y = 10, health = 1e9) {
  const e = w.spawnEnemy('melee', { x, y });
  e.state = 'stagger';
  e.stateTime = -1e9;
  e.health = health;
  return e;
}

const basicHits = (ev: GameEvent[]) => ev.filter((e) => e.type === 'cast' && e.ability === 'basic');
const blocked = (ev: GameEvent[], reason: string) => ev.some((e) => e.type === 'castBlocked' && e.ability === 'basic' && e.reason === reason);

describe('ataque básico automático: datos', () => {
  it('apagado y sin coste en los datos actuales (A: un clic = un golpe)', () => {
    const b = base.player.basicAttack;
    expect(b.autoRepeat).toBe(false);
    expect(b.resourceCost).toBe(0);
    expect(b.classCost).toEqual({});
  });

  it('A: un clic da un golpe y suelta el objetivo', () => {
    const { w } = arena(base);
    const e = dummy(w);
    w.commandAttack(e.id);
    const ev = run(w, 5);
    expect(basicHits(ev)).toHaveLength(1);
    expect(w.player.attackTarget).toBeNull();
  });
});

describe('ataque básico automático: B (cargas y enfriamiento)', () => {
  const data = withBasic({ autoRepeat: true });

  it('un clic sigue golpeando al ritmo del arma y de las cargas', () => {
    const { w } = arena(data);
    const b = data.player.basicAttack;
    const e = dummy(w);
    w.commandAttack(e.id);
    const ev = run(w, 6);
    const hits = basicHits(ev).length;
    // Más que la ráfaga de cargas, y nunca más de lo que las cargas devuelven.
    expect(hits).toBeGreaterThan(b.charges);
    expect(hits).toBeLessThanOrEqual(b.charges + Math.ceil(6 / b.rechargeSeconds));
    expect(w.player.attackTarget).toBe(e.id);
  });

  it('al morir el objetivo no elige otro, aunque haya uno al lado', () => {
    const { w } = arena(data);
    const e = dummy(w, 11.6, 10, 1);
    const other = dummy(w, 10, 11.6);
    w.commandAttack(e.id);
    run(w, 1);
    expect(e.state).toBe('dead');
    const ev = run(w, 4);
    expect(basicHits(ev)).toHaveLength(0);
    expect(w.player.attackTarget).toBeNull();
    expect(other.health).toBe(1e9);
  });

  it('un hechizo interrumpe el ataque automático', () => {
    const { w } = arena(data);
    const e = dummy(w);
    w.commandAttack(e.id);
    run(w, 0.5);
    w.player.gcd = 0;
    w.player.resource = w.player.maxResource;
    const spell = w.character.spellbook.hotbar.find((id): id is string => !!id);
    expect(spell).toBeTruthy();
    expect(w.commandCast(spell!, { point: { ...e.pos }, targetId: e.id })).toBeNull();
    expect(w.player.attackTarget).toBeNull();
    const ev = run(w, 4);
    expect(basicHits(ev)).toHaveLength(0);
  });

  it('moverse a mano lo cancela', () => {
    const { w } = arena(data);
    const e = dummy(w);
    w.commandAttack(e.id);
    run(w, 0.3);
    w.commandMove({ x: 4, y: 10 });
    expect(w.player.attackTarget).toBeNull();
    expect(basicHits(run(w, 3))).toHaveLength(0);
  });

  it('cambiar de objetivo golpea al nuevo', () => {
    const { w } = arena(data);
    const a = dummy(w);
    const b = dummy(w, 10, 11.6);
    w.commandAttack(a.id);
    run(w, 0.3);
    w.commandAttack(b.id);
    const ev = run(w, 3);
    const hits = basicHits(ev) as Extract<GameEvent, { type: 'cast' }>[];
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.targetId === b.id)).toBe(true);
  });
});

describe('ataque básico automático: C (con coste de recurso)', () => {
  it('sin recurso para otro golpe se detiene: no golpea gratis ni sigue esperando', () => {
    const data = withBasic({ autoRepeat: true, resourceCost: 50 });
    const { w } = arena(data);
    const e = dummy(w);
    w.player.resource = 60;
    w.commandAttack(e.id);
    const ev = run(w, 3);
    // 60 de Vigor pagan un golpe de 50; el segundo no sale aunque queden cargas, y no espera a regenerar.
    expect(basicHits(ev)).toHaveLength(1);
    expect(w.player.attackTarget).toBeNull();
    expect(blocked(ev, 'resource')).toBe(true);
    expect(w.player.resource).toBeGreaterThanOrEqual(0);
  });

  it('sin recurso no persigue a un objetivo lejano', () => {
    const data = withBasic({ autoRepeat: true, resourceCost: 25 });
    const { w } = arena(data);
    const e = dummy(w, 30, 10);
    w.player.resource = 10;
    w.commandAttack(e.id);
    run(w, 0.2);
    expect(w.player.attackTarget).toBeNull();
    expect(w.player.path).toHaveLength(0);
  });

  it('también con un clic = un golpe: sin recurso no se queda esperando', () => {
    const data = withBasic({ resourceCost: 25 });
    const { w } = arena(data);
    const e = dummy(w);
    w.player.resource = 10;
    w.commandAttack(e.id);
    const ev = run(w, 0.2);
    expect(basicHits(ev)).toHaveLength(0);
    expect(w.player.attackTarget).toBeNull();
  });

  it('el coste puede ser distinto por clase', () => {
    const data = withBasic({ resourceCost: 3, classCost: { mangrove_hunter: 11 } });
    expect(arena(data, 'mangrove_hunter').w.basicAttack().cost).toBe(11);
    expect(arena(data, 'ember_vanguard').w.basicAttack().cost).toBe(3);
  });
});
