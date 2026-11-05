// Escribe la biblioteca de patrones: un PNG y un SVG por familia y paleta, y un catálogo.
//   npm run patterns
// Blender usa estos PNG (scripts/blender/estandarte.py); el juego los calcula al vuelo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { PATTERN_FAMILIES, PATTERN_PALETTES, patternRgba, patternSvg } from '../../src/art/patterns';

const OUT = join('arte', 'patrones');
const SCALE = 8;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc(body), body.length + 4);
  return out;
}

function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array())]);
}

mkdirSync(join(OUT, 'svg'), { recursive: true });
for (const family of PATTERN_FAMILIES) for (const palette of PATTERN_PALETTES) {
  const t = patternRgba(family, palette, SCALE);
  writeFileSync(join(OUT, `${family}_${palette}.png`), png(t.size, t.size, t.data));
  writeFileSync(join(OUT, 'svg', `${family}_${palette}.svg`), patternSvg(family, palette));
}

// Catálogo: una fila por familia, una columna por paleta; cada muestra repite su casilla.
const SWATCH = 192;
const GAP = 12;
const w = PATTERN_PALETTES.length * (SWATCH + GAP) + GAP;
const h = PATTERN_FAMILIES.length * (SWATCH + GAP) + GAP;
const sheet = new Uint8Array(w * h * 4).fill(255);
PATTERN_FAMILIES.forEach((family, row) => PATTERN_PALETTES.forEach((palette, col) => {
  const t = patternRgba(family, palette, 3);
  for (let y = 0; y < SWATCH; y++) for (let x = 0; x < SWATCH; x++) {
    const from = ((y % t.size) * t.size + (x % t.size)) * 4;
    const to = ((GAP + row * (SWATCH + GAP) + y) * w + GAP + col * (SWATCH + GAP) + x) * 4;
    sheet.set(t.data.subarray(from, from + 4), to);
  }
}));
writeFileSync(join(OUT, 'catalogo.png'), png(w, h, sheet));
console.log(`${PATTERN_FAMILIES.length * PATTERN_PALETTES.length} patrones y catalogo.png en ${OUT}`);
