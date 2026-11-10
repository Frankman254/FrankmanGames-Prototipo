import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { MAP_DEF } from '../src/ui/map/mapData';
import { MapState } from '../src/ui/map/mapState';
import { fitAtlas, regionAtView, regionCenter, regionInfo, worldToAtlasView } from '../src/ui/map/panamaMap';
import { atlasExtent, regionAt } from '../src/world/atlas';

class Store {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

const atlas = loadWorldData().atlas;

function state(store: Store, name = 'Ana'): MapState {
  const s = new MapState(MAP_DEF, store);
  s.setWorld({ width: 256, depth: 256, image: () => { throw new Error('sin imagen'); }, zones: [], coords: (x, y) => [x, y], waters: [], atlas });
  s.setCharacter(name);
  return s;
}

const frame = (x: number, y: number, inside: string | null = null) => ({
  player: { x, y }, cameraYaw: 0, inside, enemies: [], npcs: [], loot: [], stones: [], quest: null,
});

describe('mapa de Panamá', () => {
  it('el atlas entero cabe en el lienzo, con el norte arriba', () => {
    const f = fitAtlas(atlas, 800, 500);
    const e = atlasExtent(atlas);
    const sw = worldToAtlasView(f, e.x0, e.z0);
    const ne = worldToAtlasView(f, e.x1, e.z1);
    for (const p of [sw, ne]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(500);
    }
    expect(ne.y).toBeLessThan(sw.y);
  });

  it('un píxel se convierte en la región que hay debajo', () => {
    const f = fitAtlas(atlas, 800, 500);
    const r = atlas.regions.find((x) => x.id === 'los_santos')!;
    const c = regionCenter(atlas, r);
    expect(regionAt(atlas, c.x, c.z)?.id).toBe('los_santos');
    expect(regionAtView(atlas, f, worldToAtlasView(f, c.x, c.z))?.id).toBe('los_santos');
    expect(regionAtView(atlas, f, { x: 1, y: 1 })).toBeNull();
  });

  it('una región se descubre al pisarla y queda guardada para ese personaje', () => {
    const store = new Store();
    const s = state(store);
    expect(s.regions.size).toBe(0);
    s.update(frame(128, 128), 1 / 60);
    expect([...s.regions]).toEqual(['los_santos']);
    s.flush();
    expect([...state(store).regions]).toEqual(['los_santos']);
    expect(state(store, 'Otro').regions.size).toBe(0);
  });

  it('dentro de una mazmorra o en el mar no se descubre nada', () => {
    const s = state(new Store());
    s.update(frame(128, 128, 'Cripta'), 1 / 60);
    expect(s.regions.size).toBe(0);
    s.update(frame(-5000, -5000), 2);
    expect(s.regions.size).toBe(0);
  });

  it('lo no descubierto no revela su nombre', () => {
    const r = atlas.regions.find((x) => x.id === 'los_santos')!;
    expect(regionInfo(r, false)).toBe('Sin descubrir');
    expect(regionInfo(r, true)).toContain(r.name ?? r.official);
    expect(regionInfo(r, true)).toContain('niv. 1–10');
  });
});
