import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { canCast, castBlock, slotView } from '../src/sim/combat';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { dist } from '../src/sim/vec2';

const DT = 1 / 60;

/** Arena vacía con el jugador en (10, 10). Por defecto la Tejedora (hechizos a distancia y en cono). */
function arena(data: GameData = loadGameData(), classId = 'storm_weaver'): World {
  const character = Character.create(data.rpg, classId, 'Prueba', new Rng(1));
  const w = new World(data, { encounter: false, character });
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

describe('hechizos del jugador', () => {
  it('Chispa gasta recurso, dispara el GCD y bloquea por falta de recurso', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    const spark = w.spell('spark');
    expect(w.commandCast('spark', aim(15, 10, e.id))).toBeNull();
    expect(w.player.resource).toBe(w.player.maxResource - spark.cost);
    expect(w.player.gcd).toBeCloseTo(spark.globalCooldown);
    // Recast inmediato: el GCD lo impide, y también al ataque básico.
    expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('gcd');
    expect(w.checkCast(w.spell('basic'), e.id)).toBe('gcd');
    w.player.resource = spark.cost - 0.01;
    w.player.gcd = 0;
    expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('resource');
    const ev = [...w.drainEvents(), ...run(w, 0.5)]; // el proyectil tarda en llegar
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(ev.filter((x) => x.type === 'castBlocked').map((x) => (x as { reason: string }).reason)).toEqual(['gcd', 'resource']);
  });

  it('el recurso se regenera con el tiempo hasta el máximo', () => {
    const w = arena();
    w.player.resource = 0;
    run(w, 1);
    expect(w.player.resource).toBeCloseTo(w.character.stats.get('resourceRegen'), 1);
    run(w, 60);
    expect(w.player.resource).toBe(w.player.maxResource);
  });

  it('Arco voltaico (cono) tiene enfriamiento y golpea a los del cono, no a los de detrás', () => {
    const w = arena();
    w.player.invulnerable = 1e9; // tres enemigos pegando durante 6 s lo matarían
    const front = w.spawnEnemy('melee', { x: 12.5, y: 10.5 });
    const side = w.spawnEnemy('melee', { x: 11, y: 12.5 }); // ~68° del eje: fuera de un cono de 70°
    const back = w.spawnEnemy('melee', { x: 8, y: 10 });
    for (const e of [front, side, back]) e.health = 1e6;
    const cone = w.spell('voltaic_arc');
    expect(w.commandCast('voltaic_arc', aim(20, 10))).toBeNull();
    const ev = w.drainEvents();
    expect(damageTo(ev, front.id)).toHaveLength(1);
    expect(damageTo(ev, side.id)).toHaveLength(0);
    expect(damageTo(ev, back.id)).toHaveLength(0);
    expect(w.player.cooldowns['voltaic_arc']).toBeCloseTo(cone.cooldown);
    run(w, cone.globalCooldown + 0.05);
    w.player.resource = w.player.maxResource;
    expect(w.commandCast('voltaic_arc', aim(20, 10))).toBe('cooldown');
    run(w, cone.cooldown);
    w.player.resource = w.player.maxResource;
    expect(w.commandCast('voltaic_arc', aim(20, 10))).toBeNull();
  });

  it('fuera de alcance o tras una pared no se lanza', () => {
    const w = arena();
    const spark = w.spell('spark');
    const far = w.spawnEnemy('melee', { x: 10 + spark.range + 2, y: 10 });
    expect(w.commandCast('spark', aim(0, 0, far.id))).toBe('range');
    w.player.pos = { x: 17, y: 20 };
    const hidden = w.spawnEnemy('melee', { x: 23, y: 20 }); // muro en x = 19..21
    expect(w.commandCast('spark', aim(0, 0, hidden.id))).toBe('range');
    const w2 = arena();
    expect(w2.commandCast('spark', aim(0, 0, null))).toBe('target');
    expect(w.player.resource).toBe(w.player.maxResource);
  });

  it('nunca falla: cada ataque básico en alcance hace daño', () => {
    const w = arena(loadGameData(), 'ember_vanguard');
    let hits = 0;
    for (let i = 0; i < 300; i++) {
      const e = w.spawnEnemy('melee', { x: 11.5, y: 10 });
      e.health = 1e9;
      w.player.cooldowns = {};
      w.player.gcd = 0;
      w.player.basicCharges = w.data.player.basicAttack.charges; // combate v2: cada golpe gasta una carga
      expect(w.commandCast('basic', aim(0, 0, e.id))).toBeNull();
      for (const d of damageTo(w.drainEvents(), e.id)) {
        expect((d as { amount: number }).amount).toBeGreaterThanOrEqual(1);
        hits++;
      }
      w.enemies.list.length = 0;
    }
    expect(hits).toBe(300);
  });
});

describe('clic sobre un enemigo', () => {
  it('se acerca, da un ataque básico con el arma y se para', () => {
    const w = arena(loadGameData(), 'ember_vanguard');
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    e.state = 'stagger'; // quieto durante la prueba
    e.stateTime = -100;
    w.commandAttack(e.id);
    const ev = run(w, 2);
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(ev.filter((x) => x.type === 'cast' && x.ability === 'basic')).toHaveLength(1);
    expect(dist(w.player.pos, e.pos) - w.player.radius - e.radius).toBeLessThanOrEqual(w.character.weapon()!.weapon!.range + 1e-6);
    expect(w.player.attackTarget).toBeNull();
    expect(w.player.lastTarget).toBe(e.id);
  });

  it('una orden de moverse cancela el ataque pendiente', () => {
    const w = arena(loadGameData(), 'ember_vanguard');
    const e = w.spawnEnemy('melee', { x: 16, y: 10 });
    w.commandAttack(e.id);
    run(w, 0.1);
    w.commandMove({ x: 4, y: 4 });
    expect(damageTo(run(w, 2), e.id)).toHaveLength(0);
  });
});

describe('tiempo de lanzamiento (castTime)', () => {
  it('el efecto llega al terminar; moverse lo cancela sin pagar', () => {
    const data = loadGameData();
    data.rpg.spells['voltaic_arc']!.castTime = 0.3;
    const w = arena(data);
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    w.commandCast('voltaic_arc', aim(20, 10));
    expect(w.player.casting).not.toBeNull();
    expect(damageTo(run(w, 0.25), e.id)).toHaveLength(0);
    expect(damageTo(run(w, 0.1), e.id)).toHaveLength(1);
    const w2 = arena(data);
    const e2 = w2.spawnEnemy('melee', { x: 12, y: 10 });
    w2.commandCast('voltaic_arc', aim(20, 10));
    w2.commandMove({ x: 5, y: 5 });
    expect(damageTo(run(w2, 0.5), e2.id)).toHaveLength(0);
    expect(w2.player.cooldowns['voltaic_arc'] ?? 0).toBe(0);
  });
});

describe('HUD de habilidades', () => {
  it('barrido = enfriamiento propio o GCD; gris si falta recurso', () => {
    const w = arena();
    const cone = w.ability('voltaic_arc');
    const s = { resource: 100, maxResource: 100, cooldowns: { voltaic_arc: cone.cooldown / 2 }, gcd: 0, gcdTotal: 0 };
    expect(slotView(s, cone).sweep).toBeCloseTo(0.5);
    expect(slotView(s, cone).ready).toBe(false);
    const cheap = w.ability('spark');
    const g = { resource: 100, maxResource: 100, cooldowns: {}, gcd: 0.2, gcdTotal: 0.8 };
    expect(slotView(g, cheap).sweep).toBeCloseTo(0.25);
    const poor = { resource: cheap.resourceCost - 1, maxResource: 100, cooldowns: {}, gcd: 0, gcdTotal: 0 };
    expect(slotView(poor, cheap).lacksResource).toBe(true);
    expect(slotView(poor, cheap).sweep).toBe(0);
  });
});
