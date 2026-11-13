// F26: los interiores se descubren al andar y cada lugar guarda su mapa.
import { describe, expect, it } from 'vitest';
import { NavGrid } from '../src/sim/navGrid';
import { interiorKey, InteriorMaps, interiorPixels } from '../src/ui/map/interiorMap';
import { MAP_DEF } from '../src/ui/map/mapData';
import { MapState } from '../src/ui/map/mapState';

/** Sala de 10 × 6 m con una pared alrededor (casillas de 0,5 m). */
function room(): NavGrid {
  const g = new NavGrid(12, 8, 0.5);
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const x = (c + 0.5) * 0.5;
      const y = (r + 0.5) * 0.5;
      if (x < 1 || y < 1 || x > 11 || y > 7) g.blocked[r * g.cols + c] = 1;
    }
  }
  return g;
}

const COLORS = { floor: [10, 20, 30] as [number, number, number], wall: [200, 100, 50] as [number, number, number] };

describe('F26: mapa de interiores', () => {
  it('empieza en blanco y descubre alrededor del jugador', () => {
    const g = room();
    const maps = new InteriorMaps();
    expect(maps.fogFor('Cripta · piso 1', g).explored).toBe(0);
    expect(maps.reveal('Cripta · piso 1', g, 6, 4, 3)).toBe(true);
    expect(maps.reveal('Cripta · piso 1', g, 6, 4, 3)).toBe(false);
    const fog = maps.fogFor('Cripta · piso 1', g);
    expect(fog.isRevealed(6, 4)).toBe(true);
    expect(fog.isRevealed(11, 7)).toBe(false);
  });

  it('pinta suelo donde se pisa y pared en el borde, solo lo descubierto', () => {
    const g = room();
    const maps = new InteriorMaps();
    maps.reveal('Casa', g, 1.5, 1.5, 2);
    const px = interiorPixels(g, maps.fogFor('Casa', g), COLORS);
    const at = (c: number, r: number): number[] => [...px.slice((r * g.cols + c) * 4, (r * g.cols + c) * 4 + 4)];
    expect(at(3, 3)).toEqual([10, 20, 30, 255]); // suelo
    expect(at(1, 3)).toEqual([200, 100, 50, 255]); // pared que toca el suelo
    expect(at(0, 0)).toEqual([0, 0, 0, 0]); // pared sin suelo al lado
    expect(at(20, 12)).toEqual([0, 0, 0, 0]); // sin descubrir
  });

  it('cada lugar y cada piso tiene su mapa, y se guarda y se lee', () => {
    const g = room();
    const a = new InteriorMaps();
    a.reveal('Cripta · piso 1', g, 6, 4, 2);
    const saved = JSON.parse(JSON.stringify(a.toJSON())) as unknown;
    const b = new InteriorMaps(saved);
    expect(b.fogFor('Cripta · piso 1', g).isRevealed(6, 4)).toBe(true);
    expect(b.fogFor('Cripta · piso 2', g).explored).toBe(0);
    // Otra rejilla con el mismo nombre (rediseño): empieza de cero.
    expect(interiorKey('Cripta · piso 1', new NavGrid(20, 8, 0.5))).not.toBe(interiorKey('Cripta · piso 1', g));
  });

  it('el estado del mapa lo descubre al andar dentro y lo guarda por personaje', () => {
    const store = new Map<string, string>();
    const kv = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    const st = new MapState(MAP_DEF, kv as never);
    st.setWorld({ width: 100, depth: 100, image: () => { throw new Error('sin imagen'); }, zones: [], coords: () => [0, 0], waters: [] });
    st.setCharacter('Ana');
    const g = room();
    st.update({ player: { x: 6, y: 4 }, cameraYaw: 0, inside: 'Banco', interiorGrid: g, enemies: [], npcs: [], loot: [], stones: [], landmarks: [], quest: null }, 1 / 60);
    expect(st.interiors.fogFor('Banco', g).isRevealed(6, 4)).toBe(true);
    st.flush();
    expect([...store.keys()].some((k) => k.startsWith('frankmangames.mapInside.'))).toBe(true);
  });
});
