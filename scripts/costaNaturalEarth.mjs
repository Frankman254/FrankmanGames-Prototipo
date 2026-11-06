// `node scripts/costaNaturalEarth.mjs <ne_50m_admin_0_countries.geojson> <salida.json>` (F10): extrae Panamá,
// Costa Rica y Colombia de Natural Earth 1:50m (dominio público, naturalearthdata.com), las recorta al
// atlas y las simplifica. La salida va a data/panama.json → coast. El GeoJSON no se guarda en el repo.
import fs from 'node:fs';
const [src, out] = process.argv.slice(2);
const ne = JSON.parse(fs.readFileSync(src, 'utf8'));
const B = { lonMin: -83.6, lonMax: -76.6, latMin: 7, latMax: 9.8 };
const TOL = 0.004;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

function clip(ring) {
  const edges = [
    (p) => p[0] >= B.lonMin, (p) => p[0] <= B.lonMax, (p) => p[1] >= B.latMin, (p) => p[1] <= B.latMax,
  ];
  const cut = [
    (a, b) => [B.lonMin, a[1] + ((b[1] - a[1]) * (B.lonMin - a[0])) / (b[0] - a[0])],
    (a, b) => [B.lonMax, a[1] + ((b[1] - a[1]) * (B.lonMax - a[0])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((b[0] - a[0]) * (B.latMin - a[1])) / (b[1] - a[1]), B.latMin],
    (a, b) => [a[0] + ((b[0] - a[0]) * (B.latMax - a[1])) / (b[1] - a[1]), B.latMax],
  ];
  let pts = ring;
  for (let k = 0; k < 4; k++) {
    const res = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = edges[k](a), ib = edges[k](b);
      if (ia) res.push(a);
      if (ia !== ib) res.push(cut[k](a, b));
    }
    pts = res;
    if (!pts.length) break;
  }
  return pts;
}

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bd = 0;
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / l;
      if (d > bd) { bd = d; best = i; }
    }
    if (bd > tol) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const area = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
const result = {};
for (const [code, id] of [['PAN', 'panama'], ['CRI', 'costa_rica'], ['COL', 'colombia']]) {
  const f = ne.features.find((x) => x.properties.ADM0_A3 === code);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  for (const poly of polys) {
    const outer = poly[0].slice(0, -1);
    const c = clip(outer);
    if (c.length < 3) continue;
    let s = dp([...c, c[0]], TOL).slice(0, -1).map(([x, y]) => [r4(x), r4(y)]);
    if (s.length < 3) s = c.map(([x, y]) => [r4(x), r4(y)]);
    if (area(s) < 0.00015) continue; // islotes de menos de ~1,5 km²: los pone el atlas a mano si hacen falta
    rings.push(s);
  }
  rings.sort((a, b) => area(b) - area(a));
  result[id] = rings;
  console.log(id, rings.length, 'anillos', rings.reduce((n, r) => n + r.length, 0), 'puntos');
}
fs.writeFileSync(out, JSON.stringify(result));
