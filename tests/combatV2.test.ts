// Combate v2 (respuestas del creador): sin armadura ni evasión genérica;
// desplazamientos de clase, defensas como estados, hechizos de un objetivo
// teledirigidos, áreas con fuego amigo, cargas del ataque básico, lanzar
// andando y vista previa del daño.
import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { dist } from '../src/sim/vec2';
import { World, type Missile } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function arena(classId = 'storm_weaver', data: GameData = loadGameData()): { w: World; s: GameSession } {
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

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });
const damageTo = (ev: GameEvent[], id: number) => ev.filter((e): e is Extract<GameEvent, { type: 'damage' }> => e.type === 'damage' && e.targetId === id);
const still = (e: { state: string; stateTime: number }) => {
  e.state = 'stagger';
  e.stateTime = -1e9;
};
const ready = (w: World) => {
  w.player.cooldowns = {};
  w.player.gcd = 0;
  w.player.resource = w.player.maxResource;
};

describe('desplazamientos de clase (sin evasión genérica)', () => {
  it('ya no existe la evasión: ni orden, ni datos, ni atajo', () => {
    const { w } = arena();
    expect((w as unknown as Record<string, unknown>)['commandEvade']).toBeUndefined();
    expect((w.data.player as unknown as Record<string, unknown>)['evade']).toBeUndefined();
  });

  it('blink: aparece en el punto apuntado, como mucho a maxDistance, aunque haya un muro en medio', () => {
    const { w } = arena();
    w.context(w.character, 'test', { x: 30, y: 10 }, 0).blink(8);
    expect(w.player.pos.x).toBeCloseTo(18, 5);
    expect(w.player.pos.y).toBeCloseTo(10, 5);
    // Muro en x = 19..21 (y ≈ 20): el blink lo salta.
    w.player.pos = { x: 17, y: 20 };
    w.context(w.character, 'test', { x: 23, y: 20 }, 0).blink(8);
    expect(w.player.pos.x).toBeGreaterThan(21);
    expect(w.grid.walkable(w.player.pos)).toBe(true);
  });

  it('blink a una celda bloqueada cae en la celda libre más cercana', () => {
    const { w } = arena();
    w.player.pos = { x: 17, y: 20 };
    w.context(w.character, 'test', { x: 20, y: 20 }, 0).blink(8);
    expect(w.grid.walkable(w.player.pos)).toBe(true);
    expect(dist(w.player.pos, { x: 20, y: 20 })).toBeLessThan(2);
  });

  it('Transposición: lanzador y objetivo cambian el sitio', () => {
    const { w } = arena();
    prepareSpells(w.character, 'storm_swap');
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    still(e);
    expect(w.commandCast('storm_swap', aim(15, 10, e.id))).toBeNull();
    expect(w.player.pos).toEqual({ x: 15, y: 10 });
    expect(e.pos).toEqual({ x: 10, y: 10 });
    expect(w.enemyActor(e).statuses.has('chilled')).toBe(true);
  });

  it('Cadena de brasa: atrae al objetivo hasta tocar al lanzador', () => {
    const { w } = arena('ember_vanguard');
    prepareSpells(w.character, 'ember_chain');
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    still(e);
    expect(w.commandCast('ember_chain', aim(16, 10, e.id))).toBeNull();
    const ev = run(w, 0.5);
    expect(damageTo(ev, e.id)).toHaveLength(1);
    const gap = dist(e.pos, w.player.pos) - e.radius - w.player.radius;
    expect(gap).toBeLessThan(0.2);
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  it('Repliegue helado: golpea delante y el lanzador salta hacia atrás (lejos del cursor)', () => {
    const { w } = arena();
    prepareSpells(w.character, 'frost_recoil');
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    still(e);
    expect(w.commandCast('frost_recoil', aim(14, 10))).toBeNull();
    expect(damageTo(w.drainEvents(), e.id)).toHaveLength(1);
    expect(w.player.pos.x).toBeCloseTo(5, 1);
  });

  it('empujar (Ráfaga) aparta al enemigo', () => {
    const { w } = arena();
    prepareSpells(w.character, 'gust');
    w.character.spellbook.learn('gust');
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    still(e);
    w.commandCast('gust', aim(14, 10));
    expect(e.pos.x).toBeGreaterThan(14);
  });
});

describe('defensas como estados', () => {
  it('inmunidad (Égida quieta): sin daño, sin perjuicios y sin desplazamientos ajenos', () => {
    const { w } = arena();
    prepareSpells(w.character, 'still_aegis');
    w.character.spellbook.learn('still_aegis');
    expect(w.commandCast('still_aegis', aim(10, 10))).toBeNull();
    expect(w.isImmune(w.character)).toBe(true);
    const hp = w.player.health;
    const e = w.spawnEnemy('melee', { x: 11.2, y: 10 });
    e.spellCooldowns = e.spellCooldowns.map(() => 99);
    const ev = run(w, 1.9);
    expect(w.player.health).toBe(hp);
    expect(ev.some((x) => x.type === 'immune' && x.targetId === w.player.id)).toBe(true);
    expect(w.character.statuses.has('chilled')).toBe(false);
    // Y no se le puede mover.
    w.context(w.enemyActor(e), 'test', { x: 10, y: 10 }, 0).knockback(w.character, { x: 11, y: 10 }, 3);
    expect(w.player.pos.x).toBeCloseTo(10, 5);
  });

  it('un enemigo inmune no se intercambia ni recibe daño', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    still(e);
    w.enemyActor(e).statuses.apply(w.content.statuses['still_aegis']!);
    w.commandCast('storm_swap', aim(15, 10, e.id));
    expect(e.pos).toEqual({ x: 15, y: 10 });
    ready(w);
    w.commandCast('spark', aim(15, 10, e.id));
    expect(damageTo(run(w, 1), e.id)).toHaveLength(0);
  });

  it('reenvío: un hechizo de un objetivo contra quien tiene Espejo vuelve al lanzador', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    still(e);
    w.enemyActor(e).statuses.apply(w.content.statuses['storm_mirror']!);
    expect(w.commandCast('spark', aim(15, 10, e.id))).toBeNull();
    const ev = run(w, 1);
    expect(ev.some((x) => x.type === 'reflect' && x.fromId === e.id && x.toId === w.player.id)).toBe(true);
    expect(damageTo(ev, e.id)).toHaveLength(0);
    expect(damageTo(ev, w.player.id)).toHaveLength(1);
  });

  it('reenvío: el ataque básico y las áreas no se reenvían', () => {
    const { w } = arena('ember_vanguard');
    const e = w.spawnEnemy('melee', { x: 11.6, y: 10 });
    still(e);
    w.enemyActor(e).statuses.apply(w.content.statuses['storm_mirror']!);
    w.commandCast('basic', aim(11.6, 10, e.id));
    w.commandCast('ember_whirl', aim(11.6, 10));
    const ev = run(w, 0.5);
    expect(damageTo(ev, e.id).length).toBeGreaterThanOrEqual(2);
    expect(ev.some((x) => x.type === 'reflect')).toBe(false);
  });

  it('reenvío del jugador: la flecha rastreadora vuelve al arquero', () => {
    const { w } = arena();
    prepareSpells(w.character, 'storm_mirror');
    w.commandCast('storm_mirror', aim(10, 10));
    const e = w.spawnEnemy('goblin_veteran', { x: 18, y: 10 });
    still(e);
    const at = e.def.spells.find((x) => x.homing)!;
    expect(at).toBeDefined();
    const hp = w.player.health;
    (w as unknown as { launchHoming(e: unknown, at: unknown): void }).launchHoming(e, at);
    const ev = run(w, 2);
    expect(w.player.health).toBe(hp);
    expect(ev.some((x) => x.type === 'reflect' && x.fromId === w.player.id && x.toId === e.id)).toBe(true);
    expect(damageTo(ev, e.id)).toHaveLength(1);
  });

  it('contra (Represalia): devuelve parte del golpe cuerpo a cuerpo', () => {
    const { w } = arena('ember_vanguard');
    prepareSpells(w.character, 'retaliation');
    expect(w.commandCast('retaliation', aim(10, 10))).toBeNull();
    const e = w.spawnEnemy('melee', { x: 11.2, y: 10 });
    e.spellCooldowns = e.spellCooldowns.map(() => 99);
    const ev = run(w, 3);
    const taken = damageTo(ev, w.player.id).filter((x) => x.sourceId === e.id);
    const back = damageTo(ev, e.id).filter((x) => x.ability === 'status:retaliation');
    expect(taken.length).toBeGreaterThan(0);
    expect(back).toHaveLength(taken.length);
    expect(ev.filter((x) => x.type === 'counter')).toHaveLength(taken.length);
    for (let i = 0; i < back.length; i++) expect(back[i]!.amount).toBeLessThanOrEqual(Math.max(1, Math.floor(taken[i]!.amount * 0.6)));
  });

  it('contra: un golpe a distancia no se devuelve', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 18, y: 10 });
    still(e);
    w.enemyActor(e).statuses.apply(w.content.statuses['retaliation']!);
    w.commandCast('spark', aim(18, 10, e.id));
    const ev = run(w, 1);
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(ev.some((x) => x.type === 'counter')).toBe(false);
  });

  it('retroceso (Eco del instante): al acabarse vuelve a la posición y la vida de entonces', () => {
    const { w } = arena();
    prepareSpells(w.character, 'time_echo');
    w.character.spellbook.learn('time_echo');
    const hp = w.player.health;
    expect(w.commandCast('time_echo', aim(10, 10))).toBeNull();
    w.player.pos = { x: 14, y: 12 };
    w.player.health = Math.floor(hp / 3);
    run(w, 3.5);
    expect(w.player.pos).toEqual({ x: 14, y: 12 });
    const ev = run(w, 0.7);
    expect(ev.some((x) => x.type === 'rewind' && x.targetId === w.player.id)).toBe(true);
    expect(w.player.pos).toEqual({ x: 10, y: 10 });
    expect(w.player.health).toBeGreaterThanOrEqual(hp - 2); // + la regeneración de esos segundos
  });

  it('retroceso: muerto antes de acabarse, no revive', () => {
    const { w } = arena();
    w.character.spellbook.learn('time_echo');
    w.commandCast('time_echo', aim(10, 10));
    w.player.health = 0;
    run(w, 5);
    expect(w.player.alive).toBe(false);
  });
});

describe('hechizos de un objetivo: teledirigidos', () => {
  it('el proyectil persigue al objetivo y le da aunque se aleje fuera del alcance', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 18, y: 10 });
    still(e);
    expect(w.commandCast('spark', aim(18, 10, e.id))).toBeNull();
    expect(w.missiles).toHaveLength(1);
    w.tick(DT);
    e.pos = { x: 10, y: 24 }; // se va lejos y a un lado
    const ev = run(w, 2);
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(w.missiles).toHaveLength(0);
  });

  it('el golpe llega cuando el proyectil alcanza al objetivo (no al lanzar)', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 18, y: 10 });
    still(e);
    w.commandCast('spark', aim(18, 10, e.id));
    expect(damageTo(w.drainEvents(), e.id)).toHaveLength(0);
    const m = w.missiles[0] as Missile;
    expect(m.target).toBe(w.enemyActor(e));
    expect(damageTo(run(w, 0.5), e.id)).toHaveLength(1);
  });

  it('si el objetivo muere antes, el proyectil se pierde', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 18, y: 10 });
    still(e);
    w.commandCast('spark', aim(18, 10, e.id));
    e.health = 0;
    e.state = 'dead';
    run(w, 1);
    expect(w.missiles).toHaveLength(0);
  });

  it('la flecha rastreadora del enemigo no se esquiva andando', () => {
    const { w } = arena();
    const e = w.spawnEnemy('goblin_veteran', { x: 18, y: 10 });
    still(e);
    const at = e.def.spells.find((x) => x.homing)!;
    const hp = w.player.health;
    (w as unknown as { launchHoming(e: unknown, at: unknown): void }).launchHoming(e, at);
    w.commandMove({ x: 4, y: 4 });
    run(w, 2);
    expect(w.player.health).toBeLessThan(hp);
  });
});

describe('áreas: fuego amigo por hechizo', () => {
  function withPet(): { w: World; s: GameSession; pet: World['pets'][number] } {
    const { w, s } = arena();
    s.useItem(s.character.inventory.slots.find((x) => x?.itemId === 'charm_ash_fox')!.uid);
    w.tick(DT);
    const pet = w.pets[0]!;
    pet.pos = { x: 12, y: 10 };
    return { w, s, pet };
  }

  it('Lanza glacial (friendlyFire) alcanza a enemigos y a la mascota en la línea, no al lanzador', () => {
    const { w, pet } = withPet();
    prepareSpells(w.character, 'glacial_lance');
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    still(e);
    expect(w.commandCast('glacial_lance', aim(20, 10))).toBeNull();
    const ev = w.drainEvents();
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(damageTo(ev, pet.id)).toHaveLength(1);
    expect(damageTo(ev, w.player.id)).toHaveLength(0);
    expect(pet.health).toBeLessThan(pet.maxHealth);
  });

  it('Nova de escarcha (sin friendlyFire) no toca a la mascota', () => {
    const { w, pet } = withPet();
    const e = w.spawnEnemy('melee', { x: 12, y: 11 });
    still(e);
    w.commandCast('frost_nova', aim(10, 10));
    const ev = w.drainEvents();
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(damageTo(ev, pet.id)).toHaveLength(0);
  });

  it('Campo estático (zona con friendlyFire) también daña a la mascota que se queda dentro', () => {
    const { w, pet } = withPet();
    prepareSpells(w.character, 'static_field');
    expect(w.commandCast('static_field', aim(14, 10))).toBeNull();
    let hits = 0;
    for (let i = 0; i < 120; i++) {
      pet.pos = { x: 14, y: 10 };
      w.tick(DT);
      hits += damageTo(w.drainEvents(), pet.id).length;
    }
    expect(hits).toBeGreaterThanOrEqual(1);
  });

  it('la mascota del amuleto que muere por fuego amigo vuelve tras petRespawnSeconds', () => {
    const { w, pet } = withPet();
    pet.health = 0;
    w.tick(DT);
    expect(w.pets.some((p) => p.itemUid !== null)).toBe(false);
    run(w, w.data.player.petRespawnSeconds + 0.1);
    expect(w.pets.some((p) => p.itemUid !== null)).toBe(true);
  });
});

describe('ataque básico con cargas', () => {
  it('gasta una carga por golpe, sin cargas se bloquea y vuelven de una en una', () => {
    const { w } = arena('ember_vanguard');
    const b = w.data.player.basicAttack;
    const e = w.spawnEnemy('melee', { x: 11.6, y: 10 });
    still(e);
    e.health = 1e9;
    expect(w.player.basicCharges).toBe(b.charges);
    for (let i = 0; i < b.charges; i++) {
      w.player.cooldowns = {};
      expect(w.commandCast('basic', aim(11.6, 10, e.id))).toBeNull();
    }
    w.player.cooldowns = {};
    expect(w.player.basicCharges).toBe(0);
    expect(w.commandCast('basic', aim(11.6, 10, e.id))).toBe('charges');
    run(w, b.rechargeSeconds + 0.05);
    expect(w.player.basicCharges).toBe(1);
    run(w, b.rechargeSeconds * (b.charges - 1) + 0.05);
    expect(w.player.basicCharges).toBe(b.charges);
  });
});

describe('lanzar andando (castWhileMoving)', () => {
  it('un hechizo que lo permite no para al jugador; uno que no, sí', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    still(e);
    w.commandMove({ x: 10, y: 4 });
    expect(w.commandCast('spark', aim(16, 10, e.id))).toBeNull();
    expect(w.player.path.length).toBeGreaterThan(0);
    run(w, 0.2);
    expect(w.player.pos.y).toBeLessThan(10);
    ready(w);
    w.commandMove({ x: 10, y: 16 });
    expect(w.commandCast('frost_nova', aim(10, 10))).toBeNull();
    expect(w.player.path).toHaveLength(0);
  });

  it('con tiempo de carga: se carga andando y moverse no lo cancela', () => {
    const data = loadGameData();
    data.rpg.spells['spark']!.castTime = 0.5;
    const { w } = arena('storm_weaver', data);
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    still(e);
    w.commandCast('spark', aim(16, 10, e.id));
    expect(w.player.casting).not.toBeNull();
    w.commandMove({ x: 10, y: 4 });
    expect(w.player.casting).not.toBeNull();
    const ev = run(w, 1.2);
    expect(w.player.pos.y).toBeLessThan(9);
    expect(damageTo(ev, e.id)).toHaveLength(1);
  });
});

describe('vista previa del daño', () => {
  it('la horquilla contiene todos los golpes reales (normal y crítico) tras resistencias', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    still(e);
    e.health = 1e9;
    const p = w.previewDamage('spark', e.id)!;
    expect(p.min).toBeGreaterThan(0);
    expect(p.max).toBeGreaterThanOrEqual(p.min);
    expect(p.critMin).toBeGreaterThanOrEqual(p.min);
    expect(p.immune).toBe(false);
    for (let i = 0; i < 80; i++) {
      ready(w);
      w.commandCast('spark', aim(15, 10, e.id));
      for (const d of damageTo(run(w, 0.4), e.id)) {
        if (d.crit) {
          expect(d.amount).toBeGreaterThanOrEqual(p.critMin);
          expect(d.amount).toBeLessThanOrEqual(p.critMax);
        } else {
          expect(d.amount).toBeGreaterThanOrEqual(p.min);
          expect(d.amount).toBeLessThanOrEqual(p.max);
        }
      }
    }
  });

  it('baja con la resistencia del objetivo y avisa si es inmune; null sin daño directo', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    const before = w.previewDamage('spark', e.id)!;
    w.enemyActor(e).stats.set('test', [{ stat: 'resist.storm', op: 'flat', value: 50 }]);
    const after = w.previewDamage('spark', e.id)!;
    expect(after.max).toBeLessThan(before.max);
    w.enemyActor(e).statuses.apply(w.content.statuses['still_aegis']!);
    expect(w.previewDamage('spark', e.id)!.immune).toBe(true);
    expect(w.previewDamage('storm_mirror', e.id)).toBeNull();
    expect(w.previewDamage('spark', null)).toBeNull();
  });
});
