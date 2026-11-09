// `node scripts/geografiaNaturalEarth.mjs <ne_10m_admin_0_countries.geojson> <ne_10m_admin_1_states_provinces.geojson>`
//
// Geografía real del atlas (data/panama.json) a partir de Natural Earth 1:10m (dominio público,
// naturalearthdata.com): costa de Panamá, Costa Rica y Colombia (`coast`) y la forma de cada
// provincia y comarca (`regions[].polygons`). Sustituye a los polígonos dibujados a mano y a la
// costa 1:50m; ya no hay recuadro a mano (`handBox`): la costa real manda en todas partes.
//   · Natural Earth no separa Panamá Oeste (2014): se corta la provincia de Panamá por el Canal,
//     con una línea aproximada (Balboa → Gamboa). Las islas siguen siendo de Panamá.
//   · Se conservan los islotes dibujados a mano que la costa real no trae (Iguanera, que el juego
//     agranda a propósito, y los cayos de Guna Yala).
// Los GeoJSON no se guardan en el repositorio.
import fs from 'node:fs';

const [admin0Path, admin1Path] = process.argv.slice(2);
const ATLAS = 'data/panama.json';
const B = { lonMin: -83.6, lonMax: -76.6, latMin: 7, latMax: 9.8 };
const TOL = 0.0018;
const MIN_AREA = 0.00002;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

function clipBox(ring) {
  const inside = [(p) => p[0] >= B.lonMin, (p) => p[0] <= B.lonMax, (p) => p[1] >= B.latMin, (p) => p[1] <= B.latMax];
  const cut = [
    (a, b) => [B.lonMin, a[1] + ((b[1] - a[1]) * (B.lonMin - a[0])) / (b[0] - a[0])],
    (a, b) => [B.lonMax, a[1] + ((b[1] - a[1]) * (B.lonMax - a[0])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((b[0] - a[0]) * (B.latMin - a[1])) / (b[1] - a[1]), B.latMin],
    (a, b) => [a[0] + ((b[0] - a[0]) * (B.latMax - a[1])) / (b[1] - a[1]), B.latMax],
  ];
  let pts = ring;
  for (let k = 0; k < 4 && pts.length; k++) pts = clipBy(pts, inside[k], cut[k]);
  return pts;
}

function clipBy(pts, inside, cut) {
  const res = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) res.push(a);
    if (ia !== ib) res.push(cut(a, b));
  }
  return res;
}

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1;
    let bd = 0;
    const [x1, y1] = pts[a];
    const [x2, y2] = pts[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / l;
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    if (bd > tol) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const area = (r) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s / 2);
};

function inRing(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const centroid = (r) => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];

/** Anillos exteriores de una geometría, recortados al atlas, simplificados y de mayor a menor. */
function rings(geometry, minArea = MIN_AREA) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const out = [];
  for (const poly of polys) {
    const c = clipBox(poly[0].slice(0, -1));
    if (c.length < 3) continue;
    let s = dp([...c, c[0]], TOL).slice(0, -1).map(([x, y]) => [r4(x), r4(y)]);
    if (s.length < 3) s = c.map(([x, y]) => [r4(x), r4(y)]);
    if (area(s) < minArea) continue;
    out.push(s);
  }
  return out.sort((a, b) => area(b) - area(a));
}

const admin0 = JSON.parse(fs.readFileSync(admin0Path, 'utf8'));
const admin1 = JSON.parse(fs.readFileSync(admin1Path, 'utf8'));
const atlas = JSON.parse(fs.readFileSync(ATLAS, 'utf8'));

// Costa.
const coast = {};
for (const [code, id] of [['PAN', 'panama'], ['CRI', 'costa_rica'], ['COL', 'colombia']]) {
  const f = admin0.features.find((x) => x.properties.ADM0_A3 === code);
  coast[id] = rings(f.geometry);
  console.log('costa', id, coast[id].length, 'anillos', coast[id].reduce((n, r) => n + r.length, 0), 'puntos');
}
const onRealLand = (lon, lat) => Object.values(coast).some((rs) => rs.some((r) => inRing(r, lon, lat)));

// Provincias y comarcas.
const NAMES = {
  'Bocas del Toro': 'bocas',
  'Chiriquí': 'chiriqui',
  'Kuna Yala': 'guna_yala',
  'Emberá': 'embera',
  'Darién': 'darien',
  'Panama': 'panama',
  'Coclé': 'cocle',
  'Veraguas': 'veraguas',
  'Colón': 'colon',
  'Ngöbe Buglé': 'ngabe',
  'Los Santos': 'los_santos',
  'Herrera': 'herrera',
};
const shapes = {};
for (const f of admin1.features.filter((x) => x.properties.adm0_a3 === 'PAN')) {
  const id = NAMES[f.properties.name];
  if (!id) throw new Error(`provincia sin id: ${f.properties.name}`);
  shapes[id] = rings(f.geometry);
}
// Panamá Oeste: lo que queda al oeste del Canal en la tierra firme de Panamá.
const A = [-79.55, 8.85];
const Bc = [-79.71, 9.17];
const side = (p) => (Bc[0] - A[0]) * (p[1] - A[1]) - (Bc[1] - A[1]) * (p[0] - A[0]); // > 0: oeste
const cutCanal = (a, b) => {
  const sa = side(a);
  const t = sa / (sa - side(b));
  return [r4(a[0] + (b[0] - a[0]) * t), r4(a[1] + (b[1] - a[1]) * t)];
};
const [mainland, ...panamaIslands] = shapes.panama;
shapes.panama_oeste = [clipBy(mainland, (p) => side(p) > 0, cutCanal)];
shapes.panama = [clipBy(mainland, (p) => side(p) <= 0, cutCanal), ...panamaIslands];

for (const region of atlas.regions) {
  if (region.kind === 'pais') {
    region.polygons = coast[region.id] ?? region.polygons;
    continue;
  }
  const real = shapes[region.id];
  if (!real) throw new Error(`región sin forma real: ${region.id}`);
  // Islotes a mano que la costa real no trae.
  const kept = region.polygons.slice(1).filter((ring) => !onRealLand(...centroid(ring)));
  region.polygons = [...real, ...kept];
  console.log('región', region.id, real.length, 'reales +', kept.length, 'a mano', real.reduce((n, r) => n + r.length, 0), 'puntos');
}

atlas.coast = coast;
delete atlas.handBox;
atlas._coast =
  'Geografía real (2026-11-09): costa y forma de provincias y comarcas de Natural Earth 1:10m (Admin 0 y Admin 1, dominio público, naturalearthdata.com), recortadas al atlas y simplificadas a 0,0018° (unos 2 m de juego) con scripts/geografiaNaturalEarth.mjs. Panamá Oeste no existe en Natural Earth: se corta la provincia de Panamá por el Canal con una línea aproximada. Se conservan los islotes a mano que la costa real no trae (Iguanera, agrandada a propósito, y cayos de Guna Yala). Relieve real en data/relieve.json (reliefScale lo lleva a metros de juego).';
// Un par [lon, lat] por línea sería ilegible: los pares van en línea.
const text = JSON.stringify(atlas, null, 1).replace(/\[\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]/g, '[$1,$2]');
fs.writeFileSync(ATLAS, `${text}\n`);
