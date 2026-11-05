// Biblioteca de patrones geométricos propios de FrankmanGames. Cada patrón se calcula
// aquí, sin copiar ninguna pieza: una casilla repetible de índices de color. Sirve al
// juego (texturas y cenefas), a `scripts/art/exportPatterns.ts` y, por sus PNG, a Blender.
import definitions from '../../data/art/patterns.json';

export type PatternFamily = 'laberinto' | 'zigzag' | 'rombos' | 'anidados' | 'escalones' | 'estrella';
export type PatternPalette = keyof typeof definitions.palettes;

export const PATTERN_FAMILIES = Object.keys(definitions.families) as PatternFamily[];
export const PATTERN_PALETTES = Object.keys(definitions.palettes) as PatternPalette[];

/** Casilla repetible: `cells[y * size + x]` es un índice de la paleta (0 = fondo). */
export interface PatternGrid {
  size: number;
  cells: Uint8Array;
}

function grid(size: number, color: (x: number, y: number) => number): PatternGrid {
  const cells = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) cells[y * size + x] = color(x, y);
  return { size, cells };
}

/** Espiral cuadrada: una línea que se cierra sobre sí misma, con un núcleo de otro color. */
function laberinto(): PatternGrid {
  const size = 16;
  const lines = new Uint8Array(size * size);
  let x = 1;
  let y = 1;
  let dx = 1;
  let dy = 0;
  let run = size - 3;
  let turns = 0;
  while (run > 0) {
    for (let i = 0; i < run; i++) {
      lines[y * size + x] = 1;
      x += dx;
      y += dy;
    }
    [dx, dy] = [-dy, dx];
    // La primera vuelta da tres lados largos; después, cada dos giros se acorta dos casillas.
    turns++;
    if (turns >= 3 && turns % 2 === 1) run -= 2;
  }
  return grid(size, (cx, cy) => {
    if (lines[cy * size + cx]) return 1;
    if (Math.max(Math.abs(cx - 7.5), Math.abs(cy - 7.5)) < 1) return 2;
    // Puntos en las esquinas del borde para que al repetirse se note la unión.
    return (cx === 0 || cx === size - 1) && (cy === 0 || cy === size - 1) ? 3 : 0;
  });
}

/** Franjas de dientes en zigzag, de tres colores. */
function zigzag(): PatternGrid {
  return grid(16, (x, y) => {
    const tooth = Math.abs((x % 8) - 4);
    const band = (y + tooth) % 8;
    if (band < 2) return 1;
    if (band === 4) return 2;
    return band === 5 ? 3 : 0;
  });
}

/** Malla de rombos con cruces en los nudos y un corazón en cada rombo. */
function rombos(): PatternGrid {
  const size = 12;
  const c = size / 2;
  return grid(size, (x, y) => {
    const d = Math.abs(x - c) + Math.abs(y - c);
    if (d === 6) return 1;
    if (d === 3) return 3;
    if (d <= 1) return 2;
    return 0;
  });
}

/** Triángulos dentro de triángulos, y los mismos invertidos en los huecos. */
function anidados(): PatternGrid {
  const size = 16;
  return grid(size, (x, y) => {
    const half = (y + 1) / 2;
    const dx = Math.abs(x - 7.5);
    if (dx < half) {
      // Dentro: por capas, medidas hasta el lado más cercano.
      const depth = Math.floor(Math.min(half - dx, size - y) / 1.5);
      return [1, 0, 2, 0, 3][Math.min(depth, 4)]!;
    }
    const outer = Math.floor((dx - half) / 1.5);
    return outer % 2 === 1 ? 3 : 0;
  });
}

/** Bandas: línea, escalera, anillos y otra escalera invertida. */
function escalones(): PatternGrid {
  return grid(16, (x, y) => {
    const block = Math.floor(x / 2) % 2;
    if (y < 2) return 1;
    if (y === 3 || y === 4) return block === 0 ? 2 : 0;
    if (y === 5 || y === 11) return block === 1 ? 2 : 0;
    if (y === 12 || y === 13) return block === 0 ? 2 : 0;
    const ring = Math.max(Math.abs((x % 8) - 3.5), Math.abs(y - 8));
    return ring < 2.5 && ring >= 1.5 ? 3 : 0;
  });
}

/** Estrella de ocho puntas: un cuadrado y un rombo superpuestos, con centro propio. */
function estrella(): PatternGrid {
  const size = 24;
  const c = 11.5;
  return grid(size, (x, y) => {
    const dx = Math.abs(x - c);
    const dy = Math.abs(y - c);
    const star = (r: number): boolean => Math.max(dx, dy) < r || dx + dy < r * 1.9;
    if (star(1.8)) return 2;
    if (star(3.2)) return 3;
    if (star(5.6)) return 1;
    return Math.abs(dx - 11.5) + Math.abs(dy - 11.5) < 3 ? 3 : 0;
  });
}

const BUILDERS: Record<PatternFamily, () => PatternGrid> = { laberinto, zigzag, rombos, anidados, escalones, estrella };
const cache = new Map<PatternFamily, PatternGrid>();

export function patternGrid(family: PatternFamily): PatternGrid {
  let g = cache.get(family);
  if (!g) {
    g = BUILDERS[family]();
    cache.set(family, g);
  }
  return g;
}

export function paletteColors(palette: PatternPalette): readonly string[] {
  return definitions.palettes[palette].colors;
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Píxeles RGBA de una casilla, de arriba abajo, con `scale` píxeles por celda. */
export function patternRgba(family: PatternFamily, palette: PatternPalette, scale = 1): { size: number; data: Uint8Array } {
  const g = patternGrid(family);
  const colors = paletteColors(palette).map(rgb);
  const size = g.size * scale;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = colors[g.cells[Math.floor(y / scale) * g.size + Math.floor(x / scale)]!]!;
    const i = (y * size + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  }
  return { size, data };
}

/** SVG de una casilla, con una fila de rectángulos por tramo de un mismo color. */
export function patternSvg(family: PatternFamily, palette: PatternPalette): string {
  const g = patternGrid(family);
  const colors = paletteColors(palette);
  const rects: string[] = [];
  for (let y = 0; y < g.size; y++) {
    let x = 0;
    while (x < g.size) {
      const c = g.cells[y * g.size + x]!;
      let end = x + 1;
      while (end < g.size && g.cells[y * g.size + end] === c) end++;
      if (c !== 0) rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${colors[c]}"/>`);
      x = end;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.size} ${g.size}" width="${g.size}" height="${g.size}" shape-rendering="crispEdges"><rect width="${g.size}" height="${g.size}" fill="${colors[0]}"/>${rects.join('')}</svg>`;
}

/** Fondo CSS repetible de una casilla: la cenefa de la interfaz. */
export function patternCssUrl(family: PatternFamily, palette: PatternPalette): string {
  return `url("data:image/svg+xml,${encodeURIComponent(patternSvg(family, palette))}")`;
}

/** Lenguaje geométrico de una zona; null si no tiene. */
export function zonePattern(zoneId: string): { family: PatternFamily; palette: PatternPalette } | null {
  const z = (definitions.zones as Record<string, { family: string; palette: string } | undefined>)[zoneId];
  return z ? { family: z.family as PatternFamily, palette: z.palette as PatternPalette } : null;
}
