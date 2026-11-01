import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { MOVE_COMMAND_TOLERANCE, World } from '../src/sim/world';

describe('World (esqueleto)', () => {
  it('el jugador llega al destino a la velocidad de los datos', () => {
    const data = loadGameData();
    const w = new World(data);
    const start = { ...w.player.pos };
    const speed = w.player.speed;
    expect(speed).toBe(w.character.stats.get('moveSpeed'));
    w.commandMove({ x: start.x + speed, y: start.y });
    for (let i = 0; i < 58; i++) w.tick(1 / 60);
    expect(w.player.moveTarget).not.toBeNull();
    for (let i = 0; i < 3; i++) w.tick(1 / 60);
    expect(w.player.moveTarget).toBeNull();
    expect(w.player.pos.x).toBeCloseTo(start.x + speed);
  });

  it('los destinos se recortan a los bordes de la zona', () => {
    const w = new World(loadGameData());
    w.commandMove({ x: -100, y: 1e6 });
    expect(w.player.moveTarget!.x).toBeGreaterThan(0);
    expect(w.player.moveTarget!.y).toBeLessThan(w.data.zone.depth);
  });

  it('un clic a menos de 1 cm conserva ruta, combate, interacción, pesca y lanzamiento', () => {
    const w = new World(loadGameData(), { encounter: false });
    const p = w.player;
    const path = [{ x: p.pos.x + 2, y: p.pos.y }];
    const moveTarget = { ...path[0]! };
    const casting = { ability: 'basic', targetId: null, dir: 0, aim: { ...p.pos }, remaining: 1 };
    p.path = path;
    p.moveTarget = moveTarget;
    p.attackTarget = 77;
    p.pickupTarget = 88;
    p.casting = casting;
    w.talkTarget = 'npc';
    w.fishing = { spotId: 'pond', bobber: { ...p.pos }, state: 'waiting', biteAt: 10, nibbleAt: null, windowEnd: 0 };

    w.commandMove({ x: p.pos.x + MOVE_COMMAND_TOLERANCE / 2, y: p.pos.y });

    expect(p.path).toBe(path);
    expect(p.moveTarget).toBe(moveTarget);
    expect(p.attackTarget).toBe(77);
    expect(p.pickupTarget).toBe(88);
    expect(p.casting).toBe(casting);
    expect(w.talkTarget).toBe('npc');
    expect(w.fishing).not.toBeNull();
  });

  it('un movimiento legítimo dentro de la misma celda conserva el comportamiento anterior', () => {
    const w = new World(loadGameData(), { encounter: false });
    const p = w.player;
    p.attackTarget = 77;
    p.pickupTarget = 88;
    p.casting = { ability: 'basic', targetId: null, dir: 0, aim: { ...p.pos }, remaining: 1 };
    const target = { x: p.pos.x + MOVE_COMMAND_TOLERANCE * 2, y: p.pos.y };
    w.commandMove(target);
    expect(p.attackTarget).toBeNull();
    expect(p.pickupTarget).toBeNull();
    expect(p.casting).toBeNull();
    expect(p.moveTarget).toEqual(target);
  });
});
