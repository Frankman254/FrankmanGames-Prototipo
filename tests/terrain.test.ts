import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseTerrain } from '../src/data/worldSchema';
import { World } from '../src/sim/world';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { computeSplat, generateHeightField, groundTile, HeightField, pathEdgeDistance } from '../src/world/terrain';
import terrainJson from '../data/terrain.json';

const def = loadWorldData().terrain;
const hf = generateHeightField(def);

describe('terreno', () => {
  it('es determinista con la misma semilla', () => {
    const again = generateHeightField(def);
    expect(again.heights).toEqual(hf.heights);
  });

  it('los caminos quedan casi planos y el borde sube en colinas', () => {
    const p = def.paths[0]!;
    for (let i = 0; i + 1 < p.points.length; i++) {
      const a = p.points[i]!;
      const b = p.points[i + 1]!;
      const mx = (a.x + b.x) / 2;
      const mz = (a.y + b.y) / 2;
      if (Math.min(mx, mz, def.width - mx, def.depth - mz) < def.borderHills.width) continue;
      expect(hf.slope(mx, mz)).toBeLessThan(def.slopeDirt);
    }
    expect(hf.sample(2, 128)).toBeGreaterThan(hf.sample(128, 128) + def.borderHills.height * 0.4);
  });

  it('el rayo del cursor toca el terreno donde corresponde', () => {
    const tx = 140;
    const tz = 90;
    const ty = hf.sample(tx, tz);
    const o = { x: tx - 12, y: ty + 18, z: tz - 12 };
    const hit = hf.raycast(o.x, o.y, o.z, tx - o.x, ty - o.y, tz - o.z)!;
    expect(hit.x).toBeCloseTo(tx, 1);
    expect(hit.z).toBeCloseTo(tz, 1);
    expect(hf.raycast(o.x, o.y, o.z, 0, 1, 0)).toBeNull(); // hacia el cielo
  });

  it('interpola entre muestras y respeta los bordes', () => {
    const f = new HeightField(2, 2, 1, new Float32Array([0, 1, 2, 1, 2, 3, 2, 3, 4]));
    expect(f.sample(0.5, 0.5)).toBeCloseTo(1);
    expect(f.sample(-5, -5)).toBe(0);
    expect(f.sample(9, 9)).toBe(4);
  });

  it('el splatmap suma 255 y marca el camino', () => {
    const small = { ...def, splatResolution: 64 };
    const splat = computeSplat(small, hf);
    for (let i = 0; i < splat.length; i += 4) expect(splat[i]! + splat[i + 1]! + splat[i + 2]!).toBe(255);
    // Los píxeles cuyo centro cae bien dentro de un camino son sobre todo «camino».
    let inside = 0;
    for (let j = 0; j < 64; j++) {
      for (let i = 0; i < 64; i++) {
        if (pathEdgeDistance(def.paths, ((i + 0.5) / 64) * def.width, ((j + 0.5) / 64) * def.depth) > -1.2) continue;
        inside++;
        expect(splat[(j * 64 + i) * 4 + 2]!).toBeGreaterThan(200);
      }
    }
    expect(inside).toBeGreaterThan(5);
  });

  it('la textura de suelo se repite sin costura', () => {
    const size = 64;
    const t = groundTile(def.layers.grass, size, 3);
    let worstSeam = 0;
    let worstInner = 0;
    for (let y = 0; y < size; y++) {
      const seam = Math.abs(t[(y * size + size - 1) * 4]! - t[(y * size) * 4]!);
      const inner = Math.abs(t[(y * size + 1) * 4]! - t[(y * size) * 4]!);
      worstSeam = Math.max(worstSeam, seam);
      worstInner = Math.max(worstInner, inner);
    }
    expect(worstSeam).toBeLessThanOrEqual(worstInner + 2);
  });

  it('rechaza un paso de altura que no divide la zona', () => {
    expect(() => parseTerrain({ ...terrainJson, heightStep: 3 })).toThrow(/heightStep/);
  });

  it('la zona continua sustituye a la arena en la simulación', () => {
    const data = withOverworldZone(loadGameData(), buildOverworld(loadWorldData()));
    const w = new World(data);
    expect(w.grid.cols).toBe(Math.ceil(def.width / data.zone.cellSize));
    expect(w.player.pos.x).toBeCloseTo(def.playerStart.x);
  });
});
