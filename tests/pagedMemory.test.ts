// Memoria por páginas (creador, 2026-11-10): alturas y paso del mundo grande se reservan al
// generar cada página y se sueltan al alejarse. La parcela inicial y lo marcado a mano quedan
// fijados; al volver a una página, su paso (con troncos y rocas) sale igual que la primera vez.
import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { buildOverworld } from '../src/world/overworld';

const wd = loadWorldData();

/** Celdas bloqueadas de la página de 128 m que empieza en (x0, z0). */
function blockedIn(ow: ReturnType<typeof buildOverworld>, x0: number, z0: number): number {
  const g = ow.grid;
  const { cx, cy } = g.cellOf({ x: x0 + g.cellSize / 2, y: z0 + g.cellSize / 2 });
  const n = 128 / g.cellSize;
  let count = 0;
  for (let y = cy; y < cy + n; y++) for (let x = cx; x < cx + n; x++) if (!g.walkableCell(x, y)) count++;
  return count;
}

describe('alturas y paso por páginas', () => {
  it('el mundo grande no reserva su rectángulo entero', () => {
    const ow = buildOverworld(wd);
    const b = ow.stream.ctx.bounds;
    const dense = (b.x1 - b.x0 + 1) * (b.z1 - b.z0 + 1) * 4 + ((b.x1 - b.x0) / b.cellSize) * ((b.z1 - b.z0) / b.cellSize);
    const m = ow.stream.memoryBytes();
    expect(dense).toBeGreaterThan(150e6);
    expect(m.heights + m.grid).toBeLessThan(4e6);
  });

  it('suelta la memoria de una página al alejarse y la recupera igual al volver', () => {
    const ow = buildOverworld(wd);
    const base = ow.stream.memoryBytes();
    // La Chorrerita: lejos de la parcela, de nada fijado.
    const at = { x: 763, y: 1504 };
    const page = { x0: 640, z0: 1408 };
    ow.stream.ensure(at.x - 1, at.y - 1, at.x + 1, at.y + 1);
    ow.stream.update(at.x, at.y);
    const loaded = ow.stream.memoryBytes();
    expect(loaded.heights).toBeGreaterThan(base.heights);
    expect(loaded.grid).toBeGreaterThan(base.grid);
    expect(ow.grid.walkable(at)).toBe(true);
    expect(ow.heights.sample(at.x, at.y)).not.toBe(0);
    const blocked = blockedIn(ow, page.x0, page.z0);

    // Viaje a la parcela: la página lejana se suelta y lee como antes de cargarse.
    ow.stream.update(128, 128);
    expect(ow.stream.memoryBytes()).toEqual(base);
    expect(ow.grid.walkable(at)).toBe(false);
    expect(ow.heights.sample(at.x, at.y)).toBe(0);
    // La parcela sigue entera.
    expect(ow.grid.nearestWalkable({ x: 131, y: 118 }, 4)).toBeGreaterThanOrEqual(0);
    expect(ow.stream.isActive(128, 128)).toBe(true);

    // De vuelta: mismo paso, troncos incluidos.
    ow.stream.ensure(at.x - 1, at.y - 1, at.x + 1, at.y + 1);
    ow.stream.update(at.x, at.y);
    expect(ow.grid.walkable(at)).toBe(true);
    expect(blockedIn(ow, page.x0, page.z0)).toBe(blocked);
  });

  it('caminar lejos o saltar entre Piedras no hace crecer la memoria', () => {
    const ow = buildOverworld(wd);
    const base = ow.stream.memoryBytes();
    let peak = 0;
    const track = (): void => {
      const m = ow.stream.memoryBytes();
      peak = Math.max(peak, m.heights + m.grid);
    };
    // Caminata de 1,5 km hacia el este.
    for (let x = 128; x < 1700; x += 32) {
      ow.stream.ensure(x - 1, 127, x + 1, 129);
      ow.stream.update(x, 128);
      track();
    }
    // Saltos de punta a punta del país.
    for (const [x, z] of [[-2168, 1006], [2583, 875], [-1972, 2053], [1649, 2094], [1018, 1629], [-556, 641], [128, 128]] as const) {
      ow.stream.ensure(x - 4, z - 4, x + 4, z + 4);
      ow.stream.update(x, z);
      track();
    }
    // De vuelta en la parcela queda lo fijado; por el camino, unas pocas páginas de más.
    expect(ow.stream.memoryBytes()).toEqual(base);
    expect(peak).toBeLessThan(base.heights + base.grid + 12 * (129 * 129 * 4 + 256 * 256));
  }, 60000);
});
