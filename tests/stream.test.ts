import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { Pathfinder } from '../src/sim/pathfinder';
import { World } from '../src/sim/world';
import { project } from '../src/world/atlas';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { generatePage } from '../src/world/pages';
import type { PageData } from '../src/world/pages';
import { WorldStream } from '../src/world/stream';

const wd = loadWorldData();
const ow = buildOverworld(wd);
const ctx = ow.stream.ctx;
const bounds = wd.terrain.world!;

describe('mundo por páginas', () => {
  it('una página sale igual sin importar el orden ni el hilo', () => {
    const a = generatePage(ctx, 2, 2);
    generatePage(ctx, 0, 0);
    const b = generatePage(ctx, 2, 2);
    expect(Array.from(b.heights.slice(0, 64))).toEqual(Array.from(a.heights.slice(0, 64)));
    expect(Object.keys(b.kinds)).toEqual(Object.keys(a.kinds));
  });

  it('las páginas vecinas casan en su borde', () => {
    const a = generatePage(ctx, 2, 1);
    const b = generatePage(ctx, 3, 1);
    const line = a.size + 1;
    for (let r = 0; r < line; r += 16) expect(b.heights[r * line]!).toBeCloseTo(a.heights[r * line + a.size]!, 4);
  });

  it('al arrancar solo está la parcela, y lo no cargado no se pisa', () => {
    expect(ow.grid.walkable({ x: 300, y: 200 })).toBe(false);
    expect(ow.stream.activePages.every((p) => p.x0 >= 0 && p.z0 >= 0 && p.x0 < 256 && p.z0 < 256)).toBe(true);
  });

  it('el relieve de la parcela no cambia por tener un mundo alrededor', () => {
    expect(ow.heights.sample(127, 131)).toBeLessThan(5);
    expect(ow.heights.sample(127, 131)).toBeGreaterThan(-5);
  });

  it('el mar no se pisa y la costa existe donde dice el atlas', () => {
    const east = project(wd.atlas, -79.9, 7.22); // mar abierto al sureste de Pedasí (al norte está Iguanera)
    const px = Math.floor(Math.min(east.x, bounds.x1 - 1) / bounds.pageMeters);
    const pz = Math.floor(east.z / bounds.pageMeters);
    const page = generatePage(ctx, px, pz);
    expect(page.mask.every((m) => m === 1)).toBe(true);
    expect(page.heights.every((h) => h < wd.atlas.seaLevel)).toBe(true);
    expect(Object.keys(page.kinds)).toEqual([]);
  });

  it('todo Panamá de tierra se pisa; la alta mar se ve pero no se entra', () => {
    const inside = generatePage(ctx, 0, 2); // z 256–384, tierra adentro de Los Santos
    expect(inside.mask.some((m) => m === 0)).toBe(true);
    const chitri = generatePage(ctx, 0, 3); // z 384–512, Chitrí
    expect(chitri.mask.some((m) => m === 0)).toBe(true);
    // Desde 2d12490 el mapa es todo Panamá: Veraguas es tierra y se entra, ya no
    // una región lejana sólo visible.
    const veraguas = project(wd.atlas, -81.2, 8.0);
    const pgVer = generatePage(ctx, Math.floor(veraguas.x / 128), Math.floor(veraguas.z / 128));
    expect(Object.values(pgVer.heights).some((h) => h > wd.atlas.seaLevel)).toBe(true);
    expect(pgVer.mask.some((m) => m === 0)).toBe(true);
    // La alta mar (Caribe y Pacífico) sigue fuera de alcance.
    for (const [lon, lat] of [[-77.0, 9.5], [-80.0, 6.0]] as const) {
      const p = project(wd.atlas, lon, lat);
      const sea = generatePage(ctx, Math.floor(p.x / 128), Math.floor(p.z / 128));
      expect(sea.mask.every((m) => m === 1), `${lon},${lat}`).toBe(true);
    }
  });

  it('caminar carga páginas y alejarse las suelta, conservando el paso', () => {
    const local = buildOverworld(wd);
    const seen: { ready: string[]; gone: string[] } = { ready: [], gone: [] };
    local.stream.listen({ ready: (p: PageData) => seen.ready.push(`${p.px}:${p.pz}`), released: (p: PageData) => seen.gone.push(`${p.px}:${p.pz}`) });
    const queue: Array<[number, number]> = [];
    local.stream.setSource({ request: (px, pz) => queue.push([px, pz]) });
    const walkTo = (x: number, z: number): void => {
      for (let i = 0; i < 60; i++) {
        local.stream.update(x, z);
        const job = queue.shift();
        if (!job) break;
        local.stream.deliver(generatePage(local.stream.ctx, job[0], job[1]), 1);
      }
    };
    walkTo(130, 300);
    expect(local.stream.isActive(130, 300)).toBe(true);
    expect(local.grid.nearestWalkable({ x: 130, y: 300 }, 8)).toBeGreaterThanOrEqual(0);
    const h0 = local.heights.sample(124, 104);
    walkTo(130, 470);
    expect(seen.gone.length).toBeGreaterThan(0);
    expect(local.stream.isActive(130, 60)).toBe(false);
    // Lo soltado sigue siendo pisable y conserva su altura; solo se fue lo de dibujar.
    expect(local.grid.nearestWalkable({ x: 124, y: 104 }, 8)).toBeGreaterThanOrEqual(0);
    // La altura del terreno suelto se conserva: el alivio no se aplana al soltar la página.
    expect(local.stream.isActive(124, 104)).toBe(false);
    expect(local.heights.sample(124, 104)).toBe(h0);
  });

  it('el camino se busca con memoria limitada aunque el mundo sea enorme', () => {
    const local = buildOverworld(wd);
    local.stream.ensure(130, 256, 260, 400);
    const pf = new Pathfinder(local.grid);
    const path = pf.findPath({ x: 150, y: 248 }, { x: 160, y: 330 });
    expect(path.length).toBeGreaterThan(0);
    const end = path[path.length - 1]!;
    expect(Math.hypot(end.x - 160, end.y - 330)).toBeLessThan(1);
    // Rutas más allá de la ventana no cuelgan: devuelven lo alcanzable o nada.
    expect(() => pf.findPath({ x: 150, y: 248 }, { x: -600, y: 600 })).not.toThrow();
  });

  it('los monstruos solo viven donde hay página, y se van al soltarla', () => {
    const local = buildOverworld(wd);
    const data = withOverworldZone(loadGameData(), local);
    const w = new World(data, { seed: 3, zones: true });
    const before = w.population!.zones.find((z) => z.def.id === 'parrita')!;
    const page0 = before.points.length;
    expect(page0).toBe(0);
    local.stream.ensure(0, 448, 64, 512);
    const page = local.stream.activePages.find((p) => p.x0 === 0 && p.z0 === 384)!;
    w.population!.pageReady(page.x0, page.z0, page.size);
    expect(before.points.length).toBeGreaterThan(0);
    expect(before.target).toBeGreaterThan(0);
    const n = before.points.length;
    w.population!.pageReady(page.x0 + 128, page.z0, page.size); // sin cargar: nada
    expect(before.points.length).toBe(n);
    w.population!.pageReleased(page.x0, page.z0, page.size);
    expect(before.points.length).toBe(0);
    expect(before.target).toBe(0);
  });

  it('rechaza radios cuyo barrido pasaría del presupuesto de páginas', () => {
    // pageMeters = 128: load 1200 con tope de escala 2 → reach = ceil(2400/128) = 19,
    // y (2·19+1)² = 1521 páginas exploradas por cuadro pasan del presupuesto.
    expect(() => new WorldStream(ctx, ow.heights, ow.grid, { load: 1200, drop: 1300, inFlight: 2 })).toThrow(/presupuesto/);
    expect(() => new WorldStream(ctx, ow.heights, ow.grid, { load: 0, drop: 300, inFlight: 2 })).toThrow(/radios/);
    expect(() => new WorldStream(ctx, ow.heights, ow.grid, { load: 200, drop: 150, inFlight: 2 })).toThrow(/radios/);
    expect(() => new WorldStream(ctx, ow.heights, ow.grid, { load: 200, drop: 300, inFlight: 0 })).toThrow(/inFlight/);
  });

  it('la escala de vuelo se aprieta al rango y el barrido pide a lo sumo inFlight', () => {
    const local = buildOverworld(wd);
    local.stream.scale = 50;
    expect(local.stream.scale).toBe(WorldStream.MAX_SCALE);
    local.stream.scale = Number.NaN;
    expect(local.stream.scale).toBe(1);
    const asked: string[] = [];
    local.stream.setSource({ request: (px, pz) => asked.push(`${px}:${pz}`) });
    local.stream.update(130, 300);
    expect(asked.length).toBeLessThanOrEqual(wd.detail.stream.inFlight);
  });
});

describe('hilos de páginas (F13)', () => {
  it('reparte el trabajo en varios hilos sin quitarle núcleos al juego', async () => {
    const { pageWorkerCount } = await import('../src/render/pageSource');
    expect(pageWorkerCount(2)).toBe(1);
    expect(pageWorkerCount(4)).toBe(2);
    expect(pageWorkerCount(16)).toBe(3);
  });
});
