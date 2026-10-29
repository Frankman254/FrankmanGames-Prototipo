import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { canCast, castBlock, slotView } from '../src/sim/combat';
import type { GameEvent } from '../src/sim/events';
import { World } from '../src/sim/world';
import { dist } from '../src/sim/vec2';

const DT = 1 / 60;

function arena(data: GameData = loadGameData()): World {
  const w = new World(data, { encounter: false });
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return w;
}

function run(w: World, seconds: number): GameEvent[] {
  for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
  return w.drainEvents();
}

const damageTo = (ev: GameEvent[], id: number) => ev.filter((e) => e.type === 'damage' && e.targetId === id);
const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

describe('puedeLanzar', () => {
  it('es exactamente recurso ≥ coste ∧ cooldown ≤ 0 ∧ GCD ≤ 0 ∧ en alcance', () => {
    for (const resource of [5, 10, 15])
      for (const cooldown of [0, -0.1, 0.5])
        for (const gcd of [0, 0.3])
          for (const inRange of [true, false]) {
            const c = { resource, cost: 10, cooldown, gcd, inRange };
            const expected = resource >= 10 && cooldown <= 0 && gcd <= 0 && inRange;
            expect(canCast(c)).toBe(expected);
            expect(castBlock(c) === null).toBe(expected);
          }
  });
});

describe('habilidades del jugador', () => {
  it('la barata gasta recurso, dispara el GCD y bloquea por falta de recurso', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    const cheap = w.ability('cheap');
    expect(w.commandCast('cheap', aim(15, 10, e.id))).toBeNull();
    expect(w.player.resource).toBe(w.player.maxResource - cheap.resourceCost);
    expect(w.player.gcd).toBeCloseTo(cheap.globalCooldown);
    // Recast inmediato: el GCD lo impide, y también al ataque básico.
    expect(w.commandCast('cheap', aim(15, 10, e.id))).toBe('gcd');
    expect(w.checkCast(w.ability('basic'), e.id)).toBe('gcd');
    w.player.resource = cheap.resourceCost - 0.01;
    w.player.gcd = 0;
    expect(w.commandCast('cheap', aim(15, 10, e.id))).toBe('resource');
    const ev = w.drainEvents();
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(ev.filter((x) => x.type === 'castBlocked').map((x) => (x as { reason: string }).reason)).toEqual(['gcd', 'resource']);
  });

  it('el recurso se regenera con el tiempo hasta el máximo', () => {
    const w = arena();
    w.player.resource = 0;
    run(w, 1);
    expect(w.player.resource).toBeCloseTo(w.data.player.resourceRegenPerSecond, 1);
    run(w, 60);
    expect(w.player.resource).toBe(w.player.maxResource);
  });

  it('la cara en cono tiene enfriamiento y golpea a los del cono, no a los de detrás', () => {
    const w = arena();
    w.player.invulnerable = 1e9; // tres enemigos pegando durante 6 s lo matarían
    const front = w.spawnEnemy('melee', { x: 12.5, y: 10.5 });
    const side = w.spawnEnemy('melee', { x: 11, y: 12.5 }); // ~68° del eje: fuera de un cono de 100°
    const back = w.spawnEnemy('melee', { x: 8, y: 10 });
    const cone = w.ability('cone');
    expect(w.commandCast('cone', aim(20, 10))).toBeNull();
    const ev = w.drainEvents();
    expect(damageTo(ev, front.id)).toHaveLength(1);
    expect(damageTo(ev, side.id)).toHaveLength(0);
    expect(damageTo(ev, back.id)).toHaveLength(0);
    expect(w.player.cooldowns['cone']).toBeCloseTo(cone.cooldown);
    run(w, cone.globalCooldown + 0.05);
    w.player.resource = w.player.maxResource;
    expect(w.commandCast('cone', aim(20, 10))).toBe('cooldown');
    run(w, cone.cooldown);
    w.player.resource = w.player.maxResource;
    expect(w.commandCast('cone', aim(20, 10))).toBeNull();
  });

  it('fuera de alcance o tras una pared no se lanza', () => {
    const w = arena();
    const cheap = w.ability('cheap');
    const far = w.spawnEnemy('melee', { x: 10 + cheap.range + 2, y: 10 });
    expect(w.commandCast('cheap', aim(0, 0, far.id))).toBe('range');
    w.player.pos = { x: 17, y: 20 };
    const hidden = w.spawnEnemy('melee', { x: 23, y: 20 }); // muro en x = 19..21
    expect(w.commandCast('cheap', aim(0, 0, hidden.id))).toBe('range');
    const w2 = arena();
    expect(w2.commandCast('cheap', aim(0, 0, null))).toBe('target');
    expect(w.player.resource).toBe(w.player.maxResource);
  });

  it('nunca falla: cada lanzamiento en alcance hace al menos el daño mínimo', () => {
    const w = arena();
    const basic = w.ability('basic');
    let hits = 0;
    for (let i = 0; i < 300; i++) {
      const e = w.spawnEnemy('melee', { x: 11.5, y: 10 });
      e.health = 1e9;
      w.player.cooldowns = {};
      w.player.gcd = 0;
      expect(w.commandCast('basic', aim(0, 0, e.id))).toBeNull();
      for (const d of damageTo(w.drainEvents(), e.id)) {
        expect((d as { amount: number }).amount).toBeGreaterThanOrEqual(basic.damageMin);
        hits++;
      }
      w.enemies.list.length = 0;
    }
    expect(hits).toBe(300);
  });
});

describe('clic sobre un enemigo', () => {
  it('se acerca, da un ataque básico y se para', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    e.state = 'stagger'; // quieto durante la prueba
    e.stateTime = -100;
    w.commandAttack(e.id);
    const ev = run(w, 2);
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(ev.filter((x) => x.type === 'cast' && x.ability === 'basic')).toHaveLength(1);
    expect(dist(w.player.pos, e.pos) - w.player.radius - e.radius).toBeLessThanOrEqual(w.ability('basic').range + 1e-6);
    expect(w.player.attackTarget).toBeNull();
    expect(w.player.lastTarget).toBe(e.id);
  });

  it('una orden de moverse cancela el ataque pendiente', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    w.commandAttack(e.id);
    run(w, 0.1);
    w.commandMove({ x: 4, y: 4 });
    expect(damageTo(run(w, 2), e.id)).toHaveLength(0);
  });
});

describe('evasión', () => {
  it('desplaza la distancia de los datos, esquiva golpes y tiene enfriamiento', () => {
    const w = arena();
    const ev = w.data.player.evade;
    expect(w.commandEvade({ x: 20, y: 10 })).toBeNull();
    expect(w.commandEvade({ x: 20, y: 10 })).toBe('busy');
    run(w, ev.seconds + 0.05);
    expect(w.player.pos.x).toBeCloseTo(10 + ev.distance, 1);
    expect(w.commandEvade({ x: 0, y: 10 })).toBe('cooldown');
    run(w, ev.cooldown);
    expect(w.commandEvade({ x: 0, y: 10 })).toBeNull();
  });

  it('un golpe que llega durante la invulnerabilidad no hace daño', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 11.5, y: 10 });
    let evaded = false;
    for (let i = 0; i < 180; i++) {
      // Evadir justo antes de que termine el aviso, hacia el propio enemigo (sigue en el cono).
      if (!evaded && e.state === 'telegraph' && e.stateTime > e.def.attack.telegraphSeconds - 0.1) {
        w.player.pos = { x: 10, y: 10 };
        w.commandEvade({ x: 10, y: 10 });
        evaded = true;
      }
      w.tick(DT);
      if (evaded && !w.player.evading) break;
    }
    const events = w.drainEvents();
    expect(events.some((x) => x.type === 'avoided')).toBe(true);
    expect(w.player.health).toBe(w.player.maxHealth);
  });

  it('no atraviesa paredes', () => {
    const w = arena();
    w.player.pos = { x: 17.5, y: 20 };
    w.commandEvade({ x: 30, y: 20 }); // muro en x = 19..21
    run(w, 1);
    expect(w.player.pos.x).toBeLessThan(19);
    expect(w.grid.walkable(w.player.pos)).toBe(true);
  });
});

describe('tiempo de lanzamiento (castTime)', () => {
  it('el efecto llega al terminar; moverse lo cancela sin pagar', () => {
    const data = loadGameData();
    data.abilities.abilities['cone']!.castTime = 0.3;
    const w = arena(data);
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    w.commandCast('cone', aim(20, 10));
    expect(w.player.casting).not.toBeNull();
    expect(damageTo(run(w, 0.25), e.id)).toHaveLength(0);
    expect(damageTo(run(w, 0.1), e.id)).toHaveLength(1);
    const w2 = arena(data);
    const e2 = w2.spawnEnemy('melee', { x: 12, y: 10 });
    w2.commandCast('cone', aim(20, 10));
    w2.commandMove({ x: 5, y: 5 });
    expect(damageTo(run(w2, 0.5), e2.id)).toHaveLength(0);
    expect(w2.player.cooldowns['cone'] ?? 0).toBe(0);
  });
});

describe('HUD de habilidades', () => {
  it('barrido = enfriamiento propio o GCD; gris si falta recurso', () => {
    const data = loadGameData();
    const cone = data.abilities.abilities['cone']!;
    const s = { resource: 100, maxResource: 100, cooldowns: { cone: cone.cooldown / 2 }, gcd: 0, gcdTotal: 0 };
    expect(slotView(s, cone).sweep).toBeCloseTo(0.5);
    expect(slotView(s, cone).ready).toBe(false);
    const cheap = data.abilities.abilities['cheap']!;
    const g = { resource: 100, maxResource: 100, cooldowns: {}, gcd: 0.2, gcdTotal: 0.8 };
    expect(slotView(g, cheap).sweep).toBeCloseTo(0.25);
    const poor = { resource: cheap.resourceCost - 1, maxResource: 100, cooldowns: {}, gcd: 0, gcdTotal: 0 };
    expect(slotView(poor, cheap).lacksResource).toBe(true);
    expect(slotView(poor, cheap).sweep).toBe(0);
  });
});
