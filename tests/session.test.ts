import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import type { GameEvent } from '../src/sim/events';
import { Telemetry } from '../src/sim/telemetry';
import { World } from '../src/sim/world';

const DT = 1 / 60;

function run(w: World, seconds: number): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.tick(DT);
    out.push(...w.drainEvents());
  }
  return out;
}

describe('cierre de partida', () => {
  it('victoria al no quedar ningún enemigo vivo, una sola vez', () => {
    const w = new World(loadGameData());
    expect(w.outcome).toBe('playing');
    run(w, 0.5);
    for (const e of w.enemies.list) w.enemies.damage(e, 1e6, () => {});
    const ev = run(w, 0.5);
    expect(w.outcome).toBe('victory');
    expect(w.endTime).not.toBeNull();
    expect(ev.filter((e) => e.type === 'outcome')).toEqual([{ type: 'outcome', outcome: 'victory' }]);
  });

  it('los esbirros vivos cuentan: no hay victoria mientras quede alguno', () => {
    const w = new World(loadGameData(), { encounter: false });
    w.player.invulnerable = 1e9;
    w.player.pos = { x: 10, y: 10 };
    const s = w.spawnEnemy('summoner', { x: 10, y: 22 });
    run(w, 4);
    expect(w.enemies.minionsOf(s.id)).toBeGreaterThan(0);
    w.enemies.damage(s, 1e6, () => {});
    run(w, 0.1);
    expect(w.outcome).toBe('playing');
    for (const e of w.enemies.list) w.enemies.damage(e, 1e6, () => {});
    run(w, 0.1);
    expect(w.outcome).toBe('victory');
  });

  it('derrota al llegar a 0 de vida: el jugador deja de obedecer y los enemigos lo sueltan', () => {
    const w = new World(loadGameData(), { encounter: false });
    w.player.pos = { x: 10, y: 10 };
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    w.player.health = 1;
    const ev = run(w, 3);
    expect(w.player.alive).toBe(false);
    expect(w.outcome).toBe('defeat');
    expect(ev.some((x) => x.type === 'playerDeath')).toBe(true);
    const at = { ...w.player.pos };
    w.commandMove({ x: 4, y: 4 });
    expect(w.commandCastSlot(1, { point: { x: 20, y: 10 }, targetId: null })).toBe('dead');
    run(w, 1);
    expect(w.player.pos).toEqual(at);
    expect(['idle', 'telegraph', 'attack', 'recover']).toContain(e.state);
    run(w, 5);
    expect(e.state).toBe('idle');
  });

  it('una partida nueva arranca limpia (reinicio sin recargar datos)', () => {
    const data = loadGameData();
    const a = new World(data);
    run(a, 2);
    a.player.health = 0;
    run(a, 0.1);
    expect(a.outcome).toBe('defeat');
    const b = new World(data, { seed: 99 });
    expect(b.outcome).toBe('playing');
    expect(b.player.health).toBe(b.character.maxHealth);
    expect(b.player.resource).toBe(b.character.maxResource);
    expect(b.player.maxHealth).toBeGreaterThan(0);
    expect(b.enemies.aliveCount()).toBe(data.encounter.spawns.length);
    expect(b.time).toBe(0);
  });
});

describe('telemetría', () => {
  it('suma daño, usos, bloqueos, bajas y muertes por partida y en total', () => {
    const t = new Telemetry();
    t.begin('2026-10-29T00:00:00.000Z');
    t.record(
      [
        { type: 'damage', sourceId: 1, targetId: 2, amount: 10, crit: true, toPlayer: false, ability: 'basic' },
        { type: 'damage', sourceId: 2, targetId: 1, amount: 7, crit: false, toPlayer: true, ability: null },
        { type: 'avoided', sourceId: 2 },
        { type: 'cast', ability: 'basic' },
        { type: 'cast', ability: 'cone' },
        { type: 'cast', ability: 'cone' },
        { type: 'castBlocked', ability: 'cone', reason: 'cooldown' },
        { type: 'enemyDeath', enemyId: 2, archetype: 'melee' },
      ],
      12.5,
    );
    t.record([{ type: 'playerDeath' }, { type: 'outcome', outcome: 'defeat' }], 20);
    // Tras el final, la partida ya no acumula.
    t.record([{ type: 'damage', sourceId: 2, targetId: 1, amount: 99, crit: false, toPlayer: true, ability: null }], 25);
    t.begin('2026-10-29T00:01:00.000Z');
    t.record([{ type: 'cast', ability: 'cheap' }], 3);
    t.begin('2026-10-29T00:02:00.000Z'); // la segunda queda abandonada
    const rep = JSON.parse(t.toJSON());
    expect(rep.format).toBe('frankmangames-telemetry');
    expect(rep.runs).toHaveLength(3);
    const r1 = rep.runs[0];
    expect(r1).toMatchObject({
      run: 1,
      outcome: 'defeat',
      seconds: 20,
      damageDealt: 10,
      crits: 1,
      damageTaken: 7,
      hitsTaken: 1,
      hitsAvoided: 1,
      deaths: 1,
      abilityUses: { basic: 1, cone: 2 },
      castsBlocked: { 'cone:cooldown': 1 },
      kills: { melee: 1 },
    });
    expect(rep.runs[1].outcome).toBe('abandoned');
    expect(rep.runs[2].outcome).toBeNull();
    expect(rep.totals).toMatchObject({ runs: 3, defeats: 1, victories: 0, deaths: 1, damageTaken: 7, damageDealt: 10, seconds: 23 });
  });

  it('una partida real deja telemetría coherente con el mundo', () => {
    const w = new World(loadGameData(), { encounter: false });
    const t = new Telemetry();
    t.begin('x');
    w.player.pos = { x: 10, y: 10 };
    const e = w.spawnEnemy('melee', { x: 11.6, y: 10 });
    e.health = 1;
    w.commandAttack(e.id);
    for (let i = 0; i < 60; i++) {
      w.tick(DT);
      t.record(w.drainEvents(), w.endTime ?? w.time);
    }
    const r = t.runs[0]!;
    expect(w.outcome).toBe('victory');
    expect(r.outcome).toBe('victory');
    expect(r.kills).toEqual({ melee: 1 });
    expect(r.abilityUses['basic']).toBe(1);
    expect(r.seconds).toBeCloseTo(w.endTime!, 5);
  });
});
