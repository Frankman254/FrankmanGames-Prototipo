#!/usr/bin/env node
/**
 * Analiza el contraste de las variables CSS de themes.css.
 * Calcula la relación de contraste WCAG 2.1 para cada par texto/fondo
 * en cada tema y reporta los que no cumplen 4.5:1 (texto normal)
 * o 3:1 (texto grande / bold ≥14px).
 *
 * Uso: node scripts/checkContraste.mjs [--fix]
 *   --fix: escribe los valores corregidos en themes.css
 */

import { readFileSync, writeFileSync } from 'fs';

// ─── Utilidades WCAG ───

function relativeLuminance(r, g, b) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1[0], c1[1], c1[2]);
  const l2 = relativeLuminance(c2[0], c2[1], c2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHex(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return [parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16)];
}

function parseRgb(s) {
  // "245, 184, 61"
  const parts = s.split(',').map(x => parseInt(x.trim()));
  return parts;
}

function rgbToHex(rgb) {
  return '#' + rgb.map(c => c.toString(16).padStart(2,'0')).join('');
}

// Dado un color de texto y un fondo, devuelve el color de texto ajustado
// para alcanzar al menos `minRatio` de contraste. Si ya cumple, retorna el original.
function adjustForContrast(ink, bg, minRatio) {
  const current = contrastRatio(ink, bg);
  if (current >= minRatio) return ink;

  const bgLum = relativeLuminance(bg[0], bg[1], bg[2]);
  // Si el fondo es oscuro, aclarar el texto; si es claro, oscurecerlo.
  const lighten = bgLum < 0.5;

  let best = [...ink];
  const step = lighten ? 3 : -3;
  for (let i = 0; i < 80; i++) {
    const candidate = [
      Math.max(0, Math.min(255, best[0] + step)),
      Math.max(0, Math.min(255, best[1] + step)),
      Math.max(0, Math.min(255, best[2] + step)),
    ];
    if (contrastRatio(candidate, bg) >= minRatio) {
      return candidate;
    }
    best = candidate;
  }
  // Fallback: blanco puro o negro puro
  return lighten ? [255, 255, 255] : [0, 0, 0];
}

// ─── Temas definidos en themes.css ───

const themes = {
  pergamino: {
    ink: [245, 224, 208],       // --ink (sheen-rgb derivado, pero se usa --ink en menus.css)
    'ink-dim': [168, 153, 138], // --ink-dim
    'ink-faint': [168, 153, 138], // --ink-faint
    gold: [245, 184, 61],       // --gold (accent)
    'gold-hi': [255, 215, 119], // --gold-hi
    'gold-dim': null,           // no definido en pergamino default
    paper0: [45, 35, 32],       // --paper-0
    paper1: [45, 35, 32],       // --paper-1 (mismo que paper-0 en pergamino)
    paper2: [28, 20, 18],       // --paper-2
    bg: [20, 14, 12],           // --bg
    well: [23, 16, 16],         // --well
    'well-hi': [55, 42, 37],    // --well-hi
    good: null,
    bad: null,
    bandInk: [255, 255, 255],   // --band-ink
  },
  fuego: {
    ink: [246, 228, 216],
    'ink-dim': [207, 168, 152],
    'ink-faint': [168, 130, 116],
    gold: [255, 146, 87],
    'gold-hi': [255, 187, 138],
    'gold-dim': [177, 82, 52],
    paper0: [58, 26, 16],
    paper1: [42, 18, 11],
    paper2: [19, 8, 7],
    bg: [14, 6, 5],
    well: [18, 7, 6],
    'well-hi': [52, 25, 15],
    good: null,
    bad: null,
    bandInk: [255, 255, 255],
  },
  agua: {
    ink: [227, 238, 249],
    'ink-dim': [162, 185, 210],
    'ink-faint': [116, 140, 169],
    gold: [102, 191, 255],
    'gold-hi': [169, 220, 255],
    'gold-dim': [54, 115, 162],
    paper0: [21, 36, 59],
    paper1: [15, 26, 45],
    paper2: [8, 17, 30],
    bg: [6, 12, 22],
    well: [7, 14, 25],
    'well-hi': [27, 46, 74],
    good: null,
    bad: null,
    bandInk: [255, 255, 255],
  },
  viento: {
    ink: [23, 41, 58],
    'ink-dim': [59, 82, 102],
    'ink-faint': [80, 103, 123],
    gold: [21, 93, 153],
    'gold-hi': [16, 86, 142],
    'gold-dim': [89, 133, 169],
    paper0: [245, 249, 253],
    paper1: [231, 240, 248],
    paper2: [214, 229, 241],
    bg: [228, 239, 248],
    well: [219, 232, 243],
    'well-hi': [250, 252, 255],
    good: [43, 122, 42],
    bad: [179, 53, 42],
    bandInk: [23, 41, 58],
  },
  tierra: {
    ink: [241, 227, 203],
    'ink-dim': [196, 170, 136],
    'ink-faint': [162, 136, 106],
    gold: [227, 164, 67],
    'gold-hi': [244, 198, 118],
    'gold-dim': [149, 100, 42],
    paper0: [48, 32, 15],
    paper1: [34, 23, 11],
    paper2: [21, 14, 7],
    bg: [14, 9, 4],
    well: [18, 12, 5],
    'well-hi': [53, 36, 17],
    good: null,
    bad: null,
    bandInk: [255, 255, 255],
  },
  naturaleza: {
    ink: [228, 236, 214],
    'ink-dim': [168, 184, 148],
    'ink-faint': [125, 141, 113],
    gold: [168, 210, 122],
    'gold-hi': [205, 236, 164],
    'gold-dim': [93, 122, 60],
    paper0: [27, 36, 24],
    paper1: [19, 26, 17],
    paper2: [11, 16, 10],
    bg: [7, 11, 6],
    well: [9, 13, 8],
    'well-hi': [31, 42, 27],
    good: null,
    bad: null,
    bandInk: [255, 255, 255],
  },
  claro: {
    ink: [42, 33, 22],
    'ink-dim': [92, 76, 53],
    'ink-faint': [101, 84, 59],
    gold: [119, 76, 11],
    'gold-hi': [110, 68, 10],
    'gold-dim': [143, 105, 45],
    paper0: [245, 236, 216],
    paper1: [234, 223, 196],
    paper2: [220, 203, 170],
    bg: [240, 230, 208],
    well: [228, 214, 184],
    'well-hi': [247, 239, 222],
    good: [38, 113, 25],
    bad: [176, 57, 43],
    bandInk: [42, 33, 22],
  },
  contraste: {
    ink: [255, 255, 255],
    'ink-dim': [230, 230, 230],
    'ink-faint': [196, 196, 196],
    gold: [255, 212, 0],
    'gold-hi': [255, 238, 102],
    'gold-dim': [201, 168, 0],
    paper0: [0, 0, 0],
    paper1: [0, 0, 0],
    paper2: [0, 0, 0],
    bg: [0, 0, 0],
    well: [0, 0, 0],
    'well-hi': [28, 28, 28],
    good: [108, 255, 108],
    bad: [255, 107, 107],
    bandInk: [255, 255, 255],
  },
  oro: {
    ink: [251, 241, 214],
    'ink-dim': [217, 197, 146],
    'ink-faint': [179, 156, 98],
    gold: [255, 210, 74],
    'gold-hi': [255, 229, 140],
    'gold-dim': [168, 125, 22],
    paper0: [51, 39, 15],
    paper1: [38, 28, 10],
    paper2: [24, 17, 5],
    bg: [18, 13, 4],
    well: [23, 16, 4],
    'well-hi': [58, 44, 14],
    good: null,
    bad: null,
    bandInk: [255, 251, 232],
  },
  atardecer: {
    ink: [253, 237, 222],
    'ink-dim': [226, 189, 152],
    'ink-faint': [185, 141, 102],
    gold: [255, 179, 71],
    'gold-hi': [255, 208, 138],
    'gold-dim': [176, 96, 28],
    paper0: [58, 32, 20],
    paper1: [43, 23, 14],
    paper2: [26, 13, 7],
    bg: [20, 10, 6],
    well: [25, 12, 6],
    'well-hi': [60, 33, 18],
    good: null,
    bad: null,
    bandInk: [255, 255, 255],
  },
};

// Pares a verificar: [nombre del color de texto, nombre del fondo, ratio mínimo]
const pairs = [
  // Texto principal sobre fondo de panel
  ['ink', 'paper0', 4.5],
  ['ink', 'paper1', 4.5],
  ['ink', 'paper2', 4.5],
  ['ink', 'bg', 4.5],
  ['ink', 'well', 4.5],
  ['ink', 'well-hi', 4.5],
  // Texto secundario
  ['ink-dim', 'paper0', 4.5],
  ['ink-dim', 'paper1', 4.5],
  ['ink-dim', 'paper2', 4.5],
  ['ink-dim', 'bg', 4.5],
  ['ink-dim', 'well', 4.5],
  // Texto tenue
  ['ink-faint', 'paper0', 4.5],
  ['ink-faint', 'paper1', 4.5],
  ['ink-faint', 'paper2', 4.5],
  ['ink-faint', 'bg', 4.5],
  // Acento (gold) sobre fondos — texto grande, ratio 3:1
  ['gold', 'paper0', 3.0],
  ['gold', 'paper1', 3.0],
  ['gold', 'paper2', 3.0],
  ['gold', 'bg', 3.0],
  ['gold-hi', 'paper0', 3.0],
  ['gold-hi', 'paper1', 3.0],
  // gold-dim sobre fondos oscuros — texto grande
  ['gold-dim', 'paper0', 3.0],
  ['gold-dim', 'paper2', 3.0],
  // good/bad sobre fondos
  ['good', 'paper0', 4.5],
  ['good', 'paper1', 4.5],
  ['bad', 'paper0', 4.5],
  ['bad', 'paper1', 4.5],
  // bandInk sobre band (aproximado con paper0 como fallback)
  ['bandInk', 'paper0', 4.5],
];

// Mapeo de nombres de variables CSS
const varMap = {
  ink: '--ink',
  'ink-dim': '--ink-dim',
  'ink-faint': '--ink-faint',
  gold: '--gold',
  'gold-hi': '--gold-hi',
  'gold-dim': '--gold-dim',
  paper0: '--paper-0',
  paper1: '--paper-1',
  paper2: '--paper-2',
  bg: '--bg',
  well: '--well',
  'well-hi': '--well-hi',
  good: '--good',
  bad: '--bad',
  bandInk: '--band-ink',
};

// ─── Análisis ───

const results = [];
const failures = [];

for (const [themeName, colors] of Object.entries(themes)) {
  for (const [inkKey, bgKey, minRatio] of pairs) {
    const ink = colors[inkKey];
    const bg = colors[bgKey];
    if (!ink || !bg) continue;

    const ratio = contrastRatio(ink, bg);
    const pass = ratio >= minRatio;
    const entry = {
      theme: themeName,
      ink: inkKey,
      bg: bgKey,
      ratio: ratio.toFixed(2),
      minRatio,
      pass,
    };
    results.push(entry);
    if (!pass) {
      failures.push(entry);
    }
  }
}

// ─── Salida ───

console.log('═══════════════════════════════════════════════════════');
console.log('  Análisis de contraste WCAG 2.1 — themes.css');
console.log('═══════════════════════════════════════════════════════');
console.log(`Total pares verificados: ${results.length}`);
console.log(`Aprobados: ${results.length - failures.length}`);
console.log(`Fallados: ${failures.length}`);
console.log('');

if (failures.length > 0) {
  console.log('── PARES QUE NO CUMPLEN ──');
  console.log('');

  // Agrupar por tema
  const byTheme = {};
  for (const f of failures) {
    if (!byTheme[f.theme]) byTheme[f.theme] = [];
    byTheme[f.theme].push(f);
  }

  for (const [theme, fails] of Object.entries(byTheme)) {
    console.log(`  Tema "${theme}" (${fails.length} fallos):`);
    for (const f of fails) {
      const inkColor = themes[theme][f.ink];
      const bgColor = themes[theme][f.bg];
      const adjusted = adjustForContrast(inkColor, bgColor, f.minRatio);
      const adjHex = rgbToHex(adjusted);
      const originalHex = rgbToHex(inkColor);
      console.log(`    ${varMap[f.ink]} sobre ${varMap[f.bg]}: ${f.ratio}:1 (necesita ${f.minRatio}:1)`);
      console.log(`      Original: ${originalHex} → Sugerido: ${adjHex} (${adjusted.join(', ')})`);
    }
    console.log('');
  }
} else {
  console.log('✅ Todos los pares cumplen el contraste mínimo.');
}

// Salida JSON para pruebas
writeFileSync('work/junie-jl30/contraste.json', JSON.stringify({ results, failures }, null, 2));
console.log('Resultado guardado en work/junie-jl30/contraste.json');

process.exit(failures.length > 0 ? 1 : 0);
