import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { World } from '../src/sim/world';

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
});
