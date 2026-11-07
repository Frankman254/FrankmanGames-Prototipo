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

  it('en vuelo no se lanza nada ni se anda con clic', () => {
    const w = rider();
    w.toggleFlight();
    expect(w.commandCastSlot(0, { point: { x: w.player.pos.x + 3, y: w.player.pos.y }, targetId: null })).toBe('flying');
    w.commandMove({ x: w.player.pos.x + 5, y: w.player.pos.y });
    expect(w.player.path).toEqual([]);
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
