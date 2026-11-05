import { describe, expect, it } from 'vitest';
import zones from '../data/zones.json';
import definitions from '../data/art/patterns.json';
import { PATTERN_FAMILIES, PATTERN_PALETTES, patternCssUrl, patternGrid, patternRgba, patternSvg, zonePattern } from '../src/art/patterns';

describe('biblioteca de patrones', () => {
  it('hay seis familias distintas, con varios colores y casillas cuadradas', () => {
    expect(PATTERN_FAMILIES).toHaveLength(6);
    const seen = new Set<string>();
    for (const family of PATTERN_FAMILIES) {
      const g = patternGrid(family);
      expect(g.cells).toHaveLength(g.size * g.size);
      const used = new Set(g.cells);
      expect(used.size, family).toBeGreaterThanOrEqual(3);
      expect(Math.max(...used), family).toBeLessThanOrEqual(3);
      seen.add(g.cells.join());
    }
    expect(seen.size).toBe(6);
  });

  it('cada paleta tiene cuatro colores válidos', () => {
    for (const palette of PATTERN_PALETTES) {
      const { colors } = definitions.palettes[palette];
      expect(colors).toHaveLength(4);
      for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('los píxeles y el SVG salen de la misma casilla', () => {
    const g = patternGrid('rombos');
    const { size, data } = patternRgba('rombos', 'tierra', 2);
    expect(size).toBe(g.size * 2);
    expect(data).toHaveLength(size * size * 4);
    expect(patternSvg('rombos', 'tierra')).toContain(`viewBox="0 0 ${g.size} ${g.size}"`);
    expect(patternCssUrl('rombos', 'tierra').startsWith('url("data:image/svg+xml,')).toBe(true);
  });

  it('cada zona del mapa tiene su lenguaje geométrico, y no se repite', () => {
    const pairs = new Set<string>();
    for (const z of zones.zones) {
      const p = zonePattern(z.id);
      expect(p, z.id).not.toBeNull();
      expect(PATTERN_FAMILIES).toContain(p!.family);
      expect(PATTERN_PALETTES).toContain(p!.palette);
      pairs.add(`${p!.family}:${p!.palette}`);
    }
    expect(pairs.size).toBe(zones.zones.length);
    expect(Object.keys(definitions.zones).sort()).toEqual(zones.zones.map((z) => z.id).sort());
  });

  it('la zona embrujada no usa un patrón muy cercano a una tradición concreta', () => {
    expect(['laberinto', 'zigzag', 'anidados']).not.toContain(zonePattern('ancon')!.family);
  });
});
