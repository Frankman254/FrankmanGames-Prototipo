// Minimapa con tamaño libre (hud-arreglos): cualquier proporción entre los
// límites de los datos, la imagen se recorta (no se estira) y el tamaño va en
// el perfil del HUD.
import { describe, expect, it } from 'vitest';
import { HudProfileBook, normalizeProfiles, parseMinimapSize } from '../../src/ui/map/hudProfiles';
import { MAP_DEF } from '../../src/ui/map/mapData';
import { clampMinimapSize, clampToBox, minimapPixelsPerMeter, minimapToWorld, projectToMinimap, resizeMinimap } from '../../src/ui/map/mapLogic';

const d = { size: 220, minSize: 140, maxSize: 420, radius: 48 };

function memStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('minimapa redimensionable', () => {
  it('cada lado va por su cuenta: ancho por el borde izquierdo, alto por el de abajo', () => {
    const start = { w: 220, h: 220 };
    expect(resizeMinimap(start, -100, 999, 1, { w: true, h: false }, d)).toEqual({ w: 320, h: 220 });
    expect(resizeMinimap(start, -999, 60, 1, { w: false, h: true }, d)).toEqual({ w: 220, h: 280 });
    // Esquina: los dos a la vez, en la proporción que salga del gesto.
    expect(resizeMinimap(start, -150, -60, 1, { w: true, h: true }, d)).toEqual({ w: 370, h: 160 });
  });

  it('respeta los límites de los datos', () => {
    expect(resizeMinimap({ w: 220, h: 220 }, 500, -500, 1, { w: true, h: true }, d)).toEqual({ w: 140, h: 140 });
    expect(resizeMinimap({ w: 220, h: 220 }, -900, 900, 1, { w: true, h: true }, d)).toEqual({ w: 420, h: 420 });
    expect(clampMinimapSize({ w: Number.NaN, h: 300 }, d)).toEqual({ w: 140, h: 300 });
    // Los datos reales dejan sitio para formas no cuadradas.
    expect(MAP_DEF.minimap.maxSize).toBeGreaterThan(MAP_DEF.minimap.minSize);
  });

  it('el gesto en pantalla se divide por la escala de la interfaz', () => {
    expect(resizeMinimap({ w: 220, h: 220 }, -150, 75, 1.5, { w: true, h: true }, d)).toEqual({ w: 320, h: 270 });
  });

  it('la escala del mapa no depende del tamaño: agrandar enseña más terreno', () => {
    const k = minimapPixelsPerMeter(d, 1, 1);
    // Con el tamaño por defecto y zoom 1, del centro al borde hay `radius` metros.
    expect((d.size / 2) / k).toBeCloseTo(d.radius);
    // Un minimapa apaisado: misma escala, más metros a los lados que arriba.
    const w = 400, h = 160;
    const c = { x: 100, y: 100 };
    const east = minimapToWorld({ x: w, y: h / 2 }, c, 0, k, w, h);
    const north = minimapToWorld({ x: w / 2, y: 0 }, c, 0, k, w, h);
    expect(east.x - c.x).toBeCloseTo((w / 2) / k);
    expect(north.y - c.y).toBeCloseTo((h / 2) / k);
    // Proyectar y deshacer devuelve el mismo punto (no hay estiramiento por eje).
    const p = { x: 113, y: 92 };
    const q = projectToMinimap(p, c, 0.7, k, w, h);
    const back = minimapToWorld(q, c, 0.7, k, w, h);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
    // Escala de la interfaz y dpr sólo multiplican píxeles del lienzo.
    expect(minimapPixelsPerMeter(d, 2, 3)).toBeCloseTo(k * 6);
  });

  it('la flecha de misión se pega al borde de un rectángulo', () => {
    const w = 300, h = 100;
    expect(clampToBox({ x: 260, y: 50 }, w, 10, h).outside).toBe(false);
    expect(clampToBox({ x: 150, y: -500 }, w, 10, h)).toMatchObject({ x: 150, y: 10, outside: true });
    expect(clampToBox({ x: 1000, y: 50 }, w, 10, h)).toMatchObject({ x: 290, y: 50, outside: true });
    // En diagonal toca primero el borde de arriba (el lado corto).
    const diag = clampToBox({ x: 150 + 400, y: 50 - 400 }, w, 10, h);
    expect(diag.y).toBeCloseTo(10);
    expect(diag.x).toBeCloseTo(190);
  });

  it('el tamaño se guarda en el perfil del HUD; los perfiles de antes (cuadrados) se leen', () => {
    expect(parseMinimapSize(260)).toEqual({ w: 260, h: 260 });
    expect(parseMinimapSize({ w: 300, h: 180 })).toEqual({ w: 300, h: 180 });
    expect(parseMinimapSize({ w: 'x', h: 1 })).toBeNull();
    expect(parseMinimapSize(-5)).toBeNull();
    const old = normalizeProfiles({ active: 'p1', profiles: [{ id: 'p1', name: 'A', positions: {}, minimapSize: 250 }] });
    expect(old.profiles[0]!.minimapSize).toEqual({ w: 250, h: 250 });

    const store = memStore();
    const book = new HudProfileBook(store);
    book.setMinimapSize({ w: 333.4, h: 151.6 });
    const copy = book.create('Apaisado');
    expect(copy.minimapSize).toEqual({ w: 333, h: 152 });
    copy.minimapSize!.w = 999; // la copia no comparte el objeto con el original
    book.switchTo('p1');
    expect(book.active.minimapSize).toEqual({ w: 333, h: 152 });
    expect(new HudProfileBook(store).active.minimapSize).toEqual({ w: 333, h: 152 });
  });
});
