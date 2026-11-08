// F21: vuelo con la montura voladora: WASD mueve, Espacio sube, sin hechizos y con daño.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { DEV_MOUNT_ID, grantDevMount } from '../src/rpg/devMount';
import { FLIGHT, World } from '../src/sim/world';

const DT = 1 / 60;
const data = loadGameData();

function rider(): World {
  const w = new World(data, { encounter: false });
  grantDevMount(w.character);
  return w;
}

describe('F21: vuelo', () => {
  it('despegar cancela la conversación pendiente antes de aceptar otro clic', () => {
    const w = rider();
    const npc = { npcId: 'test_npc', merchantId: null, pos: { x: w.player.pos.x + 5, y: w.player.pos.y } };
    w.npcs.push(npc);
    w.commandTalk(npc.npcId);
    expect(w.talkTarget).toBe(npc.npcId);
    w.toggleFlight();
    expect(w.talkTarget).toBeNull();
  });

  it('un clic fuera del mapa en vuelo llega al borde y termina la orden', () => {
    const w = rider();
    w.toggleFlight();
    w.commandMove({ x: -10000, y: -10000 });
    for (let i = 0; i < 1800; i++) w.tick(DT);
    expect(w.player.pos).toEqual({ x: w.grid.originX + 1, y: w.grid.originY + 1 });
    expect(w.player.moveTarget).toBeNull();
  });

  it('solo despega con una montura que vuela', () => {
    const w = new World(data, { encounter: false });
    expect(w.canFly()).toBe(false);
    expect(w.toggleFlight()).toBe(false);
    const r = rider();
    expect(r.character.equipment.get('mount')?.itemId).toBe(DEV_MOUNT_ID);
    expect(r.canFly()).toBe(true);
    expect(r.toggleFlight()).toBe(true);
    expect(r.player.flight).toEqual({ altitude: 0 });
  });

  it('WASD mueve, Espacio sube hasta el techo y sin Espacio baja', () => {
    const w = rider();
    w.toggleFlight();
    const start = { ...w.player.pos };
    w.setFlightInput({ x: 1, y: 0 }, true);
    for (let i = 0; i < 60; i++) w.tick(DT);
    expect(w.player.pos.x).toBeGreaterThan(start.x + 5);
    expect(w.player.pos.y).toBeCloseTo(start.y, 3);
    expect(w.player.flight!.altitude).toBeCloseTo(FLIGHT.climb, 0);
    for (let i = 0; i < 60 * 10; i++) w.tick(DT);
    expect(w.player.flight!.altitude).toBe(FLIGHT.ceiling);
    w.setFlightInput({ x: 0, y: 0 }, false);
    for (let i = 0; i < 60; i++) w.tick(DT);
    expect(w.player.flight!.altitude).toBeCloseTo(FLIGHT.ceiling - FLIGHT.sink, 0);
  });

  it('en vuelo no se lanza nada; el clic vuela en línea recta y WASD lo cancela', () => {
    const w = rider();
    w.toggleFlight();
    expect(w.commandCastSlot(0, { point: { x: w.player.pos.x + 3, y: w.player.pos.y }, targetId: null })).toBe('flying');
    const goal = { x: w.player.pos.x + 5, y: w.player.pos.y + 5 };
    w.commandMove(goal);
    expect(w.player.path).toEqual([]);
    for (let i = 0; i < 120; i++) w.tick(DT);
    expect(w.player.pos.x).toBeCloseTo(goal.x, 3);
    expect(w.player.pos.y).toBeCloseTo(goal.y, 3);
    w.commandMove({ x: goal.x + 20, y: goal.y });
    w.setFlightInput({ x: 0, y: 1 }, false);
    for (let i = 0; i < 30; i++) w.tick(DT);
    expect(w.player.pos.x).toBeCloseTo(goal.x, 3);
    expect(w.player.moveTarget).toBeNull();
  });

  it('al aterrizar cae en una casilla pisable', () => {
    const w = rider();
    w.toggleFlight();
    // Busca un punto que no se pisa (agua, roca) y aterriza allí.
    const g = w.grid;
    let spot = null as { x: number; y: number } | null;
    for (let y = g.originY + 2; y < g.originY + g.depth - 2 && !spot; y += 1) for (let x = g.originX + 2; x < g.originX + g.width - 2; x += 1) if (!g.walkable({ x, y })) { spot = { x, y }; break; }
    expect(spot).not.toBeNull();
    w.player.pos = { ...spot! };
    expect(w.toggleFlight()).toBe(false);
    expect(w.player.flight).toBeNull();
    expect(g.walkable(w.player.pos)).toBe(true);
  });
});

describe('F21: volando alto no te ven', () => {
  it('un enemigo quieto cerca no te detecta por encima de la altura de sigilo, y abajo sí', () => {
    const w = rider();
    const p = w.player.pos;
    const e = w.spawnEnemy('melee', { x: p.x + 4, y: p.y });
    w.toggleFlight();
    w.setFlightInput({ x: 0, y: 0 }, true);
    while (w.player.flight!.altitude < FLIGHT.stealthAltitude + 1) w.tick(DT);
    for (let i = 0; i < 60; i++) w.tick(DT);
    expect(e.state).toBe('idle');
    // Baja hasta el suelo: ahora sí lo ve.
    w.setFlightInput({ x: 0, y: 0 }, false);
    for (let i = 0; i < 60 * 8 && e.state === 'idle'; i++) w.tick(DT);
    expect(w.player.flight!.altitude).toBeLessThan(FLIGHT.stealthAltitude);
    expect(e.state).not.toBe('idle');
  });

  it('quien te perseguía te pierde al subir', () => {
    const w = rider();
    const p = w.player.pos;
    const e = w.spawnEnemy('melee', { x: p.x + 4, y: p.y });
    for (let i = 0; i < 120 && e.state === 'idle'; i++) w.tick(DT);
    expect(e.state).not.toBe('idle');
    w.toggleFlight();
    w.setFlightInput({ x: 0, y: 0 }, true);
    for (let i = 0; i < 60 * 4; i++) w.tick(DT);
    // Te suelta: vuelve a quedarse quieto (y regresa a su sitio si se había alejado).
    expect(e.state).toBe('idle');
  });
});
