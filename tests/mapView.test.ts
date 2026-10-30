import { describe, expect, it } from 'vitest';
import terrainJson from '../data/terrain.json';
import type { QuestDef } from '../src/rpg/contracts';
import { MAP_DEF } from '../src/ui/map/mapData';
import { buildMapImage, hexRgb } from '../src/ui/map/mapImage';
import { FlagBook, bearing, clampToBox, panView, projectToMinimap, questTarget, viewToWorld, worldToView, zoomAt } from '../src/ui/map/mapLogic';
import { generateHeightField, type TerrainDef } from '../src/world/terrain';

describe('minimapa', () => {
  it('con norte fijo el norte queda arriba y el este a la derecha', () => {
    const c = { x: 50, y: 50 };
    expect(projectToMinimap({ x: 50, y: 60 }, c, 0, 2, 200)).toEqual({ x: 100, y: 80 });
    expect(projectToMinimap({ x: 60, y: 50 }, c, 0, 2, 200)).toEqual({ x: 120, y: 100 });
  });

  it('girando con la cámara, lo que tiene delante queda arriba', () => {
    const c = { x: 0, y: 0 };
    // Cámara mirando al este (yaw 90°): un punto al este sale arriba.
    const p = projectToMinimap({ x: 10, y: 0 }, c, Math.PI / 2, 1, 100);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(40);
  });

  it('lleva al borde del cuadrado lo que queda fuera (flecha de misión)', () => {
    const inside = clampToBox({ x: 60, y: 40 }, 100, 10);
    expect(inside.outside).toBe(false);
    const out = clampToBox({ x: 50, y: -500 }, 100, 10);
    expect(out).toMatchObject({ x: 50, y: 10, outside: true });
    expect(out.angle).toBeCloseTo(-Math.PI / 2);
  });

  it('rumbo: 0 al norte, π/2 al este', () => {
    expect(bearing({ x: 0, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(0);
    expect(bearing({ x: 0, y: 0 }, { x: 5, y: 0 })).toBeCloseTo(Math.PI / 2);
  });
});

describe('mapa grande', () => {
  it('el zoom deja quieto el punto bajo el cursor y respeta los límites', () => {
    const v = { cx: 128, cy: 128, zoom: 3 };
    const cursor = { x: 100, y: 50 };
    const before = viewToWorld(v, cursor, 800, 600);
    const z = zoomAt(v, cursor, 2, 800, 600, 1, 12);
    const after = viewToWorld(z, cursor, 800, 600);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAt(v, cursor, 100, 800, 600, 1, 12).zoom).toBe(12);
    const p = worldToView(z, before, 800, 600);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });

  it('arrastrar mueve la vista y no la deja salir del mundo', () => {
    const v = panView({ cx: 10, cy: 10, zoom: 2 }, { x: 100, y: 0 }, 256, 256);
    expect(v.cx).toBe(0);
    expect(panView({ cx: 100, cy: 100, zoom: 2 }, { x: -20, y: 20 }, 256, 256)).toEqual({ cx: 110, cy: 110, zoom: 2 });
  });

  it('las banderas guardadas se validan al leerlas y los ids no se repiten', () => {
    const b = new FlagBook(100, 100, 5, [{ id: 'f3', name: '', x: 500, y: 5 }, { id: 'f3', name: 'dup', x: 1, y: 1 }, { nada: 1 }]);
    expect(b.list).toEqual([{ id: 'f3', name: 'Bandera 1', x: 100, y: 5 }]);
    expect(b.add(1, 1)!.id).toBe('f4');
    expect(b.near({ x: 99, y: 6 }, 3)?.id).toBe('f3');
    expect(b.near({ x: 50, y: 50 }, 3)).toBeNull();
  });
});

describe('flecha de la misión seguida', () => {
  const def = {
    objectives: [
      { type: 'reach', x: 180, y: 132, radius: 7, text: 'Ir' },
      { type: 'talk', npcId: 'elder', text: 'Hablar' },
      { type: 'collect', itemId: 'x', count: 1, consume: false, text: 'Traer' },
    ],
  } as unknown as QuestDef;
  const npcAt = (id: string): { x: number; y: number } | null => (id === 'elder' ? { x: 10, y: 20 } : id === 'guard' ? { x: 5, y: 5 } : null);
  const view = (done: boolean[], state = 'active') => ({
    id: 'q', name: 'Q', state, turnIn: { id: 'guard', name: 'Guardia' }, objectives: done.map((d) => ({ done: d, text: 't' })),
  });

  it('apunta al primer objetivo sin cumplir que tenga lugar', () => {
    expect(questTarget(view([false, false, false]), def, npcAt, [], { x: 0, y: 0 })).toMatchObject({ x: 180, y: 132 });
    expect(questTarget(view([true, false, false]), def, npcAt, [], { x: 0, y: 0 })).toMatchObject({ x: 10, y: 20 });
    expect(questTarget(view([true, true, false]), def, npcAt, [], { x: 0, y: 0 })).toBeNull();
  });

  it('lista para entregar: al PNJ de la entrega; pesca: al agua más cercana', () => {
    expect(questTarget(view([true, true, true], 'ready'), def, npcAt, [], { x: 0, y: 0 })).toMatchObject({ x: 5, y: 5, label: 'Entregar a Guardia' });
    const fish = { objectives: [{ type: 'fish', itemIds: [], count: 3, text: 'Pescar' }] } as unknown as QuestDef;
    expect(questTarget(view([false]), fish, npcAt, [{ x: 100, y: 0 }, { x: 10, y: 0 }], { x: 0, y: 0 })).toMatchObject({ x: 10, y: 0 });
    expect(questTarget(null, def, npcAt, [], { x: 0, y: 0 })).toBeNull();
  });
});

describe('imagen base del mapa', () => {
  it('sale del terreno con su tamaño, agua en los estanques y casas', () => {
    const terrain = terrainJson as unknown as TerrainDef;
    const small: TerrainDef = { ...terrain, heightStep: 4 };
    const img = buildMapImage({
      terrain: small,
      heights: generateHeightField(small),
      props: [{ kind: 'house', x: 30, y: 30, w: 8, d: 8 }],
      trees: [],
      villages: [],
      pixelsPerMeter: 0.5,
      colors: MAP_DEF.colors,
    });
    expect(img.width).toBe(128);
    expect(img.height).toBe(128);
    const px = (x: number, y: number): number[] => {
      const o = (Math.floor((terrain.depth - y) * 0.5) * img.width + Math.floor(x * 0.5)) * 4;
      return [img.data[o]!, img.data[o + 1]!, img.data[o + 2]!];
    };
    const pond = terrain.ponds[0]!;
    expect(px(pond.x, pond.y)).toEqual(hexRgb(MAP_DEF.colors.water));
    expect(px(30, 30)).toEqual(hexRgb(MAP_DEF.colors.house));
  });

  it('los datos del mapa se validan', () => {
    expect(MAP_DEF.minimap.size).toBeGreaterThanOrEqual(MAP_DEF.minimap.minSize);
    expect(MAP_DEF.revealRadius).toBeGreaterThan(MAP_DEF.fogCellMeters);
  });
});
